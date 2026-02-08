"""Restaurant data models."""

from dataclasses import dataclass, field
from typing import Any


@dataclass
class Coordinates:
    """Geographic coordinates."""

    latitude: float
    longitude: float

    def to_dict(self) -> dict[str, float]:
        return {"latitude": self.latitude, "longitude": self.longitude}


@dataclass
class Availability:
    """Meal availability flags."""

    lunch: bool = False
    dinner: bool = False
    brunch: bool = False

    def to_dict(self) -> dict[str, bool]:
        return {"lunch": self.lunch, "dinner": self.dinner, "brunch": self.brunch}


@dataclass
class Pricing:
    """Price tier information."""

    lunch: int | None = None  # Price in dollars
    dinner: int | None = None
    brunch: int | None = None

    def to_dict(self) -> dict[str, int | None]:
        return {"lunch": self.lunch, "dinner": self.dinner, "brunch": self.brunch}


@dataclass
class Course:
    """A single course in a menu."""

    name: str  # e.g., "First Course", "Entrée", "Dessert"
    options: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {"name": self.name, "options": self.options}


@dataclass
class MealMenu:
    """Menu for a specific meal (lunch, dinner, brunch)."""

    meal_type: str  # "lunch", "dinner", "brunch"
    price: int | None = None
    courses: list[Course] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "meal_type": self.meal_type,
            "price": self.price,
            "courses": [c.to_dict() for c in self.courses],
        }


@dataclass
class Menu:
    """Complete menu with all meal types."""

    menus: list[MealMenu] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {"menus": [m.to_dict() for m in self.menus]}


@dataclass
class Restaurant:
    """Restaurant data model."""

    slug: str
    name: str
    cuisine: str | None = None
    neighborhood: str | None = None
    address: str | None = None
    phone: str | None = None
    website: str | None = None
    image_url: str | None = None
    detail_url: str | None = None
    availability: Availability = field(default_factory=Availability)
    pricing: Pricing = field(default_factory=Pricing)
    menu: Menu | None = None
    coordinates: Coordinates | None = None
    features: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        result: dict[str, Any] = {
            "slug": self.slug,
            "name": self.name,
            "cuisine": self.cuisine,
            "neighborhood": self.neighborhood,
            "address": self.address,
            "phone": self.phone,
            "website": self.website,
            "image_url": self.image_url,
            "detail_url": self.detail_url,
            "availability": self.availability.to_dict(),
            "pricing": self.pricing.to_dict(),
            "features": self.features,
        }
        if self.menu:
            result["menu"] = self.menu.to_dict()
        if self.coordinates:
            result["coordinates"] = self.coordinates.to_dict()
        return result
