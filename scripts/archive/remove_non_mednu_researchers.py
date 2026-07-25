import json
import os

researchers_path = r"C:\Users\tinnakornh\.gemini\antigravity\scratch\resmednuproduction\researchers.json"
data_path = r"C:\Users\tinnakornh\.gemini\antigravity\scratch\resmednuproduction\data.json"

# Backups
import shutil
shutil.copy2(researchers_path, researchers_path + ".bak")
shutil.copy2(data_path, data_path + ".bak")
print("Created backups for researchers.json and data.json")

# Load databases
with open(researchers_path, 'r', encoding='utf-8') as f:
    researchers = json.load(f)
with open(data_path, 'r', encoding='utf-8') as f:
    db = json.load(f)

# List of Author IDs to remove
to_remove_ids = [
    "57396362900", "57204396066", "59178962700", "57215943526", "59143774500",
    "57221721192", "57191349419", "55605670700", "57459578300", "57224560409",
    "58906700800", "58650860300", "57219907457", "60126001900", "57208244786",
    "55332809900", "57189075689", "57202020005", "36684226500", "57962223200",
    "9744722200", "57433499500", "59178962800", "57073834700", "57564596000",
    "57222611562", "57220162126", "36667689400", "58536889900"
]

# Filter researchers
active_researchers = [r for r in researchers if r['author_id'] not in to_remove_ids]
print(f"Researchers count: {len(researchers)} -> {len(active_researchers)} (Removed {len(researchers) - len(active_researchers)})")

# Build set of normalized active names and Scopus IDs for matching
active_ids = set(r['author_id'] for r in active_researchers)
active_names = [r['name'].lower() for r in active_researchers]
name_to_dept = {r['name'].lower(): r['department'] for r in active_researchers}
for r in active_researchers:
    parts = r['name'].split()
    if parts:
        name_to_dept[parts[-1].lower()] = r['department']

def normalize(t):
    return ''.join(c.lower() for c in t if c.isalnum())

# Process publications
updated_pubs = []
removed_pubs_count = 0

for pub in db['results']:
    # Check if this publication belongs to any active researcher
    has_active_author = False
    matched_depts = set()
    
    # Check authors against active researcher database
    for auth in pub.get('authors', []):
        auth_lower = auth.lower()
        # Check full name matching
        for r_name in active_names:
            if r_name in auth_lower or auth_lower in r_name:
                has_active_author = True
                matched_depts.add(name_to_dept[r_name])
        # Check last name matching
        auth_parts = auth_lower.split()
        if auth_parts:
            last = auth_parts[-1]
            if last in name_to_dept:
                has_active_author = True
                matched_depts.add(name_to_dept[last])
                
    if has_active_author:
        # Keep publication, update departments
        if matched_depts:
            pub['departments'] = list(matched_depts)
        else:
            pub['departments'] = ['Faculty of Medicine']
        updated_pubs.append(pub)
    else:
        removed_pubs_count += 1

print(f"Publications count: {len(db['results'])} -> {len(updated_pubs)} (Removed {removed_pubs_count} publications having no active MedNU authors)")

# Save updated files
with open(researchers_path, 'w', encoding='utf-8') as f:
    json.dump(active_researchers, f, indent=4, ensure_ascii=False)

db['results'] = updated_pubs
db['total_results'] = len(updated_pubs)

with open(data_path, 'w', encoding='utf-8') as f:
    json.dump(db, f, indent=4, ensure_ascii=False)

print("Successfully saved updated databases.")
