# Scopus Publications Metrics Enhancement Plan

## Overview
Enhance both Department and Faculty tabs with comprehensive metrics organized into three categories: Publications, Citations, and H-Index.

## Metrics Structure

### Publications Category
1. **Lifetime Publications** (existing) - Total publications across all staff
2. **Avg Lifetime Pubs per Staff** (existing) - Average per staff with Scopus
3. **Publication Spread** (rename from "Output Variability") - Std dev of publications across staff
4. **Top Performer (Publications)** - Staff member with most publications

### Citations Category
1. **Total Citations** (existing) - Sum of all citations
2. **Avg Citations per Staff** (NEW) - Average citations per staff with Scopus
3. **Citation Spread** (NEW) - Std dev of citations across staff
4. **Top Performer (Citations)** (NEW) - Staff member with most citations

### H-Index Category
1. **Average H-Index** (existing) - Mean H-Index of staff with H-Index > 0
2. **H-Index Spread** (NEW) - Std dev of H-Index across staff
3. **Top Performer (H-Index)** (rename from "Top Performer") - Staff with highest H-Index

## Implementation Steps

### 1. Update State (both tabs)
- [x] Department Tab
- [x] Faculty Tab

### 2. Calculate New Metrics (Faculty Tab)
- [x] Average Citations per Staff
- [x] Citation Std Dev
- [x] Top Publication Performer
- [x] Top Citation Performer
- [x] Rename topHIndexStaff to topHIndexPerformer

### 3. Calculate New Metrics (Department Tab)
- [x] Same as Faculty tab

### 4. Update UI - Checkboxes
- [x] Organize into 3 sections with headers and icons
- [x] Department Tab
- [x] Faculty Tab

### 5. Update UI - Metric Cards
- [x] Add conditional rendering for all new metrics
- [x] Department Tab
- [x] Faculty Tab

### 6. Update Conditional Checks
- [x] Include all new metrics in the visibility conditional


## Key Requirements
- **Only count staff with Scopus IDs** (scopusAuthorId && scopusAuthorId !== 'NA')
- **Consistent naming** across Department and Faculty tabs
- **Type safety** - add StaffMember type annotations where needed
