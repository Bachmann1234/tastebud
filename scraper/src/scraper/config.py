"""Configuration constants and settings."""

from pathlib import Path

# URLs
BASE_URL = "https://www.restaurantweekboston.com"
LISTING_URL = f"{BASE_URL}/?neighborhood=all&meal=all&cuisine=all"
LISTING_PAGE_URL = f"{BASE_URL}/?neighborhood=all&meal=all&cuisine=all&page={{page}}"
DETAIL_URL_PATTERN = f"{BASE_URL}/restaurant/{{slug}}/"

# Paths
PROJECT_ROOT = Path(__file__).parent.parent.parent.parent
DATA_DIR = PROJECT_ROOT / "data"
CACHE_DIR = DATA_DIR / "raw"
LISTINGS_CACHE_DIR = CACHE_DIR / "listings"
DETAILS_CACHE_DIR = CACHE_DIR / "details"
OUTPUT_FILE = DATA_DIR / "restaurants.json"

# HTTP settings
DEFAULT_DELAY = 1.5  # seconds between requests
REQUEST_TIMEOUT = 30  # seconds
MAX_RETRIES = 3
BACKOFF_FACTOR = 1.0  # exponential backoff multiplier

# User agent
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
