import requests
from bs4 import BeautifulSoup
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
BASE_URL = "https://www2.utar.edu.my/staffListSearchV2.jsp"

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

def debug():
    try:
        r = requests.get(BASE_URL, headers=headers, verify=False)
        print(f"Status Code: {r.status_code}")
        print("First 1000 chars:")
        print(r.text[:1000])
        
        soup = BeautifulSoup(r.text, 'html.parser')
        select = soup.find('select', {'name': 'searchDiv'})
        print(f"Select found: {select is not None}")
        if select:
            print(f"Option count: {len(select.find_all('option'))}")
    except Exception as e:
        print(e)

debug()
