#!/usr/bin/env python3
"""
Convert PDF files to Markdown using pymupdf4llm
Preserves table structure for better LLM responses
"""

import os
import sys
from pathlib import Path
import pymupdf4llm

def convert_pdf_to_markdown(pdf_path, output_dir):
    """Convert a single PDF to markdown using pymupdf4llm"""
    try:
        print(f"Converting {pdf_path}...")
        
        # Convert PDF to markdown
        md_text = pymupdf4llm.to_markdown(pdf_path)
        
        # Save markdown
        pdf_name = Path(pdf_path).stem
        output_path = Path(output_dir) / f"{pdf_name}.md"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(md_text)
        
        print(f"✓ Saved to {output_path}")
        print(f"  Length: {len(md_text)} characters")
        return str(output_path)
        
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return None

def main():
    if len(sys.argv) < 3:
        print("Usage: python convert-pdf-to-markdown.py <pdf_file> <output_dir>")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    output_dir = sys.argv[2]
    
    if not os.path.exists(pdf_path):
        print(f"Error: PDF file not found: {pdf_path}")
        sys.exit(1)
    
    convert_pdf_to_markdown(pdf_path, output_dir)

if __name__ == "__main__":
    main()
