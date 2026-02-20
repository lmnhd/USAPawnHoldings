import hashlib
import json
import os
import uuid
from datetime import datetime, timedelta, timezone
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


def build_seed_lead_items() -> list[dict]:
    now = datetime.now(timezone.utc)
    base_rows = [
        {
            "lead_id": "seed-lead-004",
            "customer_name": "Marcus Taylor",
            "phone": "+19045551014",
            "item_description": "14k gold bracelet appraisal",
            "estimated_value": "425",
            "source": "web",
            "source_channel": "web",
            "contact_method": "web",
            "type": "appraisal",
            "status": "new",
            "priority": "normal",
            "notes": "Walk-in follow-up requested",
        },
        {
            "lead_id": "seed-lead-005",
            "customer_name": "Ariana Daniels",
            "phone": "+19045551015",
            "item_description": "Xbox Series X with controller",
            "estimated_value": "260",
            "source": "sms",
            "source_channel": "sms",
            "contact_method": "sms",
            "type": "purchase_offer",
            "status": "contacted",
            "priority": "high",
            "notes": "Asked for same-day quote",
        },
        {
            "lead_id": "seed-lead-006",
            "customer_name": "DeShawn Harper",
            "phone": "+19045551016",
            "item_description": "Stihl chainsaw (used)",
            "estimated_value": "180",
            "source": "voice",
            "source_channel": "voice",
            "contact_method": "phone",
            "type": "appointment",
            "status": "scheduled",
            "priority": "normal",
            "appointment_time": "2026-02-20T15:30:00-05:00",
            "preferred_time": "2026-02-20T15:30:00-05:00",
            "scheduled_time": "2026-02-20T15:30:00-05:00",
            "appointment_id": "seed-appt-006",
            "notes": "Bring serial number photo",
        },
        {
            "lead_id": "seed-lead-007",
            "customer_name": "Lena Ortiz",
            "phone": "+19045551017",
            "item_description": "MacBook Air M1, 8GB/256GB",
            "estimated_value": "520",
            "source": "chat",
            "source_channel": "chat",
            "contact_method": "chat",
            "type": "appraisal",
            "status": "new",
            "priority": "high",
            "notes": "Customer requested pickup option info",
        },
        {
            "lead_id": "seed-lead-008",
            "customer_name": "Terrell Johnson",
            "phone": "+19045551018",
            "item_description": "Diamond stud earrings",
            "estimated_value": "680",
            "source": "web",
            "source_channel": "web",
            "contact_method": "web",
            "type": "appointment",
            "status": "contacted",
            "priority": "normal",
            "appointment_time": "2026-02-21T11:00:00-05:00",
            "preferred_time": "2026-02-21T11:00:00-05:00",
            "scheduled_time": "2026-02-21T11:00:00-05:00",
            "appointment_id": "seed-appt-008",
            "notes": "Prefers morning appointment",
        },
    ]

    items: list[dict] = []
    for index, row in enumerate(base_rows):
        ts = (now.replace(microsecond=0) - timedelta(hours=index + 2)).isoformat()
        item = {
            "lead_id": {"S": row["lead_id"]},
            "customer_name": {"S": row["customer_name"]},
            "phone": {"S": row["phone"]},
            "item_description": {"S": row["item_description"]},
            "estimated_value": {"N": row["estimated_value"]},
            "source": {"S": row["source"]},
            "source_channel": {"S": row["source_channel"]},
            "contact_method": {"S": row["contact_method"]},
            "type": {"S": row["type"]},
            "status": {"S": row["status"]},
            "priority": {"S": row["priority"]},
            "created_at": {"S": ts},
            "timestamp": {"S": ts},
            "updated_at": {"S": ts},
            "notes": {"S": row["notes"]},
        }

        if row.get("appointment_id"):
            item["appointment_id"] = {"S": row["appointment_id"]}
        if row.get("appointment_time"):
            item["appointment_time"] = {"S": row["appointment_time"]}
            item["preferred_time"] = {"S": row["preferred_time"]}
            item["scheduled_time"] = {"S": row["scheduled_time"]}

        items.append(item)

    return items


def seed() -> None:
    data = load_scraped_data()
    inventory_items = build_inventory_items(data)
    config_items = build_config_items(data)
    lead_items = build_seed_lead_items()

    region = os.getenv("AWS_REGION", "us-east-1")
    dry_run = os.getenv("DYNAMODB_DRY_RUN", "false").lower() == "true"

    if dry_run:
        print("Dry-run mode enabled. No writes performed.")
        print(f"Inventory items prepared: {len(inventory_items)}")
        print(f"Config items prepared: {len(config_items)}")
        print(f"Lead items prepared: {len(lead_items)}")
        return

    try:
        dynamodb = boto3.client("dynamodb", region_name=region)

        for item in inventory_items:
            dynamodb.put_item(TableName="USA_Pawn_Inventory", Item=item)

        for item in config_items:
            dynamodb.put_item(TableName="USA_Pawn_Store_Config", Item=item)

        for item in lead_items:
            dynamodb.put_item(TableName="USA_Pawn_Leads", Item=item)

        print("Seed complete.")
        print(f"Inserted inventory items: {len(inventory_items)}")
        print(f"Inserted config items: {len(config_items)}")
        print(f"Inserted lead items: {len(lead_items)}")

    except (NoCredentialsError, PartialCredentialsError):
        print("AWS credentials unavailable. Running dry-run summary.")
        print(f"Inventory items prepared: {len(inventory_items)}")
        print(f"Config items prepared: {len(config_items)}")
        print(f"Lead items prepared: {len(lead_items)}")
    except (ClientError, BotoCoreError) as error:
        print(f"DynamoDB write error: {error}")
        print("Dry-run summary:")
        print(f"Inventory items prepared: {len(inventory_items)}")
        print(f"Config items prepared: {len(config_items)}")
        print(f"Lead items prepared: {len(lead_items)}")


if __name__ == "__main__":
    seed()
