"""Tests for scraper.loader.transform."""

from scraper.loader.transform import transform_restaurant


def _make_restaurant(**overrides):
    """Create a minimal restaurant dict with sensible defaults."""
    base = {
        "slug": "test-restaurant",
        "name": "Test Restaurant",
        "cuisine": "American",
        "neighborhood": "Back Bay",
        "address": "123 Test St, Boston, MA 02101",
        "phone": "617-555-1234",
        "website": "https://example.com",
        "detail_url": "https://www.restaurantweekboston.com/restaurant/test-restaurant/",
        "image_url": "https://example.com/img.jpg",
        "availability": {"lunch": True, "dinner": True, "brunch": False},
        "pricing": {"lunch": 32, "dinner": 46, "brunch": None},
        "features": ["outdoor seating", "vegetarian friendly"],
        "menu": {"menus": [{"meal_type": "lunch", "price": 32, "courses": []}]},
    }
    base.update(overrides)
    return base


class TestCuisineTransform:
    def test_single_cuisine(self):
        row = transform_restaurant(_make_restaurant(cuisine="American"))
        assert row["cuisine"] == ["American"]

    def test_multiple_cuisines(self):
        row = transform_restaurant(_make_restaurant(cuisine="American, Outdoor Dining"))
        assert row["cuisine"] == ["American", "Outdoor Dining"]

    def test_many_cuisines(self):
        row = transform_restaurant(_make_restaurant(cuisine="Italian, Pizza, Pasta, Wine Bar"))
        assert row["cuisine"] == ["Italian", "Pizza", "Pasta", "Wine Bar"]

    def test_none_cuisine(self):
        row = transform_restaurant(_make_restaurant(cuisine=None))
        assert row["cuisine"] is None

    def test_empty_string_cuisine(self):
        row = transform_restaurant(_make_restaurant(cuisine=""))
        assert row["cuisine"] is None


class TestPricingTransform:
    def test_all_prices_set(self):
        row = transform_restaurant(
            _make_restaurant(pricing={"lunch": 32, "dinner": 46, "brunch": 28})
        )
        assert row["lunch_price"] == 32
        assert row["dinner_price"] == 46
        assert row["brunch_price"] == 28

    def test_null_prices(self):
        row = transform_restaurant(
            _make_restaurant(pricing={"lunch": None, "dinner": 55, "brunch": None})
        )
        assert row["lunch_price"] is None
        assert row["dinner_price"] == 55
        assert row["brunch_price"] is None

    def test_missing_pricing(self):
        raw = _make_restaurant()
        del raw["pricing"]
        row = transform_restaurant(raw)
        assert row["lunch_price"] is None
        assert row["dinner_price"] is None
        assert row["brunch_price"] is None

    def test_empty_pricing(self):
        row = transform_restaurant(_make_restaurant(pricing={}))
        assert row["lunch_price"] is None
        assert row["dinner_price"] is None
        assert row["brunch_price"] is None


class TestMenuTransform:
    def test_menu_with_data(self):
        menu = {"menus": [{"meal_type": "lunch", "price": 32, "courses": []}]}
        row = transform_restaurant(_make_restaurant(menu=menu))
        assert row["menu"] == menu

    def test_empty_menus_list(self):
        row = transform_restaurant(_make_restaurant(menu={"menus": []}))
        assert row["menu"] is None

    def test_none_menu(self):
        row = transform_restaurant(_make_restaurant(menu=None))
        assert row["menu"] is None

    def test_missing_menu(self):
        raw = _make_restaurant()
        del raw["menu"]
        row = transform_restaurant(raw)
        assert row["menu"] is None


class TestFeaturesTransform:
    def test_features_list(self):
        row = transform_restaurant(
            _make_restaurant(features=["outdoor seating", "vegetarian friendly"])
        )
        assert row["features"] == ["outdoor seating", "vegetarian friendly"]

    def test_empty_features(self):
        row = transform_restaurant(_make_restaurant(features=[]))
        assert row["features"] is None

    def test_none_features(self):
        row = transform_restaurant(_make_restaurant(features=None))
        assert row["features"] is None


class TestExcludedFields:
    def test_availability_excluded(self):
        row = transform_restaurant(_make_restaurant())
        assert "availability" not in row

    def test_coordinates_excluded(self):
        raw = _make_restaurant()
        raw["coordinates"] = {"latitude": 42.35, "longitude": -71.06}
        row = transform_restaurant(raw)
        assert "coordinates" not in row


class TestPassthroughFields:
    def test_basic_fields(self):
        row = transform_restaurant(_make_restaurant())
        assert row["slug"] == "test-restaurant"
        assert row["name"] == "Test Restaurant"
        assert row["neighborhood"] == "Back Bay"
        assert row["address"] == "123 Test St, Boston, MA 02101"
        assert row["phone"] == "617-555-1234"
        assert row["website"] == "https://example.com"
        assert row["detail_url"] == (
            "https://www.restaurantweekboston.com/restaurant/test-restaurant/"
        )
        assert row["image_url"] == "https://example.com/img.jpg"
