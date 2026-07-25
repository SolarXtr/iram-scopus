import os
import sys

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

found = []
for root, dirs, files in os.walk(r"D:\0GGCloud\1TKNU\My Drive"):
    for file in files:
        if file.lower() == "template_citation.xlsx":
            full_path = os.path.join(root, file)
            print(f"FOUND: {full_path}")
            found.append(full_path)

if not found:
    print("Not found template_citation.xlsx recursively.")
