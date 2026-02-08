"""Tests for detail page parser."""

from scraper.models import Restaurant
from scraper.parser import DetailParser


class TestDetailParser:
    def test_parse_address(self, sample_detail_html, sample_restaurant):
        parser = DetailParser()
        result = parser.parse(sample_detail_html, sample_restaurant)

        assert result.address is not None
        assert "900 Boylston Street" in result.address

    def test_parse_phone(self, sample_detail_html, sample_restaurant):
        parser = DetailParser()
        result = parser.parse(sample_detail_html, sample_restaurant)

        assert result.phone is not None
        assert "617-262-8900" in result.phone

    def test_parse_website(self, sample_detail_html, sample_restaurant):
        parser = DetailParser()
        result = parser.parse(sample_detail_html, sample_restaurant)

        assert result.website == "https://www.thecapitalgrille.com"

    def test_preserves_existing_data(self, sample_detail_html):
        restaurant = Restaurant(
            slug="test",
            name="Test",
            cuisine="Italian",
            neighborhood="North End",
        )
        parser = DetailParser()
        result = parser.parse(sample_detail_html, restaurant)

        assert result.cuisine == "Italian"
        assert result.neighborhood == "North End"

    def test_parse_menu_html(self):
        parser = DetailParser()
        menu_html = """
        <p><strong>SALADS</strong></p>
        <p>Caesar Salad<br />Romaine, Parmesan, Croutons</p>
        <p>House Salad<br />Mixed Greens, Tomato</p>
        <p><strong>MAINS</strong></p>
        <p>Grilled Steak<br />Sirloin with mashed potatoes</p>
        <p>Pan-Seared Salmon<br />With vegetables</p>
        <p><strong>DESSERTS</strong></p>
        <p>Cheesecake<br />With berries</p>
        """
        meal_menu = parser.parse_menu_html(menu_html, "dinner", 45)

        assert meal_menu.meal_type == "dinner"
        assert meal_menu.price == 45
        assert len(meal_menu.courses) == 3

        salads = next(c for c in meal_menu.courses if "Salad" in c.name)
        assert len(salads.options) == 2
        assert "Caesar Salad" in salads.options[0]

    def test_parse_menu_html_empty(self):
        parser = DetailParser()
        meal_menu = parser.parse_menu_html("<p>No menu available</p>", "lunch", 28)

        assert meal_menu.meal_type == "lunch"
        assert meal_menu.price == 28
        assert len(meal_menu.courses) == 0

    def test_extract_menu_urls(self):
        parser = DetailParser()
        html = """
        <script>
        var lunchMenuURL = "/fetch/test-restaurant/lunch/";
        var dinnerMenuURL = "/fetch/test-restaurant/dinner/";
        </script>
        """
        restaurant = Restaurant(slug="test-restaurant", name="Test")
        result = parser.parse(html, restaurant)

        assert hasattr(result, "_menu_urls")
        assert result._menu_urls["lunch"] == "/fetch/test-restaurant/lunch/"
        assert result._menu_urls["dinner"] == "/fetch/test-restaurant/dinner/"

    def test_extract_menu_urls_empty(self):
        parser = DetailParser()
        html = """
        <script>
        var lunchMenuURL = "";
        var dinnerMenuURL = "";
        </script>
        """
        restaurant = Restaurant(slug="test-restaurant", name="Test")
        result = parser.parse(html, restaurant)

        menu_urls = getattr(result, "_menu_urls", {})
        assert "lunch" not in menu_urls or not menu_urls["lunch"]

    def test_parse_dish_name_extracts_only_name(self):
        parser = DetailParser()
        menu_html = """
        <p><strong>APPETIZERS</strong></p>
        <p>Shrimp Cocktail<br />Served with cocktail sauce and lemon</p>
        """
        meal_menu = parser.parse_menu_html(menu_html, "dinner", 55)

        assert len(meal_menu.courses) == 1
        appetizers = meal_menu.courses[0]
        assert "Shrimp Cocktail" in appetizers.options[0]
        assert "cocktail sauce" not in appetizers.options[0]
