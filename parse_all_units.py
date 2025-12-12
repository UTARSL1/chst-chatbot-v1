import re
import json
import os

HTML_FILE = r"c:\Users\ychum\.gemini\antigravity\scratch\chst-chatbot-v1\page_source_snippet.html"
UNITS_JSON_FILE = r"c:\Users\ychum\.gemini\antigravity\scratch\chst-chatbot-v1\utar-staff-mcp\mappings\units.json"

def parse_html(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Regex to find options
    pattern = re.compile(r'<option value="([^"]+)">([^<]+)</option>')
    matches = pattern.findall(content)
    
    units = []
    for value, text in matches:
        if value == "ALL":
            continue
        
        text = text.strip()
        value = value.strip()
        
        # Determine logical type
        unit_type = "Organisation Unit" # Default
        if "Faculty" in text:
            unit_type = "Faculty"
        elif "Institute" in text:
            unit_type = "Institute"
        elif "Centre" in text:
            unit_type = "Centre"
        elif "Division" in text:
            unit_type = "Administrative Division"
        elif "Department" in text:
            unit_type = "Administrative Department"
        elif "Office" in text:
            unit_type = "Administrative Office"
        elif "Library" in text:
            unit_type = "Library"
        elif "Chancellery" in text:
            unit_type = "Chancellery"
            
        units.append({
            "canonical": text,
            "acronym": value,
            "type": unit_type,
            "parent": None, # Top level
            "aliases": [text, value]
        })
    return units

def merge_units(new_units, existing_units_file):
    if os.path.exists(existing_units_file):
        with open(existing_units_file, "r", encoding="utf-8") as f:
            existing_units = json.load(f)
    else:
        existing_units = []

    # Create a map of existing units by canonical lower and acronym
    existing_map = {}
    for u in existing_units:
        existing_map[u["canonical"].lower()] = u
        if u.get("acronym"):
            existing_map[u["acronym"].lower()] = u

    added_count = 0
    updated_count = 0

    for new_u in new_units:
        key_canon = new_u["canonical"].lower()
        key_acro = new_u["acronym"].lower()
        
        match = None
        if key_canon in existing_map:
            match = existing_map[key_canon]
        elif key_acro in existing_map:
            match = existing_map[key_acro]
        
        if match:
            # Update existing
            # We trust the scraped acronym more than existing? Maybe.
            # If existing doesn't have acronym, add it.
            if not match.get("acronym") or match.get("acronym") == "NULL":
                match["acronym"] = new_u["acronym"]
                updated_count += 1
            
            # Update type if generic
            if match.get("type") == "Unknown" or match.get("type") == "Organisation Unit":
                match["type"] = new_u["type"]

            # Ensure aliases exist
            if "aliases" not in match:
                match["aliases"] = []
            if new_u["canonical"] not in match["aliases"]:
                match["aliases"].append(new_u["canonical"])
            if new_u["acronym"] not in match["aliases"]:
                match["aliases"].append(new_u["acronym"])
        else:
            # Add new
            existing_units.append(new_u)
            # Update map so we don't add duplicates if list has them? Unlikely for this list.
            existing_map[key_canon] = new_u
            added_count += 1

    with open(existing_units_file, "w", encoding="utf-8") as f:
        json.dump(existing_units, f, indent=4)

    print(f"Processed {len(new_units)} units from HTML.")
    print(f"Added {added_count} new units.")
    print(f"Updated {updated_count} existing units.")

if __name__ == "__main__":
    units = parse_html(HTML_FILE)
    merge_units(units, UNITS_JSON_FILE)
