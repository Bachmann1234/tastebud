"""Parser for restaurant detail pages."""

import re

from bs4 import BeautifulSoup, NavigableString, Tag

from scraper.config import BASE_URL
from scraper.models import Coordinates, Course, MealMenu, Restaurant


class DetailParser:
    """Parse restaurant detail pages."""

    def parse(self, html: str, restaurant: Restaurant) -> Restaurant:
        """Parse a detail page and enrich the Restaurant object."""
        soup = BeautifulSoup(html, "lxml")

        if not restaurant.address:
            restaurant.address = self._extract_address(soup)

        if not restaurant.phone:
            restaurant.phone = self._extract_phone(soup)

        if not restaurant.website:
            restaurant.website = self._extract_website(soup)

        if not restaurant.image_url:
            restaurant.image_url = self._extract_image(soup)

        coordinates = self._extract_coordinates(soup)
        if coordinates:
            restaurant.coordinates = coordinates

        menu_urls = self._extract_menu_urls(soup, restaurant.slug)
        if menu_urls:
            restaurant._menu_urls = menu_urls

        return restaurant

    def parse_menu_html(self, html: str, meal_type: str, price: int | None = None) -> MealMenu:
        """Parse a menu HTML fragment and return a MealMenu object."""
        soup = BeautifulSoup(html, "lxml")
        courses = self._extract_courses_from_menu(soup)
        return MealMenu(meal_type=meal_type, price=price, courses=courses)

    def _extract_menu_urls(self, soup: BeautifulSoup, slug: str) -> dict[str, str]:
        """Extract menu AJAX URLs from the page."""
        menu_urls: dict[str, str] = {}

        scripts = soup.find_all("script")
        for script in scripts:
            if script.string:
                lunch_match = re.search(r'var\s+lunchMenuURL\s*=\s*"([^"]+)"', script.string)
                if lunch_match and lunch_match.group(1):
                    menu_urls["lunch"] = lunch_match.group(1)

                dinner_match = re.search(r'var\s+dinnerMenuURL\s*=\s*"([^"]+)"', script.string)
                if dinner_match and dinner_match.group(1):
                    menu_urls["dinner"] = dinner_match.group(1)

                brunch_match = re.search(r'var\s+brunchMenuURL\s*=\s*"([^"]+)"', script.string)
                if brunch_match and brunch_match.group(1):
                    menu_urls["brunch"] = brunch_match.group(1)

        return menu_urls

    def _extract_courses_from_menu(self, soup: BeautifulSoup) -> list[Course]:
        """Extract courses from a menu HTML fragment."""
        courses: list[Course] = []
        current_course: Course | None = None

        for elem in soup.find_all("p"):
            if not elem.get_text(strip=True):
                continue

            strong = elem.find("strong")
            if strong:
                heading = strong.get_text(strip=True).upper()
                heading = heading.replace("\xa0", " ").strip()
                if heading and heading.isupper() and len(heading) > 2:
                    if current_course and current_course.options:
                        courses.append(current_course)
                    current_course = Course(name=heading.title(), options=[])
                    continue

            if current_course is None:
                continue

            dish_name = self._extract_dish_name(elem)
            if dish_name and len(dish_name) > 2:
                current_course.options.append(dish_name)

        if current_course and current_course.options:
            courses.append(current_course)

        return courses

    def _extract_dish_name(self, elem: Tag) -> str | None:
        """Extract just the dish name from a menu item element."""
        parts = []

        for child in elem.children:
            if isinstance(child, Tag):
                if child.name == "br":
                    break
                if child.name == "strong":
                    continue
                text = child.get_text(strip=True)
                if text:
                    parts.append(text)
            elif isinstance(child, NavigableString):
                text = str(child).strip()
                if text:
                    parts.append(text)

        dish_name = " ".join(parts).strip()

        dish_name = dish_name.replace("\xa0", " ").strip()

        if dish_name.isupper():
            return None

        return dish_name if dish_name else None

    def _extract_address(self, soup: BeautifulSoup) -> str | None:
        """Extract restaurant address."""
        for elem in soup.select("p.restAddress"):
            text = elem.get_text(strip=True)
            if text and "MA" in text:
                clean = re.sub(r"\s+", " ", text).strip()
                return clean

        for selector in [
            "address",
            ".address",
            "[class*='address']",
            "[itemprop='address']",
        ]:
            elem = soup.select_one(selector)
            if elem:
                text = elem.get_text(strip=True)
                if text:
                    return text

        return None

    def _extract_phone(self, soup: BeautifulSoup) -> str | None:
        """Extract phone number."""
        for selector in [
            "a[href^='tel:']",
            ".phone",
            "[class*='phone']",
            "[itemprop='telephone']",
        ]:
            elem = soup.select_one(selector)
            if elem:
                href = elem.get("href", "")
                if isinstance(href, str) and href.startswith("tel:"):
                    return href.replace("tel:", "").strip()
                text = elem.get_text(strip=True)
                if text:
                    return text

        text = soup.get_text()
        match = re.search(r"\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}", text)
        if match:
            return match.group(0)

        return None

    def _extract_website(self, soup: BeautifulSoup) -> str | None:
        """Extract restaurant website URL."""
        for link in soup.select('a.restaurantWebsiteLink, a[class*="website"]'):
            href = link.get("href")
            if isinstance(href, str) and href.startswith("http"):
                return href

        for link in soup.select("a[href^='http']"):
            href = link.get("href", "")
            if isinstance(href, str) and "restaurantweek" not in href.lower():
                if "bostonchefs.com" not in href.lower():
                    text = link.get_text(strip=True).lower()
                    if "visit" in text or "website" in text or "official" in text:
                        return href

        return None

    def _extract_image(self, soup: BeautifulSoup) -> str | None:
        """Extract main restaurant image."""
        for selector in [
            ".restaurant-image img",
            ".hero-image img",
            "img.restaurant-photo",
            "#restaurantDetailsCol img",
        ]:
            img = soup.select_one(selector)
            if img:
                src = img.get("src") or img.get("data-src")
                if isinstance(src, str) and src:
                    return src if src.startswith("http") else f"{BASE_URL}{src}"

        return None

    def _extract_coordinates(self, soup: BeautifulSoup) -> Coordinates | None:
        """Extract geographic coordinates if available."""
        for elem in soup.select("[data-lat][data-lng], [data-latitude][data-longitude]"):
            lat = elem.get("data-lat") or elem.get("data-latitude")
            lng = elem.get("data-lng") or elem.get("data-longitude")
            if lat and lng:
                try:
                    return Coordinates(float(lat), float(lng))
                except ValueError:
                    pass

        scripts = soup.find_all("script")
        for script in scripts:
            if script.string:
                lat_match = re.search(
                    r"lat(?:itude)?[\"']?\s*[:=]\s*([+-]?\d+\.?\d*)", script.string
                )
                lng_match = re.search(
                    r"lng|lon(?:gitude)?[\"']?\s*[:=]\s*([+-]?\d+\.?\d*)", script.string
                )
                if lat_match and lng_match:
                    try:
                        return Coordinates(
                            float(lat_match.group(1)), float(lng_match.group(1))
                        )
                    except ValueError:
                        pass

        return None
