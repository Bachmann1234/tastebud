"""Supabase client and batched upsert logic."""

import os
from typing import Any

from dotenv import load_dotenv
from supabase import Client, create_client

from scraper.config import PROJECT_ROOT

BATCH_SIZE = 50


def get_supabase_client() -> Client:
    """Create a Supabase client using service role key from .env.local."""
    load_dotenv(PROJECT_ROOT / ".env.local")

    required_vars = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
    missing = [name for name in required_vars if not os.getenv(name)]
    if missing:
        missing_list = ", ".join(missing)
        raise RuntimeError(
            f"Missing required environment variable(s): {missing_list}. "
            "Set them in .env.local at the project root."
        )

    url = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)


def upsert_restaurants(
    client: Client,
    rows: list[dict[str, Any]],
    *,
    verbose: bool = False,
) -> int:
    """Upsert restaurant rows in batches. Returns total upserted count."""
    total = 0
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i : i + BATCH_SIZE]
        client.table("restaurants").upsert(batch, on_conflict="slug").execute()
        total += len(batch)
        if verbose:
            print(f"  Upserted {total}/{len(rows)} restaurants...")
    return total
