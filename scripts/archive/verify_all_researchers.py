import os
import sys
import json
import time
import requests

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

API_KEY = "68e2bfd85d173bb9c601817d969e11e5"
researchers_path = r"C:\Users\tinnakornh\.gemini\antigravity\scratch\resmednuproduction\researchers.json"
report_path = r"C:\Users\tinnakornh\.gemini\antigravity\scratch\resmednuproduction\researchers_affiliation_report.md"

with open(researchers_path, 'r', encoding='utf-8') as f:
    researchers = json.load(f)

print(f"Loaded {len(researchers)} researchers from system.")

def extract_affiliation_names(profile):
    names = []
    # 1. Current Affiliation from author-profile
    aff_curr = profile.get("author-profile", {}).get("affiliation-current", {}).get("affiliation", {})
    if aff_curr:
        ip_doc = aff_curr.get("ip-doc", {})
        if ip_doc:
            disp = ip_doc.get("afdispname")
            if disp: names.append(disp)
            parent = ip_doc.get("parent-preferred-name", {}).get("$")
            if parent: names.append(parent)
            pref = ip_doc.get("preferred-name", {}).get("$")
            if pref: names.append(pref)
            
    # 2. History Affiliations from author-profile
    aff_hist = profile.get("author-profile", {}).get("affiliation-history", {}).get("affiliation", [])
    if isinstance(aff_hist, dict):
        aff_hist = [aff_hist]
    for aff in aff_hist:
        ip_doc = aff.get("ip-doc", {})
        if ip_doc:
            disp = ip_doc.get("afdispname")
            if disp: names.append(disp)
            parent = ip_doc.get("parent-preferred-name", {}).get("$")
            if parent: names.append(parent)
            pref = ip_doc.get("preferred-name", {}).get("$")
            if pref: names.append(pref)
            
    return list(set(names))

def verify_researcher(res):
    author_id = res.get("author_id")
    name = res.get("name")
    dept = res.get("department")
    
    if not author_id:
        return {
            "name": name,
            "author_id": "Missing",
            "current_aff": "N/A",
            "all_affs": [],
            "status": "No Author ID",
            "is_nu": False
        }
        
    url = f"https://api.elsevier.com/content/author/author_id/{author_id}"
    headers = {
        "X-ELS-APIKey": API_KEY,
        "Accept": "application/json"
    }
    
    # Retry logic for rate limiting
    retries = 3
    for attempt in range(retries):
        try:
            resp = requests.get(url, headers=headers, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                profiles = data.get("author-retrieval-response", [])
                if not profiles:
                    return {
                        "name": name,
                        "author_id": author_id,
                        "current_aff": "Not Found Profile",
                        "all_affs": [],
                        "status": "Profile Not Found",
                        "is_nu": False
                    }
                
                profile = profiles[0]
                all_affs = extract_affiliation_names(profile)
                
                # Check current affiliation display name
                curr_aff_name = "Unknown"
                aff_curr = profile.get("author-profile", {}).get("affiliation-current", {}).get("affiliation", {})
                if aff_curr and aff_curr.get("ip-doc"):
                    curr_aff_name = aff_curr.get("ip-doc", {}).get("afdispname") or aff_curr.get("ip-doc", {}).get("parent-preferred-name", {}).get("$") or "Unknown"

                # Verify if NU is in any affiliations
                is_nu = False
                for a in all_affs:
                    a_lower = a.lower()
                    if "naresuan" in a_lower or "nu " in a_lower or "phitsanulok" in a_lower:
                        is_nu = True
                        break
                
                status = "Verified NU" if is_nu else "Other Institution"
                return {
                    "name": name,
                    "author_id": author_id,
                    "current_aff": curr_aff_name,
                    "all_affs": all_affs,
                    "status": status,
                    "is_nu": is_nu
                }
            elif resp.status_code == 429:
                # Rate limit hit, sleep and retry
                time.sleep(2.0)
                continue
            else:
                return {
                    "name": name,
                    "author_id": author_id,
                    "current_aff": "API Error",
                    "all_affs": [],
                    "status": f"HTTP {resp.status_code}",
                    "is_nu": False
                }
        except Exception as e:
            if attempt == retries - 1:
                return {
                    "name": name,
                    "author_id": author_id,
                    "current_aff": "Request Failed",
                    "all_affs": [],
                    "status": str(e),
                    "is_nu": False
                }
            time.sleep(1.0)
            
    return {
        "name": name,
        "author_id": author_id,
        "current_aff": "Rate Limit Exceeded",
        "all_affs": [],
        "status": "HTTP 429",
        "is_nu": False
    }

# Run sequential verification with rate-limiting delay
print("Verifying researchers affiliations sequentially (with 0.15s delay to prevent rate limits)...")
results = []
for idx, r in enumerate(researchers):
    res = verify_researcher(r)
    results.append(res)
    time.sleep(0.15)
    if (idx + 1) % 20 == 0 or (idx + 1) == len(researchers):
        print(f"Processed {idx + 1}/{len(researchers)} researchers...")

# Write Markdown Report
with open(report_path, 'w', encoding='utf-8') as f:
    f.write("# รายงานตรวจสอบการสังกัดสถาบันของนักวิจัย (Researchers Affiliation Report)\n\n")
    f.write(f"ตรวจสอบรายชื่อนักวิจัยทั้งหมดจำนวน {len(researchers)} ท่าน เทียบกับ Scopus Profile API\n\n")
    
    verified_nu = [r for r in results if r['is_nu']]
    other_inst = [r for r in results if not r['is_nu'] and r['status'] != 'No Author ID']
    no_id = [r for r in results if r['status'] == 'No Author ID']
    
    f.write("## 1. บทสรุปผลการตรวจสอบ\n\n")
    f.write(f"- **สังกัด มหาวิทยาลัยนเรศวร (NU / NU Hospital / Depts):** {len(verified_nu)} ท่าน\n")
    f.write(f"- **สังกัดสถาบันอื่น (หรือข้อมูลไม่อัปเดต):** {len(other_inst)} ท่าน\n")
    f.write(f"- **ไม่มีรหัสผู้แต่ง (No Author ID):** {len(no_id)} ท่าน\n\n")
    
    if other_inst:
        f.write("## 2. รายชื่อนักวิจัยที่ตรวจพบว่าสังกัดสถาบันอื่นในปัจจุบัน\n")
        f.write("*(ผู้ดูแลระบบโปรดตรวจสอบว่านักวิจัยย้ายสถาบัน หรือใส่รหัส Author ID คลาดเคลื่อนหรือไม่)*\n\n")
        f.write("| นักวิจัย | Scopus ID | สถาบันปัจจุบันใน Scopus | สถานะ / ข้อมูลสังกัดทั้งหมด |\n")
        f.write("| :--- | :---: | :--- | :--- |\n")
        for r in other_inst:
            all_affs_str = ", ".join(r['all_affs'][:4]) if r['all_affs'] else "-"
            f.write(f"| {r['name']} | {r['author_id']} | {r['current_aff']} | {r['status']} ({all_affs_str}) |\n")
            
    f.write("\n## 3. รายชื่อนักวิจัยที่สังกัดมหาวิทยาลัยนเรศวร/โรงพยาบาลมน. ทั้งหมด\n\n")
    f.write("| ลำดับ | นักวิจัย | Scopus ID | สถาบันปัจจุบันใน Scopus |\n")
    f.write("| :---: | :--- | :---: | :--- |\n")
    for idx, r in enumerate(sorted(verified_nu, key=lambda x: x['name'])):
        f.write(f"| {idx+1} | {r['name']} | {r['author_id']} | {r['current_aff']} |\n")

print(f"Report successfully saved to {report_path}")
