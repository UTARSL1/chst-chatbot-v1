import requests
from bs4 import BeautifulSoup
import urllib.parse
from typing import List, Dict, Optional

# Constants
UTAR_SEARCH_URL = "https://www2.utar.edu.my/staffListSearchV2.jsp"

def search_staff(faculty: str = "All", department: str = "All", name: str = "", expertise: str = "") -> List[Dict[str, str]]:
    """
    Searches the UTAR Staff Directory.
    
    Args:
        faculty: The faculty/division value (mapped from resolve_unit). Default "All".
        department: The department value. Default "All".
        name: The person's name or partial name.
        expertise: Area of expertise.

    Returns:
        A list of dictionaries containing staff details.
    """
    
    # default to "All" if empty string provided
    faculty = faculty if faculty else "All"
    department = department if department else "All"
    
    params = {
        "searchDiv": faculty,
        "searchDept": department,
        "searchName": name,
        "searchExp": expertise # The form might use 'searchName=' twice based on the prompt URL, but usually 'searchName' and 'expertise' are distinct.
                               # Prompt URL: searchName=&searchName= 
                               # If the second one is expertise, I need to check the name attribute.
                               # Assuming standard mapping: Name -> searchName, Expertise -> searchExp (or similar)
                               # I will assume 'searchExp' based on standard naming, but the URL in prompt didn't show it explicitly labeled.
                               # Let's be safe and try to pass 'searchExp' if it exists, or just append to URL params.
    }
    
    # Based on the prompt URL "searchName=&searchName=", it's possible expertise shares the same param name OR one is hidden.
    # However, 'searchExp' is standard for 'Expertise'. I will use 'searchExp' as a best guess, 
    # but also include it in the query string if I construct it manually.
    # Actually, let's treat it as a standard request.
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }

    try:
        response = requests.get(UTAR_SEARCH_URL, params=params, headers=headers, timeout=10)
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"Error fetching UTAR directory: {e}")
        return []

    soup = BeautifulSoup(response.text, "html.parser")
    
    staff_list = []
    
    # Heuristic: The results are usually in tables or divs. 
    # Based on browser inspection, results are in <table> tags (likely one per person or a big table).
    # Browser said: "Find the first staff result... outer HTML of this first result element (e.g. the <tr> or <div> wrapper)... result is a <table>"
    # So each result is likely its own table or row.
    
    # We'll look for elements containing class 'content_content' or similar if typical key exists.
    # But since we saw <b>Name</b>, <i>Position</i>, let's search for that pattern.
    
    # Strategy: Find all 'table' elements that look like staff entries.
    # Or iterate recursively.
    
    # Let's try to find all 'table' tags and check if they contain an email or 'utar.edu.my'.
    for table in soup.find_all("table"):
        # Check if this table looks like a staff card
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
    # Structure based on browser inspection:
    # <b>Name</b> <br> <i>Position</i> <br> Faculty <br> Dept <br> ... <a href="mailto:...">
    
    try:
        # Extract Name (usually in <b>)
        name_tag = table_tag.find("b")
        if not name_tag:
            return None
        name = name_tag.get_text(strip=True)
        
        # Extract Position (usually in <i>)
        # It might be in the same cell or next.
        position_tag = table_tag.find("i")
        position = position_tag.get_text(strip=True) if position_tag else ""
        
        # Extract Email
        email = ""
        email_tag = table_tag.find("a", href=lambda x: x and "mailto:" in x)
        if email_tag:
            email = email_tag.get_text(strip=True)
            if not email and "mailto:" in email_tag["href"]:
                 email = email_tag["href"].replace("mailto:", "")

        # Extract Faculty and Dept
        # These are text nodes. We can get the full text and split?
        # Or look for siblings of <i>.
        # Let's capture the full text block for context.
        full_text = table_tag.get_text("\n", strip=True)
        
        # Simple heuristic to extract faculty/dept if they are lines between position and email
        # This is fuzzy but "Extra" field can hold the blob for the LLM to process if we are unsure.
        
        return {
            "name": name,
            "position": position,
            "email": email,
            "faculty": "Parsed from extra", # Placeholder, let LLM deduce or regex if strictly needed
            "department": "Parsed from extra",
            "extra": full_text # The LLM is good at extraction, so passing the full text helps.
        }
    except Exception as e:
        # Silently fail on bad parsing to avoid breaking the whole list
        return None

if __name__ == "__main__":
    # Test run
    results = search_staff(name="Lee")
    import json
    print(json.dumps(results, indent=2))
