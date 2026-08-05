import csv
import json
import urllib.request
import urllib.error

def clean_issn(issn_str):
    return issn_str.strip().replace("-", "")

def main():
    csv_file = "scimagojr2025csv.csv"
    endpoint_url = "https://iram-backend.tinnakornh.workers.dev/api/reference/journals"
    batch_size = 200
    
    payload_batch = []
    total_processed = 0
    total_sent = 0
    
    try:
        with open(csv_file, newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f, delimiter=',')
            for row in reader:
                raw_issns = row.get('Issn', '')
                quartile = row.get('SJR Best Quartile', '').strip()
                if not quartile:
                    quartile = "N/A"
                    
                if not raw_issns:
                    continue
                    
                issns = raw_issns.split(',')
                for issn in issns:
                    cleaned = clean_issn(issn)
                    if cleaned:
                        payload = {
                            "issn": cleaned,
                            "source": "SJR",
                            "quartile": quartile,
                            "year": 2025
                        }
                        payload_batch.append(payload)
                        total_processed += 1
                        
                        if len(payload_batch) >= batch_size:
                            send_batch(endpoint_url, payload_batch)
                            total_sent += len(payload_batch)
                            payload_batch = []
                            print(f"Progress: Sent {total_sent} records...")
                            
            # Send any remaining payloads in the last batch
            if payload_batch:
                send_batch(endpoint_url, payload_batch)
                total_sent += len(payload_batch)
                print(f"Progress: Sent {total_sent} records... (Final batch)")
                
        print(f"Finished processing. Total records parsed: {total_processed}, Total sent: {total_sent}")
        
    except FileNotFoundError:
        print(f"Error: Could not find the file {csv_file}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

import time

def send_batch(url, batch):
    data = json.dumps(batch).encode('utf-8')
    headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    req = urllib.request.Request(url, data=data, headers=headers, method='POST')
    
    time.sleep(0.5) # Sleep to avoid rate limiting

    
    try:
        with urllib.request.urlopen(req) as response:
            if response.status not in (200, 201):
                print(f"Warning: Unexpected status code {response.status}")
    except urllib.error.HTTPError as e:
        print(f"HTTPError while sending batch: {e.code} - {e.reason}")
        try:
            print(f"Response body: {e.read().decode('utf-8')}")
        except Exception:
            pass
    except urllib.error.URLError as e:
        print(f"URLError while sending batch: {e.reason}")
    except Exception as e:
        print(f"Error sending batch: {e}")

if __name__ == "__main__":
    main()
