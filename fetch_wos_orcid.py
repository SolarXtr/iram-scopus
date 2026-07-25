import urllib.request
import urllib.parse
import urllib.error
import json
import ssl

BACKEND_API_URL = "https://iram-backend.tinnakornh.workers.dev"

# Allow unverified HTTPS context if needed
ssl._create_default_https_context = ssl._create_unverified_context

def get_researchers():
    url = f"{BACKEND_API_URL}/api/researchers"
    print(f"Fetching researchers from {url}...")
    try:
        req = urllib.request.Request(url, headers={'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"Error fetching researchers: {e}")
        return []

def fetch_orcid_works(orcid_id):
    url = f"https://pub.orcid.org/v3.0/{orcid_id}/works"
    try:
        req = urllib.request.Request(url, headers={'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as response:
            data = json.loads(response.read().decode('utf-8'))
            return data.get("group", [])
    except Exception as e:
        print(f"Error fetching ORCID data for {orcid_id}: {e}")
        return []

def extract_wos_publications(orcid_id, researcher_name, researcher_id):
    works = fetch_orcid_works(orcid_id)
    wos_pubs = []
    
    for group in works:
        work_summaries = group.get("work-summary", [])
        for summary in work_summaries:
            source_name = summary.get("source", {}).get("source-name", {}).get("value", "")
            if source_name and any(x in source_name for x in ["ResearcherID", "Web of Science", "Publons"]):
                title = summary.get("title", {}).get("title", {}).get("value", "")
                
                # Extract year
                year = None
                pub_date = summary.get("publication-date")
                if pub_date and pub_date.get("year"):
                    year = int(pub_date.get("year").get("value"))
                    
                # Extract DOI
                doi = ""
                ext_ids = summary.get("external-ids", {}).get("external-id", [])
                for ext_id in ext_ids:
                    if ext_id.get("external-id-type") == "doi":
                        doi = ext_id.get("external-id-value", "")
                        break
                        
                journal = summary.get("journal-title", {}).get("value", "") if summary.get("journal-title") else ""
                
                wos_pubs.append({
                    "doi": doi,
                    "title": title,
                    "journal": journal,
                    "year": year,
                    "coverDate": f"{year}-01-01" if year else None,
                    "quartile": "Q4", # Default
                    "status": "PUBLISHED",
                    "authors": [{"name": researcher_name, "order": 1, "isCorresponding": False, "userId": researcher_id}],
                    "databases": ["WoS"]
                })
                break # Only process one summary per group if it matches
    return wos_pubs

def push_publication(pub):
    url = f"{BACKEND_API_URL}/api/publications/import"
    try:
        data = json.dumps(pub).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as response:
            res = json.loads(response.read().decode('utf-8'))
            return res
    except Exception as e:
        print(f"Error pushing {pub['title']}: {e}")
        return None

def main():
    print("Starting Web of Science (via ORCID) sync...")
    researchers = get_researchers()
    success_count = 0
    error_count = 0
    
    for r in researchers:
        orcid = r.get('orcid')
        if not orcid:
            continue
            
        print(f"Fetching WoS publications for {r.get('name')} (ORCID: {orcid})...")
        pubs = extract_wos_publications(orcid, r.get('name'), r.get('id'))
        print(f"  Found {len(pubs)} WoS publications.")
        
        for pub in pubs:
            res = push_publication(pub)
            if res:
                success_count += 1
            else:
                error_count += 1
                
    print(f"WoS sync complete. Success: {success_count}, Errors: {error_count}")

if __name__ == "__main__":
    main()
