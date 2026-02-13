import os
from typing import Any

import boto3
from botocore.exceptions import BotoCoreError, ClientError, NoCredentialsError, PartialCredentialsError


TABLES: list[dict[str, Any]] = [
    {
        "TableName": "USA_Pawn_Leads",
        "KeySchema": [{"AttributeName": "lead_id", "KeyType": "HASH"}],
        "AttributeDefinitions": [{"AttributeName": "lead_id", "AttributeType": "S"}],
        "BillingMode": "PAY_PER_REQUEST",
    },
    {
        "TableName": "USA_Pawn_Inventory",
        "KeySchema": [{"AttributeName": "item_id", "KeyType": "HASH"}],
        "AttributeDefinitions": [{"AttributeName": "item_id", "AttributeType": "S"}],
        "BillingMode": "PAY_PER_REQUEST",
    },
    {
        "TableName": "USA_Pawn_Staff_Log",
        "KeySchema": [
            {"AttributeName": "log_id", "KeyType": "HASH"},
        ],
        "AttributeDefinitions": [
            {"AttributeName": "log_id", "AttributeType": "S"},
        ],
        "BillingMode": "PAY_PER_REQUEST",
    },
    {
        "TableName": "USA_Pawn_Appraisals",
        "KeySchema": [{"AttributeName": "appraisal_id", "KeyType": "HASH"}],
        "AttributeDefinitions": [{"AttributeName": "appraisal_id", "AttributeType": "S"}],
        "BillingMode": "PAY_PER_REQUEST",
    },
    {
        "TableName": "USA_Pawn_Conversations",
        "KeySchema": [{"AttributeName": "conversation_id", "KeyType": "HASH"}],
        "AttributeDefinitions": [{"AttributeName": "conversation_id", "AttributeType": "S"}],
        "BillingMode": "PAY_PER_REQUEST",
    },
    {
        "TableName": "USA_Pawn_Store_Config",
        "KeySchema": [{"AttributeName": "config_key", "KeyType": "HASH"}],
        "AttributeDefinitions": [{"AttributeName": "config_key", "AttributeType": "S"}],
        "BillingMode": "PAY_PER_REQUEST",
    },
]


def print_dry_run() -> None:
    print("AWS credentials unavailable or dry-run requested. Table definitions:")
    for table in TABLES:
        print(f"- {table['TableName']}")


def table_exists(client, table_name: str) -> bool:
    try:
        client.describe_table(TableName=table_name)
        return True
    except ClientError as error:
        code = error.response.get("Error", {}).get("Code", "")
        return code != "ResourceNotFoundException"


def create_tables() -> None:
    dry_run = os.getenv("DYNAMODB_DRY_RUN", "false").lower() == "true"
    region = os.getenv("AWS_REGION", "us-east-1")

    if dry_run:
        print_dry_run()
        return

    try:
        dynamodb = boto3.client("dynamodb", region_name=region)
        created = 0
        skipped = 0

        for table in TABLES:
            name = table["TableName"]
            if table_exists(dynamodb, name):
                print(f"Skipping existing table: {name}")
                skipped += 1
                continue

            dynamodb.create_table(**table)
            print(f"Creating table: {name}")
            created += 1

        print(f"Done. Created: {created}, Skipped: {skipped}")

    except (NoCredentialsError, PartialCredentialsError):
        print_dry_run()
    except (ClientError, BotoCoreError) as error:
        print(f"DynamoDB error: {error}")
        print_dry_run()


if __name__ == "__main__":
    create_tables()
