import json

data_path = r"C:\Users\tinnakornh\.gemini\antigravity\scratch\resmednuproduction\data.json"
with open(data_path, 'r', encoding='utf-8') as f:
    db = json.load(f)

pubmed_pubs = [p for p in db['results'] if 'PubMed' in p.get('databases', [])]
pubmed_only = [p for p in pubmed_pubs if 'Scopus' not in p.get('databases', [])]

print(f"Total publications in data.json: {len(db['results'])}")
print(f"Publications containing PubMed: {len(pubmed_pubs)}")
print(f"PubMed-only publications: {len(pubmed_only)}")

# Print titles of first 10 PubMed-only publications
for idx, p in enumerate(pubmed_only[:15]):
    print(f"- {p['title']} (Authors: {p['authors']}, Creator: {p['creator']})")
