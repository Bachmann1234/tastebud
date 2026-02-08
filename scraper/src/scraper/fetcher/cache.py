"""HTML caching for debugging and development."""

from pathlib import Path

from scraper.config import DETAILS_CACHE_DIR, LISTINGS_CACHE_DIR


class Cache:
    """Cache raw HTML responses to disk."""

    def __init__(
        self,
        listings_dir: Path = LISTINGS_CACHE_DIR,
        details_dir: Path = DETAILS_CACHE_DIR,
    ) -> None:
        self.listings_dir = listings_dir
        self.details_dir = details_dir

    def _ensure_dirs(self) -> None:
        """Create cache directories if they don't exist."""
        self.listings_dir.mkdir(parents=True, exist_ok=True)
        self.details_dir.mkdir(parents=True, exist_ok=True)

    def _listing_path(self, page: int) -> Path:
        """Get the cache file path for a listing page."""
        return self.listings_dir / f"page_{page}.html"

    def _detail_path(self, slug: str) -> Path:
        """Get the cache file path for a detail page."""
        safe_slug = slug.replace("/", "_")
        return self.details_dir / f"{safe_slug}.html"

    def has_listing(self, page: int) -> bool:
        """Check if a listing page is cached."""
        return self._listing_path(page).exists()

    def has_detail(self, slug: str) -> bool:
        """Check if a detail page is cached."""
        return self._detail_path(slug).exists()

    def get_listing(self, page: int) -> str | None:
        """Get a cached listing page, or None if not cached."""
        path = self._listing_path(page)
        if path.exists():
            return path.read_text(encoding="utf-8")
        return None

    def get_detail(self, slug: str) -> str | None:
        """Get a cached detail page, or None if not cached."""
        path = self._detail_path(slug)
        if path.exists():
            return path.read_text(encoding="utf-8")
        return None

    def save_listing(self, page: int, html: str) -> None:
        """Save a listing page to the cache."""
        self._ensure_dirs()
        self._listing_path(page).write_text(html, encoding="utf-8")

    def save_detail(self, slug: str, html: str) -> None:
        """Save a detail page to the cache."""
        self._ensure_dirs()
        self._detail_path(slug).write_text(html, encoding="utf-8")
