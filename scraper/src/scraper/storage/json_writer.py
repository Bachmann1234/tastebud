"""JSON output writer."""

import json
from pathlib import Path

from scraper.config import OUTPUT_FILE
from scraper.models import Restaurant


class JsonWriter:
    """Write restaurant data to JSON file."""

    def __init__(self, output_path: Path = OUTPUT_FILE) -> None:
        self.output_path = output_path

    def write(self, restaurants: list[Restaurant]) -> Path:
        """Write restaurants to JSON file."""
        self.output_path.parent.mkdir(parents=True, exist_ok=True)

        data = [r.to_dict() for r in restaurants]

        with open(self.output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        return self.output_path
