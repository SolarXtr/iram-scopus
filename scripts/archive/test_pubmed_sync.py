import sys
import os

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

# Append path to search directory
sys.path.append(r"C:\Users\tinnakornh\.gemini\antigravity\scratch\resmednuproduction")

from fetch_data import fetch_pubmed_data_for_author

# Test fetching PubMed data for a researcher
researcher_name = "Suwannee Uthaisangsook"
dept = "Department of Pediatrics"
results = fetch_pubmed_data_for_author(researcher_name, dept, "Active")

print(f"\nFetched {len(results)} publications from PubMed for {researcher_name}:")
for idx, r in enumerate(results[:5]):
    print(f"{idx+1}. Title: {r['title']}")
    print(f"   Journal: {r['journal']}")
    print(f"   Year: {r['year']}")
    print(f"   DOI: {r['doi']}")
    print(f"   Databases: {r['databases']}")
    print("-" * 50)
