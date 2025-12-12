import requests
from bs4 import BeautifulSoup
import urllib.parse
from typing import List, Dict, Optional
import json
import os
import urllib3

# Constants
UTAR_SEARCH_URL = "https://www2.utar.edu.my/staffListSearchV2.jsp"

# Load units for resolution
UNITS_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "mappings", "units.json")
UNITS_CACHE = []

def load_units():
    global UNITS_CACHE
    if not UNITS_CACHE and os.path.exists(UNITS_FILE):
        try:
            with open(UNITS_FILE, "r", encoding="utf-8") as f:
                UNITS_CACHE = json.load(f)
        except Exception as e:
            print(f"Error loading units.json: {e}")

def get_acronym(name: str) -> str:
    """
    Resolves a name (canonical or alias) to its acronym.
    Returns the original name if no match found or if it's already an acronym.
    """
    if not name or name.lower() == "all":
        return "ALL" # The server uses 'ALL' for default
        
    load_units()
    name_lower = name.lower()
    
    for unit in UNITS_CACHE:
        # Check canonical
        if unit.get("canonical", "").lower() == name_lower:
            return unit.get("acronym") or name
        # Check acronym
        if unit.get("acronym", "").lower() == name_lower:
            return unit.get("acronym")
        # Check aliases
        if "aliases" in unit:
            for alias in unit["aliases"]:
                if alias.lower() == name_lower:
                    return unit.get("acronym") or name
    
    return name

def search_staff(faculty: str = "All", department: str = "All", name: str = "", expertise: str = "") -> List[Dict[str, str]]:
    """
    Searches the UTAR Staff Directory.
    
    Args:
        faculty: The Top-Level Unit (Faculty/Division/Centre).
        department: The Sub-Level Unit (Department).
        name: The person's name query.
        expertise: Area of expertise query.

    Returns:
        A list of dictionaries containing staff details.
    """
    
    # Resolve names to acronyms if possible
    faculty_code = get_acronym(faculty)
    
    # Department code logic
    department_code = get_acronym(department) if department.lower() != "all" else "ALL"
    
    # Construct parameters as a list of tuples to handle duplicate keys
    params = [
        ("searchDept", faculty_code),
        ("searchDiv", department_code),
        ("searchName", name),
        ("searchName", expertise),
        ("searchResult", "Y")
    ]
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }

    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

    try:
        response = requests.get(UTAR_SEARCH_URL, params=params, headers=headers, timeout=10, verify=False)
        response.raise_for_status()

    except requests.RequestException as e:
        print(f"Error fetching UTAR directory: {e}")
        return []

    soup = BeautifulSoup(response.text, "html.parser")
    
    # Debug info
    if "No Record Found" in response.text:
       print(f"DEBUG: Server returned 'No Record Found' for params: {params}")

    staff_list = []
    
    tables = soup.find_all("table")
    print(f"DEBUG: Found {len(tables)} tables.")
    
    for table in tables:
        text_content = table.get_text(" ", strip=True)
        # print(f"DEBUG Table Text: {text_content[:50]}...")
        text_content = table.get_text(" ", strip=True)
        if "@utar.edu.my" not in text_content and "mailto:" not in str(table):
            continue
            
        entry = parse_staff_card(table)
        if entry:
            staff_list.append(entry)

    return staff_list

def parse_staff_card(table_tag) -> Optional[Dict[str, str]]:
    """
    Parses a single staff entry table.
    """
    try:
        name_tag = table_tag.find("b")
        if not name_tag:
            return None
        name = name_tag.get_text(strip=True)
        
        position_tag = table_tag.find("i")
        position = position_tag.get_text(strip=True) if position_tag else ""
        
        email = ""
        email_tag = table_tag.find("a", href=lambda x: x and "mailto:" in x)
        if email_tag:
            email = email_tag.get_text(strip=True)
            if not email and "mailto:" in email_tag["href"]:
                 email = email_tag["href"].replace("mailto:", "")

        full_text = table_tag.get_text("\n", strip=True)
        
        return {
            "name": name,
            "position": position,
            "email": email,
            "faculty": "Parsed from extra",
            "department": "Parsed from extra",
            "extra": full_text
        }
    except Exception as e:
        return None

if __name__ == "__main__":
    # Test run
    print("Testing search for DHR...")
    
    # Debug resolution
    fac = get_acronym("Division of Human Resource")
    print(f"Resolved Faculty: {fac}")
    
    results = search_staff(faculty="Division of Human Resource")
    print(f"Found {len(results)} staff in DHR.")
    if results:
        print(results[0])
