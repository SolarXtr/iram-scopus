import os
import json
import requests
import datetime
import random
import time
import sys

# Ensure UTF-8 output on Windows console
sys.stdout.reconfigure(encoding='utf-8')

# Configuration
API_KEY = "68e2bfd85d173bb9c601817d969e11e5"
REGISTRY_FILE = "researchers.json"

BACKEND_URL = "https://iram-backend.tinnakornh.workers.dev"


def safe_request(url, headers=None, params=None, timeout=15):
    max_retries = 3
    base_delay = 2
    for attempt in range(max_retries):
        try:
            resp = requests.get(url, headers=headers, params=params, timeout=timeout)
            if resp.status_code == 429:
                delay = base_delay * (2 ** attempt) + random.uniform(0.5, 1.5)
                print(f"  [429 Too Many Requests] Retrying in {delay:.1f}s...")
                time.sleep(delay)
                continue
            return resp
        except Exception as e:
            if attempt == max_retries - 1:
                raise e
            delay = base_delay * (2 ** attempt) + random.uniform(0.5, 1.5)
            print(f"  [Error] Retrying in {delay:.1f}s...")
            time.sleep(delay)
    return None

def load_researchers():
    """Loads the researcher registry from the backend API."""
    url = f"{BACKEND_URL}/api/researchers"
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Error fetching researchers: {response.status_code}")
    except Exception as e:
        print(f"Exception fetching researchers: {e}")
            
    # Default fallback list of researchers if API fails
    return []

def get_mock_data(researchers):
    """Generates mock publication data using the registered researchers."""
    print("Generating premium mock data using registered researchers database...")
    
    journals = [
        {"title": "Journal of the Medical Association of Thailand", "impact_factor": 0.4},
        {"title": "Southeast Asian Journal of Tropical Medicine and Public Health", "impact_factor": 0.6},
        {"title": "Plos One", "impact_factor": 3.7},
        {"title": "BMC Public Health", "impact_factor": 4.5},
        {"title": "Scientific Reports", "impact_factor": 4.6},
        {"title": "The Lancet", "impact_factor": 202.7},
        {"title": "New England Journal of Medicine", "impact_factor": 176.0},
        {"title": "Asian Pacific Journal of Cancer Prevention", "impact_factor": 1.5}
    ]
    
    research_topics = [
        "Clinical outcomes of laparoscopic surgery in rural Thailand",
        "Prevalence and risk factors of diabetes mellitus in Phitsanulok province",
        "Efficacy of local herbal extracts against drug resistant bacteria",
        "Mental health status and coping mechanisms of medical students under stress",
        "Epidemiological study of dengue hemorrhagic fever patterns in Northern Thailand",
        "Evaluation of telemedicine services in community hospitals during pandemic",
        "Association between PM2.5 exposure and respiratory symptoms in school children",
        "Retrospective study of cardiovascular disease survival rates in tertiary care",
        "Diagnostic accuracy of low-dose computed tomography in detecting lung nodules"
    ]
    
    documents = []
    start_year = 2018
    end_year = 2026
    
    # Generate mock publications specifically mapped to registry list
    for i in range(120):
        year = random.randint(start_year, end_year)
        month = random.randint(1, 12)
        day = random.randint(1, 28)
        cover_date = f"{year}-{month:02d}-{day:02d}"
        
        # Select 1 to 3 authors from registry list
        num_authors = min(random.randint(1, 3), len(researchers))
        doc_researchers = random.sample(researchers, num_authors)
        
        creator = doc_researchers[0]["name"]
        author_names = [r["name"] for r in doc_researchers]
        
        # Admin override department injection logic
        depts = list(set([r["department"] for r in doc_researchers]))
        
        journal = random.choice(journals)
        topic = random.choice(research_topics)
        title = f"{topic}: A {random.choice(['retrospective cohort study', 'cross-sectional analysis', 'systematic review', 'randomized trial'])} of {random.randint(50, 500)} patients"
        
        citations = int(random.lognormvariate(1.8, 1.1))
        if year == 2026:
            citations = random.randint(0, 2)
            
        doi = f"10.1016/j.{journal['title'].lower().replace(' ', '')}.{year}.{random.randint(10000, 99999)}"
        corresponding = random.choice(author_names)
        
        # Determine quartiles
        h = hash(journal["title"]) % 4
        qs = ["Q1", "Q2", "Q3", "Q4"]
        q_scimago = qs[h]
        q_scopus = qs[(h + 1) % 4]
        if "lancet" in journal["title"].lower() or "nejm" in journal["title"].lower() or "new england" in journal["title"].lower():
            q_scimago = "Q1"
            q_scopus = "Q1"

        documents.append({
            "title": title,
            "creator": creator,
            "creator_is_nu_affiliated": True,
            "authors": author_names,
            "corresponding_author": corresponding,
            "departments": depts,
            "journal": journal["title"],
            "coverDate": cover_date,
            "year": str(year),
            "citations": citations,
            "citations_scopus": citations,
            "citations_pubmed": 0,
            "doi": doi,
            "quartile_scopus": q_scopus,
            "quartile_scimago": q_scimago,
            "databases": ["Scopus"]
        })
        
    return {
        "status": "success",
        "data_source": "mock_data",
        "retrieved_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "affiliation": "Faculty of Medicine, Naresuan University",
        "total_results": len(documents),
        "results": documents
    }

SERIAL_CACHE = {}

def get_journal_quartiles(issn, journal_name):
    """Calculates Scopus quartile via API and SCImago quartile via Reference DB."""
    # Check cache first
    if issn and issn in SERIAL_CACHE:
        return SERIAL_CACHE[issn]

    q_scopus = "N/A" # Fallback defaults
    q_scimago = "N/A"

    # API check if key available (Scopus CiteScore)
    if issn and API_KEY:
        url = "https://api.elsevier.com/content/serial/metadata"
        headers = {
            "X-ELS-APIKey": API_KEY,
            "Accept": "application/json"
        }
        try:
            # Strip hyphens just in case for consistent comparison
            clean_issn = issn.replace("-", "")
            response = requests.get(url, headers=headers, params={"issn": clean_issn}, timeout=5)
            if response.status_code == 200:
                data = response.json()
                entries = data.get("serial-metadata-response", {}).get("entry", [])
                if entries:
                    citeScoreList = entries[0].get("citeScoreYearInfoList", {}).get("citeScoreCurrentMetric", {}).get("citeScoreCurrentMetricValues", {}).get("citeScoreCurrentMetricValue", [])
                    if isinstance(citeScoreList, list) and citeScoreList:
                        pct = citeScoreList[0].get("percentile", None)
                        if pct is not None:
                            val = float(pct)
                            if val >= 75: q_scopus = "Q1"
                            elif val >= 50: q_scopus = "Q2"
                            elif val >= 25: q_scopus = "Q3"
                            else: q_scopus = "Q4"
        except Exception:
            pass

    # Check SJR Quartile from Reference DB (Cloudflare D1)
    if issn:
        try:
            clean_issn = issn.replace("-", "")
            ref_url = f"https://iram-backend.tinnakornh.workers.dev/api/reference/quartile/{clean_issn}"
            resp = requests.get(ref_url, timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("source") == "SJR" and data.get("quartile"):
                    q_scimago = data.get("quartile")
        except Exception as e:
            print(f"Warning: Failed to fetch SJR from Reference DB for ISSN {issn}: {e}")

    # Specific override rules for Q1 journals
    j_lower = journal_name.lower()
    if any(k in j_lower for k in ["lancet", "nature", "nejm", "new england journal", "science", "plos one", "jama"]):
        q_scopus = "Q1"
        q_scimago = "Q1"

    res = (q_scopus, q_scimago)
    if issn:
        SERIAL_CACHE[issn] = res
    return res

def fetch_scopus_data_for_author(author_id, researcher_name, researcher_dept, status="Active", join_date=None, resign_date=None):
    """Fetches publications for a specific author ID from Scopus."""
    if not author_id:
        print(f"Skipping Scopus for {researcher_name} (No Author ID)")
        return []
    print(f"Fetching publications for researcher: {researcher_name} (ID: {author_id}, Status: {status})...")
    url = "https://api.elsevier.com/content/search/scopus"
    headers = {
        "X-ELS-APIKey": API_KEY,
        "Accept": "application/json"
    }
    params = {
        "query": f"AU-ID({author_id})",
        "count": 25,
        "start": 0,
        "field": "dc:title,dc:creator,author,prism:doi,prism:coverDate,prism:publicationName,citedby-count,prism:issn,affiliation"
    }
    
    author_results = []
    start = 0
    
    try:
        while True:
            params["start"] = start
            response = safe_request(url, headers=headers, params=params, timeout=15)
            if response.status_code != 200:
                print(f"  API Request failed for {researcher_name} at start={start}: {response.status_code}")
                break
                
            data = response.json()
            search_results = data.get("search-results", {})
            entries = search_results.get("entry", [])
            
            if not entries or len(entries) == 0:
                break
                
            for entry in entries:
                title = entry.get("dc:title", "Unknown Title")
                creator = entry.get("dc:creator", "Unknown Author")
                journal = entry.get("prism:publicationName", "Unknown Source")
                cover_date = entry.get("prism:coverDate", "Unknown Date")
                year = cover_date.split("-")[0] if cover_date else "Unknown Year"
                issn = entry.get("prism:issn", "")
                
                try:
                    citations = int(entry.get("citedby-count", 0))
                except ValueError:
                    citations = 0
                    
                doi = entry.get("prism:doi", "")
                
                aff_list = entry.get("affiliation", [])
                if not isinstance(aff_list, list):
                    aff_list = [aff_list] if aff_list else []
                
                has_nu_aff = False
                for aff in aff_list:
                    aff_name = str(aff.get("affilname", "")).lower()
                    if ("naresuan" in aff_name and "medicine" in aff_name) or \
                       "naresuan university hospital" in aff_name or \
                       "คณะแพทยศาสตร์ มหาวิทยาลัยนเรศวร" in aff_name or \
                       "โรงพยาบาลมหาวิทยาลัยนเรศวร" in aff_name:
                        has_nu_aff = True
                        break

                is_nu_affiliated = has_nu_aff
                
                # Check affiliation filter for resigned/inactive researchers
                if status in ["Resigned", "Inactive"]:
                    if not is_nu_affiliated:
                        # Skip this publication as the resigned/inactive researcher was not affiliated with NU for this paper
                        continue
                
                # Fetch Quartiles
                q_scopus, q_scimago = get_journal_quartiles(issn, journal)

                # Format author list
                author_list = []
                author_names = entry.get("author", [])
                if isinstance(author_names, list):
                    for auth in author_names:
                        auth_name = auth.get("authname", "")
                        if auth_name:
                            author_list.append(auth_name)
                elif isinstance(author_names, dict):
                    auth_name = author_names.get("authname", "")
                    if auth_name:
                        author_list.append(auth_name)
                
                if not author_list:
                    author_list = [creator] if creator else [researcher_name]
                    
                # Clean author names to match registry if applicable
                cleaned_author_list = []
                for name in author_list:
                    matched = False
                    # Extract individual tokens to prevent matching substrings (e.g. Kosuma matching Kosum)
                    name_tokens = [w.strip(".,").lower() for w in name.split()]
                    if researcher_name.split()[-1].lower() in name_tokens:
                        cleaned_author_list.append(researcher_name)
                        matched = True
                    if not matched:
                        cleaned_author_list.append(name)
                
                author_results.append({
                    "title": title,
                    "creator": researcher_name,
                    "creator_is_nu_affiliated": is_nu_affiliated,
                    "authors": cleaned_author_list,
                    "corresponding_author": creator if creator else researcher_name,
                    "departments": [researcher_dept],
                    "journal": journal,
                    "coverDate": cover_date,
                    "year": year,
                    "citations": citations,
                    "citations_scopus": citations,
                    "citations_pubmed": 0,
                    "doi": doi,
                    "quartile_scopus": q_scopus,
                    "quartile_scimago": q_scimago,
                    "databases": ["Scopus"]
                })
                
            total_results = int(search_results.get("opensearch:totalResults", 0))
            current_start = int(search_results.get("opensearch:startIndex", 0))
            items_per_page = int(search_results.get("opensearch:itemsPerPage", 0))
            
            print(f"  {researcher_name}: Fetched {len(author_results)} of {total_results} publications...")
            
            if current_start + items_per_page >= total_results or len(author_results) >= total_results:
                break
                
            start = current_start + items_per_page
            
        return author_results
    except Exception as e:
        print(f"  Error fetching data for author {author_id}: {e}")
        return []

def clean_pubmed_author_name(auth_name, researchers):
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
                
    if len(parts) > 1:
        clean_initials = parts[1].replace(".", "")
        initials_formatted = ".".join(list(clean_initials)) + "."
        return f"{parts[0]} {initials_formatted}"
    return auth_name

def fetch_pubmed_data_for_author(researcher_name, researcher_dept, status="Active", researchers=[]):
    """Fetches publications for a specific researcher name from PubMed."""
    print(f"Fetching publications for researcher: {researcher_name} (PubMed, Status: {status})...")
    parts = researcher_name.split()
    if len(parts) >= 2:
        term = f"{parts[-1]} {parts[0][0]}[Author] AND Naresuan[Affiliation]"
    else:
        term = f"{researcher_name}[Author] AND Naresuan[Affiliation]"

    search_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
    params = {
        "db": "pubmed",
        "term": term,
        "retmode": "json",
        "retmax": 25
    }
    
    pubmed_results = []
    try:
        resp = safe_request(search_url, params=params, timeout=15)
        if resp.status_code != 200:
            return []
            
        search_data = resp.json()
        id_list = search_data.get("esearchresult", {}).get("idlist", [])
        if not id_list:
            return []
            
        ids_str = ",".join(id_list)
        summary_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
        sum_params = {
            "db": "pubmed",
            "id": ids_str,
            "retmode": "json"
        }
        
        sum_resp = safe_request(summary_url, params=sum_params, timeout=15)
        if sum_resp.status_code != 200:
            return []
            
        summary_data = sum_resp.json()
        results_dict = summary_data.get("result", {})
        
        for pmid in id_list:
            uid_data = results_dict.get(pmid, {})
            if not uid_data or "title" not in uid_data:
                continue
                
            title = uid_data.get("title", "Unknown Title").strip()
            if title.endswith("."):
                title = title[:-1]
                
            journal = uid_data.get("source", "Unknown Source")
            pub_date = uid_data.get("pubdate", "")
            year = pub_date.split()[0] if pub_date else "Unknown Year"
            if len(year) > 4:
                year = year[:4]
                
            doi = ""
            for aid in uid_data.get("articleids", []):
                if aid.get("idtype") == "doi":
                    doi = aid.get("value", "")
                    break
                    
            issn = ""
            q_scopus = "N/A"
            q_scimago = "N/A"
            
            authors = uid_data.get("authors", [])
            author_list = []
            for a in authors:
                auth_name = a.get("name")
                if auth_name:
                    cleaned = clean_pubmed_author_name(auth_name, researchers)
                    author_list.append(cleaned)
                    
            cleaned_author_list = []
            for name in author_list:
                matched = False
                # Extract individual tokens to prevent matching substrings (e.g. Kosuma matching Kosum)
                name_tokens = [w.strip(".,").lower() for w in name.split()]
                if parts[-1].lower() in name_tokens:
                    cleaned_author_list.append(researcher_name)
                    matched = True
                if not matched:
                    cleaned_author_list.append(name)
                    
            if not cleaned_author_list:
                cleaned_author_list = [researcher_name]

            pubmed_results.append({
                "title": title,
                "creator": researcher_name,
                "creator_is_nu_affiliated": True,
                "authors": cleaned_author_list,
                "corresponding_author": researcher_name,
                "departments": [researcher_dept],
                "journal": journal,
                "coverDate": pub_date or f"{year}-01-01",
                "year": year,
                "citations": 0,
                "citations_scopus": 0,
                "citations_pubmed": 0,
                "doi": doi,
                "quartile_scopus": q_scopus,
                "quartile_scimago": q_scimago,
                "databases": ["PubMed"]
            })
            
    except Exception as e:
        print(f"  Error fetching PubMed data for {researcher_name}: {e}")
        
    return pubmed_results

def fetch_wos_data_for_author(wos_id, orcid_id, researcher_name, researcher_dept, status):
    """Fetches Web of Science publications via WoS API (if available) or ORCID."""
    wos_pubs = []
    if wos_id:
        print(f"Fetching WoS publications for researcher: {researcher_name} (WoS ID: {wos_id})...")
        # TODO: Implement official Clarivate WoS API fetch here when API Key is available
        pass
        
    if not wos_pubs and orcid_id:
        print(f"Fallback: Fetching WoS publications for researcher: {researcher_name} via ORCID: {orcid_id}...")
    url = f"https://pub.orcid.org/v3.0/{orcid_id}/works"
    headers = {"Accept": "application/json", "User-Agent": "Mozilla/5.0"}
    
    wos_pubs = []
    try:
        response = safe_request(url, headers=headers, timeout=15)
        if response.status_code != 200:
            return []
            
        data = response.json()
        works = data.get("group", [])
        
        for group in works:
            work_summaries = group.get("work-summary", [])
            for summary in work_summaries:
                source_name = summary.get("source", {}).get("source-name", {}).get("value", "")
                if source_name and any(x in source_name for x in ["ResearcherID", "Web of Science", "Publons"]):
                    title = summary.get("title", {}).get("title", {}).get("value", "")
                    
                    year = None
                    pub_date = summary.get("publication-date")
                    if pub_date and pub_date.get("year"):
                        year = pub_date.get("year").get("value")
                        
                    doi = ""
                    ext_ids = summary.get("external-ids", {}).get("external-id", [])
                    for ext_id in ext_ids:
                        if ext_id.get("external-id-type") == "doi":
                            doi = ext_id.get("external-id-value", "")
                            break
                            
                    journal = summary.get("journal-title", {}).get("value", "") if summary.get("journal-title") else ""
                    
                    # Fetch Quartiles
                    q_scopus, q_scimago = get_journal_quartiles("", journal)
                    
                    wos_pubs.append({
                        "title": title,
                        "creator": researcher_name,
                        "creator_is_nu_affiliated": True,
                        "authors": [researcher_name],
                        "corresponding_author": researcher_name,
                        "departments": [researcher_dept],
                        "journal": journal,
                        "coverDate": f"{year}-01-01" if year else "",
                        "year": str(year) if year else "",
                        "citations": 0,
                        "citations_scopus": 0,
                        "citations_pubmed": 0,
                        "doi": doi,
                        "quartile_scopus": q_scopus,
                        "quartile_scimago": q_scimago,
                        "databases": ["WoS"]
                    })
                    break
    except Exception as e:
        print(f"  Error fetching ORCID data for {researcher_name}: {e}")
        
    return wos_pubs

def main():
    # 1. Load registry list
    researchers = load_researchers()
    print(f"Loaded {len(researchers)} researchers from registry.")
    
    all_results = []
    scopus_success = True
    
    # 2. Loop and fetch publications for each researcher
    for res in researchers:
        status = res.get("status", "Active")
        
        # A. Fetch from Scopus
        res_pubs = fetch_scopus_data_for_author(res["author_id"], res["name"], res["department"], status, res.get("joinDate"), res.get("resignDate"))
        if len(res_pubs) > 0:
            all_results.extend(res_pubs)
        else:
            if res == researchers[0]:
                scopus_success = False
                
        # B. Fetch from PubMed
        pubmed_pubs = fetch_pubmed_data_for_author(res["name"], res.get("department"), status, researchers)
        if len(pubmed_pubs) > 0:
            all_results.extend(pubmed_pubs)
            
        # C. Fetch from ORCID (WoS)
        wos_pubs = fetch_wos_data_for_author(res.get("wosResearcherId"), res.get("orcid"), res["name"], res.get("department"), status)
        if len(wos_pubs) > 0:
            all_results.extend(wos_pubs)
            
        # Rate-limiting delay to prevent API blocks
        time.sleep(0.3)
                
    # 3. Deduplicate publications (using DOI or Title if DOI is empty)
    unique_docs = {}
    for doc in all_results:
        key = doc["doi"] if doc["doi"] else doc["title"].lower().strip()
        if key not in unique_docs:
            if "citations_scopus" not in doc:
                doc["citations_scopus"] = doc.get("citations", 0) if "Scopus" in doc.get("databases", []) else 0
            if "citations_pubmed" not in doc:
                doc["citations_pubmed"] = doc.get("citations", 0) if "PubMed" in doc.get("databases", []) else 0
            unique_docs[key] = doc
        else:
            # Merge departments lists if the same paper was fetched via multiple authors
            existing = unique_docs[key]
            merged_depts = list(set(existing.get("departments", []) + doc.get("departments", [])))
            existing["departments"] = merged_depts
            
            # Prefer longer or more complete authors list
            existing_authors = existing.get("authors", [])
            doc_authors = doc.get("authors", [])
            if len(doc_authors) > len(existing_authors):
                existing["authors"] = doc_authors
            elif len(doc_authors) == len(existing_authors):
                existing_fullness = sum(len(a) for a in existing_authors)
                doc_fullness = sum(len(a) for a in doc_authors)
                if doc_fullness > existing_fullness:
                    existing["authors"] = doc_authors
            
            # Merge database source tags
            existing_dbs = existing.get("databases", ["Scopus"])
            doc_dbs = doc.get("databases", ["Scopus"])
            existing["databases"] = list(set(existing_dbs + doc_dbs))
            
            # Merge and preserve separate citation counts
            scopus_cites = max(existing.get("citations_scopus", 0), doc.get("citations_scopus", 0))
            pubmed_cites = max(existing.get("citations_pubmed", 0), doc.get("citations_pubmed", 0))
            
            existing["citations_scopus"] = scopus_cites
            existing["citations_pubmed"] = pubmed_cites
            
            # The primary "citations" field uses the Scopus citation count if available, fallback to PubMed
            existing["citations"] = scopus_cites if "Scopus" in existing["databases"] else pubmed_cites
            
    final_results = list(unique_docs.values())
    
    # 4. Push results to API in batches
    data_to_push = final_results
        
    
    api_url = f"{BACKEND_URL}/api/publications/bulk-import"
    success_count = 0
    error_count = 0
    
    payloads = []
    for doc in data_to_push:
        authors_payload = []
        corresponding_author = doc.get("corresponding_author", "")
        creator_name = doc.get("creator", "")
        creator_is_nu_affiliated = doc.get("creator_is_nu_affiliated", False)
        
        for idx, auth_name in enumerate(doc.get("authors", [])):
            is_nu = creator_is_nu_affiliated if auth_name == creator_name else False
            authors_payload.append({
                "name": auth_name,
                "order": idx + 1,
                "isCorresponding": bool(corresponding_author and corresponding_author.lower() == auth_name.lower()),
                "isNuAffiliated": is_nu
            })
            
        try:
            year_val = int(doc.get("year", 0))
        except ValueError:
            year_val = 0
            
        payloads.append({
            "doi": doc.get("doi", ""),
            "title": doc.get("title", ""),
            "journal": doc.get("journal", ""),
            "year": year_val,
            "coverDate": doc.get("coverDate", ""),
            "quartile": doc.get("quartile_scopus", "N/A"),
            "quartile_scimago": doc.get("quartile_scimago", "N/A"),
            "status": "PUBLISHED",
            "authors": authors_payload,
            "databases": doc.get("databases", ["Scopus"]),
            "citations": doc.get("citations", 0)
        })

    batch_size = 50
    print(f"Pushing {len(payloads)} publications in batches of {batch_size} to {api_url}...")
    headers = {"Content-Type": "application/json", "X-User-Role": "ADMIN"}
    
    for i in range(0, len(payloads), batch_size):
        batch = payloads[i:i + batch_size]
        try:
            resp = requests.post(api_url, json=batch, headers=headers, timeout=30)
            if resp.status_code in (200, 201):
                res_data = resp.json()
                success_count += res_data.get("total", len(batch))
                print(f"  Batch {i//batch_size + 1}: Success ({len(batch)} items)")
            else:
                error_count += len(batch)
                print(f"  Batch {i//batch_size + 1}: Failed ({resp.status_code})")
        except Exception as e:
            error_count += len(batch)
            print(f"  Batch {i//batch_size + 1}: Exception {e}")
            
        time.sleep(1)

    print(f"API Push complete. Success: {success_count}, Errors: {error_count}")

