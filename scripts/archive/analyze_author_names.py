import json
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open("data.json", "r", encoding="utf-8") as f:
    db = json.load(f)

with open("researchers.json", "r", encoding="utf-8") as f:
    researchers = json.load(f)

res_names_lower = {r['name'].lower(): r['name'] for r in researchers}

# Count how many authors in data.json are abbreviated (e.g. "Surname X.") vs full name
abbrev_count = 0
full_count = 0
abbrev_examples = []

for pub in db['results']:
    for auth in pub['authors']:
        auth_clean = auth.strip()
        # Check if it looks abbreviated: ends with "." and has short tokens
        tokens = auth_clean.replace(',', '').replace('.', '').split()
        has_short = any(len(t) <= 2 for t in tokens)
        has_dot = '.' in auth_clean
        
        if has_dot and has_short and len(tokens) <= 3:
            abbrev_count += 1
            if len(abbrev_examples) < 20:
                # Check if this abbreviated name matches any researcher
                sig_tokens = [t.lower() for t in tokens if len(t) > 2]
                matched = None
                for rn_low, rn_full in res_names_lower.items():
                    rn_tokens = rn_low.split()
                    rn_sig = [t for t in rn_tokens if len(t) > 2]
                    if any(st in rn_sig for st in sig_tokens):
                        matched = rn_full
                        break
                abbrev_examples.append((auth_clean, matched, pub['title'][:60]))
        else:
            full_count += 1

print(f"Total abbreviated author entries: {abbrev_count}")
print(f"Total full-name author entries: {full_count}")
print(f"\nAbbreviated examples with matching attempt:")
for auth, matched, title in abbrev_examples:
    status = f"-> {matched}" if matched else "NO MATCH"
    print(f"  '{auth}' {status}  [{title}]")

# Now check: for publications where creator is in researchers but some co-authors
# are abbreviated versions of other researchers and not being matched
print("\n" + "=" * 80)
print("CRITICAL: Publications where MEDNU researchers appear abbreviated in authors list")
print("=" * 80)

critical_count = 0
for pub in db['results'][:100]:
    for auth in pub['authors']:
        auth_clean = auth.strip()
        # Skip if already exact match
        if auth_clean.lower() in res_names_lower:
            continue
        
        # Try to match abbreviated name to researcher
        tokens = auth_clean.lower().replace(',', '').replace('.', '').split()
        sig_tokens = [t for t in tokens if len(t) > 2]
        init_tokens = [t[0] for t in tokens if len(t) <= 2]
        
        for rn_low, rn_full in res_names_lower.items():
            rn_tokens = rn_low.split()
            rn_sig = [t for t in rn_tokens if len(t) > 2]
            rn_inits = [t[0] for t in rn_tokens]
            
            if any(st in rn_sig for st in sig_tokens):
                if init_tokens and rn_inits:
                    if any(i in rn_inits for i in init_tokens):
                        critical_count += 1
                        if critical_count <= 15:
                            print(f"  '{auth_clean}' should be '{rn_full}'")
                            print(f"    Title: {pub['title'][:70]}")
                        break
                elif not init_tokens:
                    critical_count += 1
                    if critical_count <= 15:
                        print(f"  '{auth_clean}' should be '{rn_full}'")
                        print(f"    Title: {pub['title'][:70]}")
                    break

print(f"\nTotal abbreviated MEDNU researchers found: {critical_count}")
