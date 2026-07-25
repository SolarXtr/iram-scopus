import json

with open("researchers.json", "r", encoding="utf-8") as f:
    res_list = json.load(f)

with open("data.json", "r", encoding="utf-8") as f:
    db = json.load(f)

print("--- Researchers in researchers.json containing Jittham or Vimtrimate or Apiraknapanon ---")
for r in res_list:
    name_l = r['name'].lower()
    if 'jittham' in name_l or 'vimtrimate' in name_l or 'apiraknapanon' in name_l:
        print(f"- {r['name']} ({r['author_id']}) - {r['status']} - {r['department']}")

print("\n--- Researchers in data.json's researchers list containing Jittham or Vimtrimate or Apiraknapanon ---")
for r in db.get('researchers', []):
    name_l = r['name'].lower()
    if 'jittham' in name_l or 'vimtrimate' in name_l or 'apiraknapanon' in name_l:
        print(f"- {r['name']} ({r['author_id']}) - {r['status']} - {r['department']}")

# Let's inspect the publications shown in the screenshot
titles = [
    "Risk Factors for Non-Hemolytic Jaundice in Neonates",
    "Echocardiographic assessment of cardiac function abnormalities",
    "Treatment Outcomes of Transcatheter Closure"
]

print("\n--- Publications Details ---")
for pub in db['results']:
    for t in titles:
        if t.lower() in pub['title'].lower():
            print(f"Title: {pub['title']}")
            print(f"Authors: {pub['authors']}")
            print(f"Corresponding: {pub['corresponding_author']}")
            print(f"Creator: {pub['creator']}")
            print("-" * 50)
