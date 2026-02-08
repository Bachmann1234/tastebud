"""Command-line interface for the scraper."""

import argparse
import sys

from scraper.config import BASE_URL, DEFAULT_DELAY, LISTING_PAGE_URL, LISTING_URL
from scraper.fetcher import Cache, RateLimitedClient
from scraper.models import Menu, Restaurant
from scraper.parser import DetailParser, ListingParser
from scraper.storage import JsonWriter


def log(message: str, verbose: bool = True) -> None:
    """Print a log message if verbose is enabled."""
    if verbose:
        print(message, file=sys.stderr)


def fetch_listings(
    client: RateLimitedClient,
    cache: Cache,
    parser: ListingParser,
    use_cache: bool,
    max_pages: int | None,
    verbose: bool,
) -> list[Restaurant]:
    """Fetch and parse all listing pages."""
    restaurants: list[Restaurant] = []
    seen_slugs: set[str] = set()

    log("Fetching first listing page...", verbose)

    if use_cache and cache.has_listing(1):
        html = cache.get_listing(1)
        log("  Using cached page 1", verbose)
    else:
        html = client.get(LISTING_URL)
        if use_cache:
            cache.save_listing(1, html)
        log("  Fetched page 1", verbose)

    if not html:
        return restaurants

    page_restaurants = parser.parse(html)
    for r in page_restaurants:
        if r.slug not in seen_slugs:
            restaurants.append(r)
            seen_slugs.add(r.slug)

    total_pages = parser.get_total_pages(html)
    log(f"Found {total_pages} total pages", verbose)

    if max_pages:
        total_pages = min(total_pages, max_pages)
        log(f"Limiting to {total_pages} pages", verbose)

    for page in range(2, total_pages + 1):
        log(f"Fetching page {page}/{total_pages}...", verbose)

        if use_cache and cache.has_listing(page):
            html = cache.get_listing(page)
            log(f"  Using cached page {page}", verbose)
        else:
            url = LISTING_PAGE_URL.format(page=page)
            html = client.get(url)
            if use_cache:
                cache.save_listing(page, html)
            log(f"  Fetched page {page}", verbose)

        if html:
            page_restaurants = parser.parse(html)
            for r in page_restaurants:
                if r.slug not in seen_slugs:
                    restaurants.append(r)
                    seen_slugs.add(r.slug)

    log(f"Found {len(restaurants)} unique restaurants", verbose)
    return restaurants


def fetch_details(
    client: RateLimitedClient,
    cache: Cache,
    parser: DetailParser,
    restaurants: list[Restaurant],
    use_cache: bool,
    verbose: bool,
) -> list[Restaurant]:
    """Fetch and parse detail pages for all restaurants."""
    total = len(restaurants)

    for i, restaurant in enumerate(restaurants, 1):
        if not restaurant.detail_url:
            continue

        log(f"Fetching details {i}/{total}: {restaurant.name}...", verbose)

        if use_cache and cache.has_detail(restaurant.slug):
            html = cache.get_detail(restaurant.slug)
            log(f"  Using cached detail for {restaurant.slug}", verbose)
        else:
            try:
                html = client.get(restaurant.detail_url)
                if use_cache:
                    cache.save_detail(restaurant.slug, html)
                log(f"  Fetched detail for {restaurant.slug}", verbose)
            except Exception as e:
                log(f"  Error fetching {restaurant.slug}: {e}", verbose)
                continue

        if html:
            parser.parse(html, restaurant)

            menu_urls = getattr(restaurant, "_menu_urls", {})
            if menu_urls:
                fetch_menus(client, parser, restaurant, menu_urls, verbose)

    return restaurants


def fetch_menus(
    client: RateLimitedClient,
    parser: DetailParser,
    restaurant: Restaurant,
    menu_urls: dict[str, str],
    verbose: bool,
) -> None:
    """Fetch menu data from AJAX endpoints."""
    menus = []

    for meal_type, url_path in menu_urls.items():
        if not url_path:
            continue

        full_url = f"{BASE_URL}{url_path}"
        try:
            menu_html = client.get(full_url)
            if menu_html:
                price = None
                if meal_type == "lunch":
                    price = restaurant.pricing.lunch
                elif meal_type == "dinner":
                    price = restaurant.pricing.dinner
                elif meal_type == "brunch":
                    price = restaurant.pricing.brunch

                meal_menu = parser.parse_menu_html(menu_html, meal_type, price)
                if meal_menu.courses:
                    menus.append(meal_menu)
                    log(f"    Fetched {meal_type} menu ({len(meal_menu.courses)} courses)", verbose)
        except Exception as e:
            log(f"    Error fetching {meal_type} menu: {e}", verbose)

    if menus:
        restaurant.menu = Menu(menus=menus)

    if hasattr(restaurant, "_menu_urls"):
        delattr(restaurant, "_menu_urls")


def main() -> int:
    """Main entry point."""
    arg_parser = argparse.ArgumentParser(
        description="Scrape Restaurant Week Boston restaurant data"
    )
    arg_parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="Print progress information",
    )
    arg_parser.add_argument(
        "--use-cache",
        action="store_true",
        help="Use cached HTML files if available",
    )
    arg_parser.add_argument(
        "--listings-only",
        action="store_true",
        help="Only fetch listings, skip detail pages",
    )
    arg_parser.add_argument(
        "--pages",
        type=int,
        default=None,
        help="Maximum number of listing pages to fetch",
    )
    arg_parser.add_argument(
        "--delay",
        type=float,
        default=DEFAULT_DELAY,
        help=f"Delay between requests in seconds (default: {DEFAULT_DELAY})",
    )
    arg_parser.add_argument(
        "-o",
        "--output",
        type=str,
        default=None,
        help="Output file path (default: data/restaurants.json)",
    )

    args = arg_parser.parse_args()

    cache = Cache()
    listing_parser = ListingParser()
    detail_parser = DetailParser()

    if args.output:
        from pathlib import Path

        writer = JsonWriter(Path(args.output))
    else:
        writer = JsonWriter()

    with RateLimitedClient(delay=args.delay) as client:
        restaurants = fetch_listings(
            client=client,
            cache=cache,
            parser=listing_parser,
            use_cache=args.use_cache,
            max_pages=args.pages,
            verbose=args.verbose,
        )

        if not args.listings_only:
            restaurants = fetch_details(
                client=client,
                cache=cache,
                parser=detail_parser,
                restaurants=restaurants,
                use_cache=args.use_cache,
                verbose=args.verbose,
            )

    output_path = writer.write(restaurants)
    log(f"Wrote {len(restaurants)} restaurants to {output_path}", args.verbose)

    print(output_path)

    return 0


if __name__ == "__main__":
    sys.exit(main())
