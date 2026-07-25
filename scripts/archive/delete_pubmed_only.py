import json
import shutil

data_path = r"C:\Users\tinnakornh\.gemini\antigravity\scratch\resmednuproduction\data.json"

# Create backup
shutil.copy2(data_path, data_path + ".bak_pubmed")
print("Created backup: data.json.bak_pubmed")

with open(data_path, 'r', encoding='utf-8') as f:
    db = json.load(f)

original_count = len(db['results'])
updated_pubs = []

for pub in db['results']:
    dbs = pub.get('databases', ['Scopus'])
    # If it is PubMed-only, we reject/delete it
    if 'PubMed' in dbs and 'Scopus' not in dbs:
        continue
    
    # If it has both, we keep it but reset databases to Scopus (it will get re-merged if valid during sync)
    if 'Scopus' in dbs:
        pub['databases'] = ['Scopus']
        # Also clean pubmed citations to be clean
        if 'citations_pubmed' in pub:
            pub['citations_pubmed'] = 0
            
    updated_pubs.append(pub)

db['results'] = updated_pubs
db['total_results'] = len(updated_pubs)

with open(data_path, 'w', encoding='utf-8') as f:
    json.dump(db, f, indent=2, ensure_ascii=False)

print(f"Cleaned database: {original_count} -> {len(updated_pubs)} publications (Removed {original_count - len(updated_pubs)} PubMed-only papers)")
