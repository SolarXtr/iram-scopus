import urllib.request, urllib.parse, json
import time
import subprocess
import sys

# Fix encoding error on windows
sys.stdout.reconfigure(encoding='utf-8')

def fetch_researchers():
    url = "https://iram-backend.tinnakornh.workers.dev/api/researchers"
    print(f"Fetching researchers from {url}...")
    req = urllib.request.Request(url, headers={'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0'})
    try:
        resp = urllib.request.urlopen(req)
        data = json.loads(resp.read().decode('utf-8'))
        return data
    except Exception as e:
        print(f"Error fetching researchers: {e}")
        return []

def update_researcher_orcid(id, orcid):
    url = f"https://iram-backend.tinnakornh.workers.dev/api/researchers/{id}"
    req = urllib.request.Request(url, method="PUT", headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'})
    data = json.dumps({'orcid': orcid}).encode('utf-8')
    try:
        resp = urllib.request.urlopen(req, data=data)
        return resp.status == 200
    except Exception as e:
        print(f"Error updating researcher {id}: {e}")
        return False

def search_orcid(first_name, last_name):
    query = f"given-names:{first_name} AND family-name:{last_name}"
    q = urllib.parse.quote(query)
    url = f"https://pub.orcid.org/v3.0/expanded-search/?q={q}"
    req = urllib.request.Request(url, headers={'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0'})
    try:
        resp = urllib.request.urlopen(req)
        data = json.loads(resp.read().decode('utf-8'))
        return data.get('expanded-result', [])
    except Exception as e:
        print(f"Error searching ORCID for {first_name} {last_name}: {e}")
        return []

def run():
    researchers = fetch_researchers()
    updated_count = 0

    print(f"Loaded {len(researchers)} researchers.")
    
    for r in researchers:
        if r.get('orcid'):
            continue  # Already has ORCID

        name_parts = r.get('name', '').split()
        if len(name_parts) < 2:
            continue
        first_name = name_parts[0]
        last_name = " ".join(name_parts[1:])
        
        print(f"Searching ORCID for: {first_name} {last_name}...")
        results = search_orcid(first_name, last_name)
        if not results:
            results = []
        
        exact_matches = []
        for res in results:
            g_name = res.get('given-names', '').strip().lower()
            f_name = res.get('family-names', '').strip().lower()
            if g_name == first_name.lower() and f_name == last_name.lower():
                exact_matches.append(res)
        
        if len(exact_matches) > 0:
            # We take the first exact match.
            best_match = exact_matches[0]
            orcid_id = best_match.get('orcid-id')
            inst = best_match.get('institution-name', [])
            inst_str = ", ".join(inst) if inst else "No Institution Listed"
            print(f"  [+] Found ORCID: {orcid_id} ({inst_str})")
            if update_researcher_orcid(r['id'], orcid_id):
                print(f"      Successfully updated backend.")
                updated_count += 1
        else:
            print(f"  [-] No exact match found.")
            
        time.sleep(1) # Be nice to the API

    print(f"\nDiscovery complete. Updated {updated_count} researchers.")
    
    if updated_count > 0:
        print("Triggering Web of Science Sync for the newly discovered ORCIDs...")
        subprocess.run(["python", "fetch_wos_orcid.py"])

if __name__ == "__main__":
    run()
