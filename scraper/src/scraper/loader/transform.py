"""Pure data transformation from scraped JSON to database rows."""

import json
from pathlib import Path
from typing import Any

from scraper.config import OUTPUT_FILE


def load_restaurants(input_file: Path | None = None) -> list[dict[str, Any]]:
    """Load restaurant JSON from disk."""
    path = input_file or OUTPUT_FILE
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def transform_restaurant(raw: dict[str, Any]) -> dict[str, Any]:
    """Transform a single restaurant dict into a database row."""
    cuisine_str = raw.get("cuisine")
    cuisine = [c.strip() for c in cuisine_str.split(",")] if cuisine_str else None

    pricing = raw.get("pricing") or {}
    lunch_price = pricing.get("lunch")
    dinner_price = pricing.get("dinner")
    brunch_price = pricing.get("brunch")

    menu_data = raw.get("menu")
    if menu_data and menu_data.get("menus"):
        menu = menu_data
    else:
        menu = None

    features = raw.get("features") or None

    return {
        "slug": raw["slug"],
        "name": raw["name"],
        "cuisine": cuisine,
        "neighborhood": raw.get("neighborhood"),
        "address": raw.get("address"),
        "phone": raw.get("phone"),
        "website": raw.get("website"),
        "detail_url": raw.get("detail_url"),
        "image_url": raw.get("image_url"),
        "lunch_price": lunch_price,
        "dinner_price": dinner_price,
        "brunch_price": brunch_price,
        "menu": menu,
        "features": features,
    }


def transform_all(restaurants: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Transform all restaurants into database rows."""
    return [transform_restaurant(r) for r in restaurants]
