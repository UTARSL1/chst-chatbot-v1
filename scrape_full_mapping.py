import requests
from bs4 import BeautifulSoup
import csv
import urllib3

# Suppress SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

BASE_URL = "https://www2.utar.edu.my/staffListSearchV2.jsp"

def scrape_all():
    print("Fetching main page to get Faculty list...")
    try:
        # Get main page to extract searchDiv options
        r = requests.get(BASE_URL, verify=False)
        soup = BeautifulSoup(r.text, 'html.parser')
        
        div_select = soup.find('select', {'name': 'searchDiv'})
        if not div_select:
            print("Error: Could not find Faculty dropdown.")
            return

        # Extract all faculty codes (skip "All")
        faculties = []
        for opt in div_select.find_all('option'):
            val = opt.get('value')
            text = opt.text.strip()
            if val and val != 'All' and val != '':
                faculties.append((val, text))
        
        print(f"Found {len(faculties)} faculties/units. Starting scrape...")
        
        all_mappings = []

        for code, faculty_name in faculties:
            print(f"Scraping: {faculty_name} ({code})")
            
            # Fetch page with searchDiv selected
            # Note: Usually these forms use GET parameters. 
            r_dept = requests.get(BASE_URL, params={'searchDiv': code}, verify=False)
            soup_dept = BeautifulSoup(r_dept.text, 'html.parser')
            
            dept_select = soup_dept.find('select', {'name': 'searchDept'})
            if dept_select:
                options = dept_select.find_all('option')
                count = 0
                for opt in options:
                    dept_name = opt.text.strip()
                    dept_val = opt.get('value')
                    
                    if dept_name and dept_name != 'All' and dept_val != 'All':
                        # Add to list
                        all_mappings.append({
                            "Department": dept_name,
                            "Faculty": faculty_name,
                            "Acronym": "NULL" # Will try to generate or leave NULL
                        })
                        count += 1
                print(f"  -> Found {count} departments")
            else:
                print("  -> No departments found.")
        
        # Save to CSV
        print("Saving to department_mapping_full.csv...")
        with open('department_mapping_full.csv', 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=["Department", "Faculty", "Acronym"])
            writer.writeheader()
            for row in all_mappings:
                writer.writerow(row)
                
        print("Done!")

    except Exception as e:
        print(f"Fatal Error: {e}")

if __name__ == "__main__":
    scrape_all()
