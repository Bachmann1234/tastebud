"""CLI entry point for the Supabase loader."""

import argparse
import json
import sys
from pathlib import Path

from scraper.loader.transform import load_restaurants, transform_all


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Load restaurant data into Supabase",
    )
    parser.add_argument("-v", "--verbose", action="store_true", help="Print progress output")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Transform and print sample rows without writing to DB",
    )
    parser.add_argument(
        "-i",
        "--input",
        type=Path,
        default=None,
        help="Input JSON file (default: data/restaurants.json)",
    )
    args = parser.parse_args()

    if args.verbose:
        print("Loading restaurant data...")

    restaurants = load_restaurants(args.input)
    rows = transform_all(restaurants)

    if args.verbose:
        print(f"Transformed {len(rows)} restaurants")

    if args.dry_run:
        print(f"\n--- Dry run: showing first 3 of {len(rows)} rows ---\n")
        for row in rows[:3]:
            print(json.dumps(row, indent=2))
        print(f"\n--- {len(rows)} total rows would be upserted ---")
        sys.exit(0)

    from scraper.loader.supabase_loader import get_supabase_client, upsert_restaurants

    if args.verbose:
        print("Connecting to Supabase...")

    client = get_supabase_client()
    count = upsert_restaurants(client, rows, verbose=args.verbose)

    if args.verbose:
        print(f"Done! Upserted {count} restaurants.")
