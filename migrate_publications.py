import json
import requests
import time
import os
import sys

# Fix Unicode printing issues in Windows console
sys.stdout.reconfigure(encoding='utf-8')

API_URL = "https://iram-backend.tinnakornh.workers.dev/api/publications/import"
DATA_FILE = "data.json"

def main():
    if not os.path.exists(DATA_FILE):
        print(f"Error: {DATA_FILE} not found.")
        return

    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    results = data.get("results", [])
    total = len(results)
    print(f"Loaded {total} publications from {DATA_FILE}.")

    success_count = 0
    skip_count = 0
    error_count = 0

    for i, pub in enumerate(results):
        print(f"Processing {i+1}/{total}: {pub.get('title', 'Unknown Title')[:50]}...")
        
        # Format the authors array
        # Scopus authors usually look like "Uthaisangsook S." or "Suwannee Uthaisangsook"
        # We also need to flag the corresponding author.
        raw_authors = pub.get("authors", [])
        corr_author = pub.get("corresponding_author", "")
        
        formatted_authors = []
        for index, author_name in enumerate(raw_authors):
            # Check if this author is the corresponding author
            # Sometimes corresponding author is just "Uthaisangsook S." while author_name is "Suwannee Uthaisangsook"
            # Simple substring match or exact match
            is_corr = False
            if corr_author and (corr_author.lower() in author_name.lower() or author_name.lower() in corr_author.lower()):
                is_corr = True
                
            formatted_authors.append({
                "name": author_name,
                "order": index + 1,
                "isCorresponding": is_corr
            })

        payload = {
            "doi": pub.get("doi"),
            "title": pub.get("title"),
            "journal": pub.get("journal"),
            "year": pub.get("year") or (pub.get("coverDate", "")[:4] if pub.get("coverDate") else ""),
            "coverDate": pub.get("coverDate"),
            "quartile": pub.get("quartile_scimago") or pub.get("quartile_scopus") or "",
            "status": "PUBLISHED", 
            "authors": formatted_authors
        }

        try:
            response = requests.post(API_URL, json=payload, timeout=10)
            if response.status_code == 200:
                res_data = response.json()
                if res_data.get("status") == "skipped":
                    skip_count += 1
                    print(f"  -> Skipped: {res_data.get('message')}")
                else:
                    success_count += 1
                    print(f"  -> Inserted successfully! Claiming Author ID: {res_data.get('claimingAuthorId')}")
            else:
                error_count += 1
                print(f"  -> Error API {response.status_code}: {response.text}")
        except Exception as e:
            error_count += 1
            print(f"  -> Error Connection: {e}")
            
        time.sleep(0.1) # Be nice to the local server

    print("\n" + "="*40)
    print("Migration Complete!")
    print(f"Total: {total}")
    print(f"Successfully Inserted: {success_count}")
    print(f"Skipped (Duplicates): {skip_count}")
    print(f"Errors: {error_count}")
    print("="*40)

if __name__ == "__main__":
    main()
