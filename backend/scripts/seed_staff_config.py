import boto3
import json
from datetime import datetime

dynamodb = boto3.client('dynamodb', region_name='us-east-1')

# Simple staff records for demo
staff_config = {
    'config_key': 'staff_records',
    'value': json.dumps({
        'staff': [
            {'name': 'Demo Staff', 'pin': '1234'},
            {'name': 'John Doe', 'pin': '5678'},
            {'name': 'Jane Smith', 'pin': '9999'},
        ]
    }),
    'updated_at': datetime.utcnow().isoformat() + 'Z'
}

try:
    dynamodb.put_item(
        TableName='USA_Pawn_Store_Config',
        Item={
            'config_key': {'S': staff_config['config_key']},
            'value': {'S': staff_config['value']},
            'updated_at': {'S': staff_config['updated_at']}
        }
    )
    print(f"✅ Created staff_records config")
except Exception as e:
    print(f"❌ Error: {e}")
