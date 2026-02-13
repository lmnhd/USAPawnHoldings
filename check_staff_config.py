import boto3
import json

dynamodb = boto3.client('dynamodb', region_name='us-east-1')

# Get the staff_records item
result = dynamodb.get_item(
    TableName='USA_Pawn_Store_Config',
    Key={'config_key': {'S': 'staff_records'}}
)

if 'Item' in result:
    print('✅ Staff config found:')
    item = result['Item']
    print(json.dumps(item, indent=2, default=str))
else:
    print('❌ Staff config not found')
    print('Available items:')
    scan = dynamodb.scan(TableName='USA_Pawn_Store_Config', Limit=5)
    for item in scan.get('Items', []):
        print(f"  - {item.get('config_key', {}).get('S', 'unknown')}")
