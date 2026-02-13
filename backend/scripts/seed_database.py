import hashlib
import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

import boto3
from botocore.exceptions import BotoCoreError, ClientError, NoCredentialsError, PartialCredentialsError


PROJECT_ROOT = Path(__file__).resolve().parents[2]
SCRAPED_DATA_PATH = PROJECT_ROOT / "backend" / "data" / "scraped_data.json"


def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def generate_daily_qr_token(secret: str) -> str:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return hashlib.sha256(f"{secret}:{today}".encode("utf-8")).hexdigest()[:16]


def load_scraped_data() -> dict:
    if not SCRAPED_DATA_PATH.exists():
        raise FileNotFoundError(f"Missing scraped data file: {SCRAPED_DATA_PATH}")
    return json.loads(SCRAPED_DATA_PATH.read_text(encoding="utf-8"))


def build_inventory_items(data: dict) -> list[dict]:
    items = []
    for row in data.get("inventory", []):
        item_id = str(uuid.uuid4())
        brand = ", ".join(row.get("brands", [])) if isinstance(row.get("brands"), list) else ""
        items.append(
            {
                "item_id": {"S": item_id},
                "category": {"S": row.get("category", "Unknown")},
                "brand": {"S": brand},
                "description": {"S": row.get("description", "")},
                "value_range": {"S": row.get("estimated_value_range", "")},
                "savings_pct": {"S": row.get("savings_percentage", "")},
                "image_url": {"S": row.get("image", "")},
                "date_added": {"S": iso_now()},
            }
        )
    return items


def build_config_items(data: dict) -> list[dict]:
    token_secret = os.getenv("DAILY_QR_TOKEN_SECRET", "vault-dev-secret")
    daily_token = generate_daily_qr_token(token_secret)
    staff_pins = [f"{n:04d}" for n in range(10000)]

    return [
        {
            "config_key": {"S": "store_hours"},
            "value": {"S": json.dumps(data.get("store_info", {}).get("hours", {}))},
            "updated_at": {"S": iso_now()},
        },
        {
            "config_key": {"S": "contact_info"},
            "value": {"S": json.dumps(data.get("store_info", {}))},
            "updated_at": {"S": iso_now()},
        },
        {
            "config_key": {"S": "specials"},
            "value": {"S": json.dumps(data.get("specials", []))},
            "updated_at": {"S": iso_now()},
        },
        {
            "config_key": {"S": "staff_pins"},
            "value": {"S": json.dumps(staff_pins)},
            "updated_at": {"S": iso_now()},
        },
        {
            "config_key": {"S": "daily_qr_tokens"},
            "value": {"S": json.dumps({"today": daily_token})},
            "updated_at": {"S": iso_now()},
        },
    ]


def seed() -> None:
    data = load_scraped_data()
    inventory_items = build_inventory_items(data)
    config_items = build_config_items(data)

    region = os.getenv("AWS_REGION", "us-east-1")
    dry_run = os.getenv("DYNAMODB_DRY_RUN", "false").lower() == "true"

    if dry_run:
        print("Dry-run mode enabled. No writes performed.")
        print(f"Inventory items prepared: {len(inventory_items)}")
        print(f"Config items prepared: {len(config_items)}")
        return

    try:
        dynamodb = boto3.client("dynamodb", region_name=region)

        for item in inventory_items:
            dynamodb.put_item(TableName="USA_Pawn_Inventory", Item=item)

        for item in config_items:
            dynamodb.put_item(TableName="USA_Pawn_Store_Config", Item=item)

        print("Seed complete.")
        print(f"Inserted inventory items: {len(inventory_items)}")
        print(f"Inserted config items: {len(config_items)}")

    except (NoCredentialsError, PartialCredentialsError):
        print("AWS credentials unavailable. Running dry-run summary.")
        print(f"Inventory items prepared: {len(inventory_items)}")
        print(f"Config items prepared: {len(config_items)}")
    except (ClientError, BotoCoreError) as error:
        print(f"DynamoDB write error: {error}")
        print("Dry-run summary:")
        print(f"Inventory items prepared: {len(inventory_items)}")
        print(f"Config items prepared: {len(config_items)}")


if __name__ == "__main__":
    seed()
