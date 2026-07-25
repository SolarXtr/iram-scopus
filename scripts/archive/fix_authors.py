import json
import requests
import time

API_URL = "https://iram-backend.tinnakornh.workers.dev/api/publications"
DATA_FILE = "data.json"

def main():
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        results = data.get("results", [])
        if not results:
            print("No results found in data.json.")
            return
            
        print(f"Found {len(results)} publications to update.")
        
        success_count = 0
        for idx, p in enumerate(results):
            payload = {
                "title": p.get('title', ''),
                "journal": p.get('journal', ''),
                "quartile": p.get('quartile_scopus', '') or p.get('quartile_scimago', ''),
                "authorId": p.get('creator', ''),
                "doi": p.get('doi', ''),
                "citations": p.get('citations', 0),
                "sourceTags": p.get('databases', []),
                "status": "Active"
            }
            
            resp = requests.post(API_URL, json=payload)
            if resp.status_code == 200:
                success_count += 1
            else:
                safe_title = p.get('title', '')[:30].encode('ascii', errors='replace').decode('ascii')
                print(f"[{idx+1}/{len(results)}] Failed: {safe_title}... -> {resp.text}")
                
            time.sleep(0.05)
            
        print(f"Successfully updated {success_count}/{len(results)} publications!")
        
    except Exception as e:
        print(f"Error reading data.json: {e}")

if __name__ == "__main__":
    main()
