import json
import os
from typing import Optional, Dict, Any, List, Tuple
# Try importing thefuzz, otherwise fallback to basic string matching (or install it)
try:
    from thefuzz import process, fuzz
except ImportError:
    process = None
    fuzz = None

class UnitResolver:
    def __init__(self, mapping_file: str):
        self.mapping_file = mapping_file
        self.units = self._load_mappings()
        self._prepare_lookup_index()

    def _load_mappings(self) -> List[Dict[str, Any]]:
        if not os.path.exists(self.mapping_file):
            raise FileNotFoundError(f"Mapping file not found: {self.mapping_file}")
        with open(self.mapping_file, 'r', encoding='utf-8') as f:
            return json.load(f)

    def _prepare_lookup_index(self):
        # Create a dictionary mapping searchable keys (normalized) to their canonical unit dict
        self.search_index = {}
        # List of all choice strings for fuzzy matching
        self.choices = []
        
        for unit in self.units:
            # Canonical
            canonical = unit["canonical"]
            self._add_to_index(canonical, unit)
            
            # Acronym
            if unit.get("acronym"):
                self._add_to_index(unit["acronym"], unit)
            
            # Aliases
            for alias in unit.get("aliases", []):
                self._add_to_index(alias, unit)

    def _add_to_index(self, key: str, unit: Dict[str, Any]):
        key_lower = key.lower().strip()
        if key_lower not in self.search_index:
            self.search_index[key_lower] = unit
            self.choices.append(key) # Keep original case for fuzzy matcher

    def resolve(self, query: str) -> Dict[str, Any]:
        """
        Resolves a query string to the best matching UTAR unit.
        Prioritizes:
        1. Exact match (case-insensitive)
        2. Highest similarity fuzzy match (Token Sort Ratio)
        """
        query = query.strip()
        if not query:
             return {
                "canonical": "",
                "acronym": None,
                "type": None,
                "detail": "Empty query"
            }

        query_lower = query.lower()

        # 1. Exact Match (Case-Insensitive)
        if query_lower in self.search_index:
            return self._format_result(self.search_index[query_lower])

        # 2. Fuzzy Match
        if process:
            # We search against the self.choices list (original strings)
            # scorer=fuzz.token_sort_ratio handles out of order words well and gives high scores for partials
            # extractOne returns (match, score)
            best_match_info = process.extractOne(query, self.choices, scorer=fuzz.token_sort_ratio)
            
            if best_match_info:
                best_match_str, score = best_match_info
                
                # We can adjust threshold if needed, but "Highest similarity" implies taking the top one.
                # However, completely irrelevant queries shouldn't return a match.
                # Let's set a low sanity threshold (e.g. 40) or just return the best.
                # User asked to "Choose the highest similarity match".
                if score > 50: 
                    unit = self.search_index.get(best_match_str.lower())
                    if unit:
                        return self._format_result(unit)

        # Fallback to simple substring if fuzzy failed or not installed (shouldn't happen with requirements)
        # or score was too low (though "highest" implies we might take a low one, typically <50 is garbage)
        # Let's do a quick substring check as valid backup
        for choice in self.choices:
            if query_lower in choice.lower() or choice.lower() in query_lower:
                 # Prefer matches where query covers a significant portion or vice versa
                 if len(query_lower) > 3: # Avoid matching short garbage
                     return self._format_result(self.search_index[choice.lower()])

        # If absolutely nothing found
        return {
            "canonical": query, # Return original if no resolution to allow pass-through
            "acronym": None,
            "type": None,
            "error": "No confident match found"
        }

    def _format_result(self, unit: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "canonical": unit["canonical"],
            "acronym": unit.get("acronym"),
            "type": unit.get("type")
        }

# Usage
if __name__ == "__main__":
    resolver = UnitResolver("../mappings/units.json")
    print("Exact (CCR):", resolver.resolve("CCR"))
    print("Fuzzy (cancer researc):", resolver.resolve("cancer researc"))
    print("Typo (LKC FEC):", resolver.resolve("LKC FEC")) # Should match LKC FES
