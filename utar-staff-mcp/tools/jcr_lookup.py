
import requests
import os
from typing import List, Optional, Dict, Any

# Environment variable for the JCR Service API URL
# Default to local dev URL if not set
JCR_API_URL = os.getenv("JCR_API_URL", "http://localhost:3000/api/jcr/journal-metrics")

def get_jcr_metrics(query: Optional[str] = None, issn: Optional[str] = None, years: Optional[List[int]] = None) -> Dict[str, Any]:
    """
    Calls the JCR Lookup Service API.
    """
    payload = {}
    if query:
        payload["query"] = query
    if issn:
        payload["issn"] = issn
    if years:
        payload["years"] = years

    try:
        response = requests.post(JCR_API_URL, json=payload, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        print(f"Error calling JCR API: {e}")
        return {
            "found": False,
            "error": str(e),
            "reason": "Failed to contact JCR Service or service error."
        }
