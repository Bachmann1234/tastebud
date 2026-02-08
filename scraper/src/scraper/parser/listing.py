"""Parser for restaurant listing pages."""

import re

from bs4 import BeautifulSoup, Tag

from scraper.config import BASE_URL
from scraper.models import Availability, Pricing, Restaurant


class ListingParser:
    """Parse restaurant listing pages."""

    def parse(self, html: str) -> list[Restaurant]:
        """Parse a listing page and return a list of partial Restaurant objects."""
        soup = BeautifulSoup(html, "lxml")
        restaurants: list[Restaurant] = []

        entries = soup.select("div.restaurantEntry")

        for entry in entries:
            restaurant = self._parse_entry(entry)
            if restaurant:
                restaurants.append(restaurant)

        return restaurants

    def _parse_entry(self, entry: Tag) -> Restaurant | None:
        """Parse a single restaurant entry."""
        entry_id = entry.get("id", "")
        if not isinstance(entry_id, str) or not entry_id.startswith("restaurantID-"):
            return None

        slug = entry_id.replace("restaurantID-", "")
        if not slug:
            return None

        name = self._extract_name(entry, slug)
        detail_url = f"{BASE_URL}/restaurant/{slug}/"

        return Restaurant(
            slug=slug,
            name=name,
            cuisine=self._extract_cuisine(entry),
            neighborhood=self._extract_neighborhood(entry),
            detail_url=detail_url,
            availability=self._extract_availability(entry),
            pricing=self._extract_pricing(entry),
            image_url=self._extract_image(entry),
            address=self._extract_address(entry),
            features=self._extract_features(entry),
        )

    def _extract_name(self, entry: Tag, slug: str) -> str:
        """Extract restaurant name from entry."""
        link = entry.select_one(f'a[href="/restaurant/{slug}"]')
        if link:
            text = link.get_text(strip=True)
            if text:
                return text

        h4 = entry.select_one("h4")
        if h4:
            link = h4.find("a")
            if link:
                text = link.get_text(strip=True)
                if text:
                    return text

        return slug.replace("-", " ").title()

    def _extract_cuisine(self, entry: Tag) -> str | None:
        """Extract cuisine type."""
        cuisines: list[str] = []

        for link in entry.select('a[href*="/?cuisine="]'):
            cuisine_span = link.select_one("span.restClass")
            if cuisine_span:
                text = cuisine_span.get_text(strip=True)
                if text and text not in [",", "|"]:
                    cuisines.append(text)

        return ", ".join(cuisines) if cuisines else None

    def _extract_neighborhood(self, entry: Tag) -> str | None:
        """Extract neighborhood."""
        for link in entry.select('a[href*="/?neighborhood="]'):
            span = link.select_one("span.restClass")
            if span:
                text = span.get_text(strip=True)
                if text and text not in [",", "|"]:
                    return text
        return None

    def _extract_address(self, entry: Tag) -> str | None:
        """Extract address from entry."""
        for link in entry.select('a[href*="/map/"]'):
            text = link.get_text(strip=True)
            if text and "MA" in text:
                return text
        return None

    def _extract_availability(self, entry: Tag) -> Availability:
        """Extract meal availability flags."""
        text = entry.get_text().lower()
        return Availability(
            lunch="lunch" in text,
            dinner="dinner" in text,
            brunch="brunch" in text,
        )

    def _extract_pricing(self, entry: Tag) -> Pricing:
        """Extract pricing information."""
        pricing = Pricing()
        text = entry.get_text()

        lunch_match = re.search(r"Lunch[:\s]*\$(\d+)", text, re.IGNORECASE)
        if lunch_match:
            pricing.lunch = int(lunch_match.group(1))

        dinner_match = re.search(r"Dinner[:\s]*\$(\d+)", text, re.IGNORECASE)
        if dinner_match:
            pricing.dinner = int(dinner_match.group(1))

        brunch_match = re.search(r"Brunch[:\s]*\$(\d+)", text, re.IGNORECASE)
        if brunch_match:
            pricing.brunch = int(brunch_match.group(1))

        return pricing

    def _extract_image(self, entry: Tag) -> str | None:
        """Extract restaurant image URL."""
        logo_div = entry.select_one("div.restaurantLogo")
        if logo_div:
            img = logo_div.find("img")
            if img:
                src = img.get("src")
                if isinstance(src, str) and src:
                    return src if src.startswith("http") else f"{BASE_URL}{src}"
        return None

    def _extract_features(self, entry: Tag) -> list[str]:
        """Extract feature flags (outdoor seating, etc.)."""
        features: list[str] = []

        for icon in entry.select("div.restaurantFeatureIcons img"):
            alt = icon.get("alt", "")
            title = icon.get("title", "")
            text = (alt or title).lower() if (alt or title) else ""
            if text:
                features.append(text)

        text = entry.get_text().lower()
        feature_keywords = ["outdoor", "patio", "delivery", "takeout", "to-go"]
        for keyword in feature_keywords:
            if keyword in text and keyword not in features:
                features.append(keyword)

        return features

    def get_total_pages(self, html: str) -> int:
        """Extract the total number of pages from a listing page."""
        soup = BeautifulSoup(html, "lxml")

        page_text = soup.get_text()
        match = re.search(r"page\s+\d+\s+of\s+(\d+)", page_text, re.IGNORECASE)
        if match:
            return int(match.group(1))

        pagination = soup.select("a[href*='page='], .paginationControls a")
        max_page = 1
        for link in pagination:
            href = link.get("href", "")
            if isinstance(href, str):
                page_match = re.search(r"page=(\d+)", href)
                if page_match:
                    page_num = int(page_match.group(1))
                    max_page = max(max_page, page_num)

        return max_page
