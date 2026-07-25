import json
import requests
import time

API_KEY = "68e2bfd85d173bb9c601817d969e11e5"
DATA_FILE = "C:/Users/tinnakornh/.gemini/antigravity/scratch/resmednuproduction/data.json"
REGISTRY_FILE = "C:/Users/tinnakornh/.gemini/antigravity/scratch/resmednuproduction/researchers.json"

def load_data():
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def load_researchers():
    with open(REGISTRY_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def clean_author_name(auth_name, researchers):
    parts = auth_name.strip().split()
    if not parts:
        return auth_name
    surname = parts[0].replace(",", "").lower()
    initials = parts[1].lower() if len(parts) > 1 else ""
    
    for res in researchers:
        res_name = res["name"]
        res_parts = res_name.strip().split()
        if len(res_parts) >= 2:
            res_first = res_parts[0].lower()
            res_last = res_parts[-1].lower()
            if res_last == surname and initials and res_first.startswith(initials[0]):
                return res["name"]
                
    # Normalize initials format (e.g. "Louthrenoo W" -> "Louthrenoo W.")
    if len(parts) > 1:
        clean_initials = parts[1].replace(".", "")
        initials_formatted = ".".join(list(clean_initials)) + "."
        return f"{parts[0]} {initials_formatted}"
    return auth_name

def fetch_authors_from_pubmed(doi, researchers):
    search_url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term={doi}&retmode=json"
    try:
        response = requests.get(search_url, timeout=10)
        if response.status_code == 200:
            search_data = response.json()
            id_list = search_data.get("esearchresult", {}).get("idlist", [])
            if id_list:
                pmid = id_list[0]
                summary_url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id={pmid}&retmode=json"
                summary_response = requests.get(summary_url, timeout=10)
                if summary_response.status_code == 200:
                    summary_data = summary_response.json()
                    uid_data = summary_data.get("result", {}).get(pmid, {})
                    authors = uid_data.get("authors", [])
                    author_list = []
                    for a in authors:
                        auth_name = a.get("name")
                        if auth_name:
                            cleaned = clean_author_name(auth_name, researchers)
                            author_list.append(cleaned)
                    if author_list:
                        return author_list
    except Exception as e:
        print(f"PubMed error for DOI {doi}: {e}")
    return None

def fetch_authors_from_scopus(doi, researchers):
    url = f"https://api.elsevier.com/content/abstract/doi/{doi}"
    headers = {
        "X-ELS-APIKey": API_KEY,
        "Accept": "application/json"
    }
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            abstract_results = data.get("abstracts-retrieval-response", {})
            authors_group = abstract_results.get("authors", {}).get("author", [])
            
            if isinstance(authors_group, dict):
                authors_group = [authors_group]
                
            author_list = []
            for auth in authors_group:
                preferred_name = auth.get("preferred-name", {})
                surname = preferred_name.get("ce:surname", "")
                initials = preferred_name.get("ce:initials", "")
                if surname:
                    name = f"{surname} {initials}".strip()
                    cleaned_name = clean_author_name(name, researchers)
                    author_list.append(cleaned_name)
            if author_list:
                return author_list
    except Exception as e:
        print(f"Scopus error for DOI {doi}: {e}")
    return None

def main():
    db = load_data()
    researchers = load_researchers()
    publications = db.get("results", [])
    
    missing_pubs = [pub for pub in publications if len(pub.get("authors", [])) <= 1 and pub.get("doi")]
    print(f"Total publications: {len(publications)}")
    print(f"Publications needing co-authors: {len(missing_pubs)}")
    
    completed = 0
    for pub in missing_pubs:
        doi = pub["doi"]
        print(f"Processing DOI: {doi}...")
        
        # 1. Try PubMed first
        authors = fetch_authors_from_pubmed(doi, researchers)
        source = "PubMed"
        
        # 2. Fallback to Scopus if PubMed failed
        if not authors:
            authors = fetch_authors_from_scopus(doi, researchers)
            source = "Scopus"
            
        if authors:
            pub["authors"] = authors
            completed += 1
            print(f"  -> SUCCESS ({source}): Found {len(authors)} authors.")
        else:
            print(f"  -> FAILED: Could not retrieve authors.")
            
        time.sleep(0.25)
        
    # Save database
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(db, f, ensure_ascii=False, indent=2)
        
    print(f"Successfully updated {completed} publications in data.json!")

if __name__ == "__main__":
    main()
