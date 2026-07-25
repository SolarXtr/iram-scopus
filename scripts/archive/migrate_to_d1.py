import json
import os
import requests

API_URL = "https://iram-backend.tinnakornh.workers.dev/api"

def migrate_researchers():
    researchers_path = os.path.join(os.path.dirname(__file__), "researchers.json")
    if not os.path.exists(researchers_path):
        print(f"File not found: {researchers_path}")
        return
        
    with open(researchers_path, 'r', encoding='utf-8') as f:
        researchers = json.load(f)
        
    print(f"Migrating {len(researchers)} researchers...")
    for idx, r in enumerate(researchers):
        payload = {
            "scopusAuthorId": r.get('author_id', ''),
            "department": r.get('department', ''),
            "status": r.get('status', 'Active'),
            "userId": "" # To be mapped later manually or via logic
        }
        try:
            resp = requests.post(f"{API_URL}/researchers", json=payload)
            if resp.status_code == 200:
                print(f"[{idx+1}/{len(researchers)}] Successfully migrated researcher: {r.get('name')}")
            else:
                print(f"[{idx+1}/{len(researchers)}] Failed to migrate researcher: {r.get('name')} - {resp.text}")
        except Exception as e:
            print(f"Error migrating {r.get('name')}: {e}")

def migrate_publications():
    data_path = os.path.join(os.path.dirname(__file__), "data.json")
    if not os.path.exists(data_path):
        print(f"File not found: {data_path}")
        return
        
    with open(data_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    results = data.get('results', [])
    print(f"Migrating {len(results)} publications...")
    
    for idx, p in enumerate(results):
        # Format the actual publication date
        pub_year = p.get('year', '')
        pub_date = p.get('coverDate') or (f"{pub_year}-01-01" if pub_year else None)
        
        payload = {
            "title": p.get('title', ''),
            "journal": p.get('journal', ''),
            "quartile": p.get('quartile_scopus', '') or p.get('quartile_scimago', ''),
            "authorId": p.get('creator', 'system-migration-user'),
            "status": "Active",
            "doi": p.get('doi', ''),
            "citations": p.get('citations', 0),
            "databases": p.get('databases', ['Scopus']),
            "authors": p.get('authors', []),
            "corresponding_author": p.get('corresponding_author', ''),
            "createdAt": pub_date
        }
        
        safe_title = p.get('title', '')[:30].encode('ascii', errors='replace').decode('ascii')
        try:
            resp = requests.post(f"{API_URL}/publications", json=payload)
            if resp.status_code == 200:
                print(f"[{idx+1}/{len(results)}] Successfully migrated: {safe_title}...")
            else:
                print(f"[{idx+1}/{len(results)}] Failed to migrate: {safe_title}... - {resp.text}")
        except Exception as e:
            print(f"Error migrating {safe_title}: {e}")

if __name__ == "__main__":
    print("Starting Migration to Cloudflare D1 via API...")
    migrate_researchers()
    migrate_publications()
    print("Migration completed.")
