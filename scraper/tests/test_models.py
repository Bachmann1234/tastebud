"""Tests for data models."""

from scraper.models import (
    Availability,
    Coordinates,
    Course,
    MealMenu,
    Menu,
    Pricing,
    Restaurant,
)


class TestCoordinates:
    def test_to_dict(self):
        coords = Coordinates(latitude=42.3601, longitude=-71.0589)
        assert coords.to_dict() == {"latitude": 42.3601, "longitude": -71.0589}


class TestAvailability:
    def test_defaults(self):
        avail = Availability()
        assert avail.lunch is False
        assert avail.dinner is False
        assert avail.brunch is False

    def test_to_dict(self):
        avail = Availability(lunch=True, dinner=True, brunch=False)
        assert avail.to_dict() == {"lunch": True, "dinner": True, "brunch": False}


class TestPricing:
    def test_defaults(self):
        pricing = Pricing()
        assert pricing.lunch is None
        assert pricing.dinner is None
        assert pricing.brunch is None

    def test_to_dict(self):
        pricing = Pricing(lunch=28, dinner=45)
        assert pricing.to_dict() == {"lunch": 28, "dinner": 45, "brunch": None}


class TestCourse:
    def test_to_dict(self):
        course = Course(
            name="First Course",
            options=["Soup", "Salad", "Appetizer"],
        )
        result = course.to_dict()
        assert result["name"] == "First Course"
        assert result["options"] == ["Soup", "Salad", "Appetizer"]


class TestMealMenu:
    def test_to_dict(self):
        menu = MealMenu(
            meal_type="dinner",
            price=45,
            courses=[
                Course(name="First Course", options=["Soup"]),
                Course(name="Entrée", options=["Steak"]),
            ],
        )
        result = menu.to_dict()
        assert result["meal_type"] == "dinner"
        assert result["price"] == 45
        assert len(result["courses"]) == 2


class TestMenu:
    def test_to_dict(self):
        menu = Menu(
            menus=[
                MealMenu(meal_type="lunch", price=28),
                MealMenu(meal_type="dinner", price=45),
            ]
        )
        result = menu.to_dict()
        assert len(result["menus"]) == 2
        assert result["menus"][0]["meal_type"] == "lunch"


class TestRestaurant:
    def test_minimal_restaurant(self):
        r = Restaurant(slug="test-place", name="Test Place")
        result = r.to_dict()
        assert result["slug"] == "test-place"
        assert result["name"] == "Test Place"
        assert result["cuisine"] is None
        assert "menu" not in result
        assert "coordinates" not in result

    def test_full_restaurant(self):
        r = Restaurant(
            slug="capital-grille",
            name="The Capital Grille",
            cuisine="Steakhouse",
            neighborhood="Back Bay",
            address="900 Boylston Street",
            phone="617-262-8900",
            website="https://www.thecapitalgrille.com",
            image_url="https://example.com/image.jpg",
            detail_url="https://restaurantweekboston.com/restaurants/capital-grille",
            availability=Availability(lunch=True, dinner=True),
            pricing=Pricing(lunch=28, dinner=45),
            menu=Menu(menus=[MealMenu(meal_type="dinner", price=45)]),
            coordinates=Coordinates(42.3601, -71.0589),
            features=["outdoor", "reservations"],
        )
        result = r.to_dict()

        assert result["slug"] == "capital-grille"
        assert result["name"] == "The Capital Grille"
        assert result["cuisine"] == "Steakhouse"
        assert result["neighborhood"] == "Back Bay"
        assert result["address"] == "900 Boylston Street"
        assert result["phone"] == "617-262-8900"
        assert result["website"] == "https://www.thecapitalgrille.com"
        assert result["availability"]["lunch"] is True
        assert result["pricing"]["dinner"] == 45
        assert "menu" in result
        assert "coordinates" in result
        assert result["features"] == ["outdoor", "reservations"]
