import requests
import json

try:
    response = requests.get("http://localhost:3000/api/staff-log?action=list-staff", timeout=5)
    print(f"Status Code: {response.status_code}")
    print(f"Response:\n{response.text[:500]}")
    
    # Try to parse as JSON
    data = response.json()
    print(f"\nParsed JSON (first 1000 chars):")
    print(json.dumps(data, indent=2)[:1000])
except Exception as e:
    print(f"Error: {e}")
