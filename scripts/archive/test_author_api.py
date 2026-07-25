import requests
import json
import sys

API_KEY = "68e2bfd85d173bb9c601817d969e11e5"
author_id = "6506446785" # Suwannee Uthaisangsook
url = f"https://api.elsevier.com/content/author/author_id/{author_id}"
headers = {
    "X-ELS-APIKey": API_KEY,
    "Accept": "application/json"
}

resp = requests.get(url, headers=headers)
if resp.status_code == 200:
    data = resp.json()
    with open('author_profile.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
    print("Saved response to author_profile.json")
else:
    print(f"Failed: {resp.status_code}")
