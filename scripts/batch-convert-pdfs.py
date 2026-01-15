#!/usr/bin/env python3
"""
Batch convert all PDF files in a directory to Markdown
"""

import os
import sys
from pathlib import Path
import pymupdf4llm

def convert_all_pdfs(input_dir, output_dir):
    """Convert all PDFs in input directory to markdown"""
    input_path = Path(input_dir)
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Find all PDF files
    pdf_files = list(input_path.glob("*.pdf"))
    
    if not pdf_files:
        print(f"No PDF files found in {input_dir}")
        return
    
    print(f"\n📄 Found {len(pdf_files)} PDF files to convert\n")
    
    success_count = 0
    error_count = 0
    
    for pdf_file in pdf_files:
        try:
            print(f"  Converting {pdf_file.name}...")
            
            # Convert to markdown
            md_text = pymupdf4llm.to_markdown(str(pdf_file))
            
            # Save markdown
            md_file = output_path / f"{pdf_file.stem}.md"
            with open(md_file, 'w', encoding='utf-8') as f:
                f.write(md_text)
            
            print(f"  ✓ Saved to {md_file.name} ({len(md_text)} chars)")
            success_count += 1
            
        except Exception as e:
            print(f"  ✗ Error: {e}")
            error_count += 1
    
    print(f"\n✅ Conversion complete!")
    print(f"   Success: {success_count}")
    print(f"   Errors: {error_count}")
    print(f"   Output: {output_path}")

def main():
    if len(sys.argv) < 3:
        print("Usage: python batch-convert-pdfs.py <input_dir> <output_dir>")
        sys.exit(1)
    
    input_dir = sys.argv[1]
    output_dir = sys.argv[2]
    
    if not os.path.exists(input_dir):
        print(f"Error: Input directory not found: {input_dir}")
        sys.exit(1)
    
    convert_all_pdfs(input_dir, output_dir)

if __name__ == "__main__":
    main()
