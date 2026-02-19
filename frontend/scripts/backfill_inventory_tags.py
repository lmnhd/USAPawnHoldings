#!/usr/bin/env python3
"""
Backfill inventory tags through the existing frontend inventory API.

Usage:
  python scripts/backfill_inventory_tags.py
  python scripts/backfill_inventory_tags.py --dry-run
  python scripts/backfill_inventory_tags.py --only-missing
  python scripts/backfill_inventory_tags.py --base-url http://localhost:3000 --limit 100
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from typing import Any, Dict, List
from urllib import error, parse, request

STOP_WORDS = {
    "the",
    "and",
    "for",
    "with",
    "this",
    "that",
    "item",
    "any",
    "have",
    "show",
    "looking",
    "look",
    "please",
    "sale",
    "sell",
    "new",
    "used",
}

SYNONYMS = {
    "gun": "firearms",
    "guns": "firearms",
    "firearm": "firearms",
    "pistol": "handgun",
    "revolver": "handgun",
    "rifle": "long-gun",
    "shotgun": "long-gun",
    "jewelery": "jewelry",
    "jewellery": "jewelry",
    "necklaces": "necklace",
    "chains": "chain",
    "rings": "ring",
    "sterling": "silver",
    "goldtone": "gold-tone",
}


def _api_json(method: str, url: str, payload: Dict[str, Any] | None = None) -> Dict[str, Any]:
    data = None
    headers = {"Content-Type": "application/json"}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")

    req = request.Request(url=url, data=data, method=method, headers=headers)
    try:
        with request.urlopen(req, timeout=30) as response:
            body = response.read().decode("utf-8")
            return json.loads(body) if body else {}
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8")
        raise RuntimeError(f"{method} {url} failed: {exc.code} {detail}") from exc


def _sanitize(text: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9\s-]", " ", text.lower())).strip()


def _canonical(tag: str) -> str | None:
    cleaned = _sanitize(tag)
    if not cleaned or len(cleaned) < 2 or len(cleaned) > 30:
        return None
    if cleaned in STOP_WORDS:
        return None
    return SYNONYMS.get(cleaned, cleaned)


def infer_tags(item: Dict[str, Any]) -> List[str]:
    category = str(item.get("category") or "").strip().lower()
    brand = str(item.get("brand") or "").strip().lower()
    description = str(item.get("description") or "")
    condition = str(item.get("condition") or "").strip().lower()
    existing = item.get("tags") if isinstance(item.get("tags"), list) else []

    candidates: List[str] = []

    if category:
        candidates.append(category)

    if brand and brand not in {"unknown", "unbranded", "none", "n/a"}:
        candidates.append(brand)

    if condition:
        if condition == "excellent":
            candidates.append("excellent-condition")
        elif condition == "good":
            candidates.append("good-condition")
        elif condition == "fair":
            candidates.append("fair-condition")
        elif condition == "poor":
            candidates.append("poor-condition")

    text_blob = f"{category} {brand} {description}".lower()

    pattern_tags = [
        (r"\b(gold|10k|14k|18k|24k|karat)\b", "gold"),
        (r"\b(silver|sterling)\b", "silver"),
        (r"\b(platinum)\b", "platinum"),
        (r"\b(necklace|chain|pendant)\b", "necklace"),
        (r"\b(ring|band)\b", "ring"),
        (r"\b(bracelet)\b", "bracelet"),
        (r"\b(watch|chronograph)\b", "watch"),
        (r"\b(vintage|retro|classic)\b", "vintage"),
        (r"\b(cordless|wireless)\b", "wireless"),
        (r"\b(acoustic)\b", "acoustic"),
        (r"\b(electric)\b", "electric"),
        (r"\b(glock|taurus|ruger|colt|9mm|pistol|handgun|firearm)\b", "handgun"),
        (r"\b(rifle|shotgun)\b", "long-gun"),
        (r"\b(phone|iphone|android|laptop|tablet|camera|console)\b", "electronics"),
        (r"\b(drill|saw|tool|wrench)\b", "tools"),
        (r"\b(guitar|piano|drum|amplifier|amp)\b", "musical"),
    ]

    for pattern, tag in pattern_tags:
        if re.search(pattern, text_blob):
            candidates.append(tag)

    candidates.extend([str(t) for t in existing])

    deduped: List[str] = []
    for candidate in candidates:
        canonical = _canonical(candidate)
        if not canonical:
            continue
        if canonical not in deduped:
            deduped.append(canonical)
        if len(deduped) >= 12:
            break

    return deduped


def main() -> int:
    parser = argparse.ArgumentParser(description="Backfill inventory tags via /api/inventory")
    parser.add_argument("--base-url", default="http://localhost:3000", help="Base URL for frontend app")
    parser.add_argument("--limit", type=int, default=200, help="Max inventory items to scan")
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without writing")
    parser.add_argument("--only-missing", action="store_true", help="Only update items with no existing tags")
    args = parser.parse_args()

    query = parse.urlencode({"limit": str(max(1, args.limit))})
    inventory_url = f"{args.base_url.rstrip('/')}/api/inventory?{query}"

    try:
        response = _api_json("GET", inventory_url)
    except Exception as exc:
        print(f"Failed to load inventory: {exc}")
        return 1

    items = response.get("items") if isinstance(response, dict) else None
    if not isinstance(items, list):
        print("Inventory API returned unexpected payload.")
        return 1

    print(f"Loaded {len(items)} inventory items")

    updated = 0
    skipped = 0

    for item in items:
        if not isinstance(item, dict):
            skipped += 1
            continue

        item_id = str(item.get("item_id") or "")
        if not item_id:
            skipped += 1
            continue

        existing_tags = [str(t) for t in item.get("tags", [])] if isinstance(item.get("tags"), list) else []
        if args.only_missing and existing_tags:
            skipped += 1
            continue

        new_tags = infer_tags(item)
        if new_tags == existing_tags or not new_tags:
            skipped += 1
            continue

        print(f"\n{item_id}")
        print(f"  old: {existing_tags}")
        print(f"  new: {new_tags}")

        if args.dry_run:
            updated += 1
            continue

        patch_url = f"{args.base_url.rstrip('/')}/api/inventory"
        payload = {"item_id": item_id, "tags": new_tags}
        try:
            _api_json("PATCH", patch_url, payload)
            updated += 1
        except Exception as exc:
            print(f"  update failed: {exc}")

    mode = "DRY RUN" if args.dry_run else "APPLY"
    print(f"\n[{mode}] Updated: {updated} | Skipped: {skipped}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
