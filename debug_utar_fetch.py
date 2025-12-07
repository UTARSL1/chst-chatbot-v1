import requests
from bs4 import BeautifulSoup
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

url = "https://www2.utar.edu.my/staffListSearchV2.jsp"
params = {
    "searchDept": "CCSN",
    "searchDiv": "All",
    "searchName": "",
    "searchExpertise": "",
    "searchResult": "Y" 
}

print(f"Fetching {url} with params: {params}")
response = requests.get(url, params=params, verify=False)
print(f"Status Code: {response.status_code}")

soup = BeautifulSoup(response.text, 'html.parser')
tables = soup.find_all('table')

found_staff = False
for table in tables:
    text = table.get_text()
    if '@utar.edu.my' in text or 'mailto:' in str(table):
        print("--- Found Staff Table ---")
        print(text.strip()[:200]) # Print first 200 chars
        found_staff = True

if not found_staff:
    print("NO staff found for CCSN (with searchResult=Y).")
else:
    print("Found staff for CCSN!")
