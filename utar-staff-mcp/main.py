from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import uvicorn
import os
import sys

# Add current directory to path so we can import tools
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from tools.resolve_unit import UnitResolver
from tools.staff_search import search_staff

app = FastAPI(title="UTAR Staff Directory MCP Server", version="1.0.0")

# Initialize Resolver
# Assuming mappings/units.json is relative to this file
MAPPING_FILE = os.path.join(os.path.dirname(__file__), "mappings", "units.json")
resolver = UnitResolver(MAPPING_FILE)

# --- Pydantic Models ---

class ResolveUnitRequest(BaseModel):
    query: str = Field(..., description="The acronym or fuzzy name of the faculty/centre to resolve.")

class ResolveUnitResponse(BaseModel):
    canonical: str
    acronym: Optional[str] = None
    type: Optional[str] = None
    detail: Optional[str] = None

class StaffSearchRequest(BaseModel):
    faculty: Optional[str] = Field("All", description="Canonical faculty name from resolve_unit.")
    department: Optional[str] = Field("All", description="Department name.")
    name: Optional[str] = Field("", description="Staff name.")
    expertise: Optional[str] = Field("", description="Area of expertise.")

class StaffParamsResponse(BaseModel):
    # This matches the user request for "Translate natural-language queries into the actual UTAR form parameters"
    # Although the tool performs the search, we can also just return parameters if needed.
    # But the prompt says "Return a clean list of staff entries".
    pass

# --- Endpoints ---

@app.get("/")
def read_root():
    return {"status": "running", "service": "UTAR Staff Directory MCP"}

@app.post("/tools/utar_resolve_unit", response_model=Dict[str, Any])
def resolve_unit(request: ResolveUnitRequest):
    """
    Normalises acronyms or fuzzy user input into canonical UTAR unit names.
    """
    try:
        result = resolver.resolve(request.query)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/tools/utar_staff_search", response_model=List[Dict[str, str]])
def staff_search_endpoint(request: StaffSearchRequest):
    """
    Mirrors the UTAR search form and returns scraped results.
    """
    try:
        # Map fields to searchable params
        # Note: If 'faculty' is empty in request, default to "All"
        faculty = request.faculty if request.faculty else "All"
        department = request.department if request.department else "All"
        
        results = search_staff(
            faculty=faculty,
            department=department,
            name=request.name,
            expertise=request.expertise
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/mcp/manifest")
def get_manifest():
    """
    Returns the MCP tool definitions for the client/LLM to consume.
    """
    return {
        "tools": [
            {
                "name": "utar_resolve_unit",
                "description": "Resolves a unit acronym or partial name (e.g. 'CCR', 'Engineering') to the canonical form for searching.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "The acronym or name to resolve."}
                    },
                    "required": ["query"]
                }
            },
            {
                "name": "utar_staff_search",
                "description": "Searches the UTAR Staff Directory using canonical parameters. resolving the unit first is recommended.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "faculty": {"type": "string", "description": "Canonical faculty/centre name (use 'All' if unknown)."},
                        "department": {"type": "string", "description": "Department name (optional, default 'All')."},
                        "name": {"type": "string", "description": "Staff name query."},
                        "expertise": {"type": "string", "description": "Area of expertise query."}
                    }
                }
            }
        ]
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
