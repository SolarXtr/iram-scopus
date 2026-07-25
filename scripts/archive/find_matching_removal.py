import json
import sys

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

researchers_path = r"C:\Users\tinnakornh\.gemini\antigravity\scratch\resmednuproduction\researchers.json"

with open(researchers_path, 'r', encoding='utf-8') as f:
    researchers = json.load(f)

prefixes = [
    "Atipotsaw", "Bhuwad", "Chawisac", "Chayakam", "Jirapon Je", "Jittima Mo",
    "Kanida Na", "Kingkaew", "Kongpop", "Kritsana", "Kwancha", "Nathapon",
    "Nattawan", "Nutjakorn", "Panapol V", "Panotsom", "Parichat", "Phornsaw",
    "Phudit Te", "Piyatida C", "Poj Jianm", "Ravisara", "Rawee Jo", "Supalert",
    "Suri Tang", "Thanacha", "Thanawat", "Udomsak", "Wattakorn"
]

matched = []
for p in prefixes:
    p_lower = p.lower()
    for r in researchers:
        if r['name'].lower().startswith(p_lower) or p_lower in r['name'].lower():
            if r not in matched:
                matched.append(r)

print(f"Matched {len(matched)} researchers to remove:")
for r in matched:
    print(f"- {r['name']} ({r['author_id']}) - {r['department']}")
