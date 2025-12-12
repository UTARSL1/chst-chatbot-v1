import requests
from bs4 import BeautifulSoup

def c():
    url = "https://www2.utar.edu.my/staffListSearchV2.jsp"
    params = {"searchDiv": "FEGT"} # Faculty of Engineering and Green Technology
    
    try:
        r = requests.get(url, params=params)
        soup = BeautifulSoup(r.text, 'html.parser')
        
        # Find the second dropdown (searchDept)
        dept_select = soup.find('select', {'name': 'searchDept'})
        if dept_select:
            options = [o.text.strip() for o in dept_select.find_all('option')]
            print("Found departments:", options)
        else:
            print("Could not find searchDept select element.")
            
    except Exception as e:
        print(e)

c()
