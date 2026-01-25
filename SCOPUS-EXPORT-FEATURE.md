# Scopus Publication Details Export Feature

## Overview
This feature allows users to export detailed publication metadata from the Scopus API to CSV format. It supports exporting publications for individual staff members, departments, or entire faculties with flexible duplicate handling options.

## Implementation Status
✅ **Phase 1: DMBE Department Pilot** - COMPLETED

### Components Created

1. **API Route**: `/app/api/scopus-publications/publication-details/route.ts`
   - Fetches complete publication metadata from Scopus API
   - Supports individual, department, and faculty-level queries
   - Includes year filtering (selected years or lifetime)
   - Implements rate limiting and retry logic

2. **CSV Export Utility**: `/lib/scopus/csv-exporter.ts`
   - Converts publication data to CSV format
   - Handles duplicate removal based on EID/DOI
   - Provides browser download functionality
   - Generates descriptive filenames

3. **UI Component**: New "Export Publications" tab in Scopus Publications Dashboard
   - Scope selection (Individual/Department/Faculty)
   - Year range selection (specific years or lifetime)
   - Duplicate handling toggle (with duplicates or unique only)
   - Preview table showing first 10 publications
   - Real-time export status updates

## Features

### Export Scopes
- **Individual Staff**: Export publications for a single staff member
- **Department**: Export publications for all staff in a department (e.g., DMBE)
- **Faculty**: Export publications for all staff in a faculty (e.g., LKC FES)

### Year Filtering
- **Selected Years**: Export only publications from years 2023, 2024, 2025 (configurable)
- **Lifetime**: Export all publications regardless of year

### Duplicate Handling
- **With Duplicates**: Co-authored papers appear once per author
  - Example: If 3 DMBE staff co-author a paper, it appears 3 times in the CSV
  - Useful for tracking individual contributions
  
- **Unique Only**: Each paper appears only once
  - Example: If 3 DMBE staff co-author a paper, it appears 1 time in the CSV
  - Useful for department/faculty publication counts

## CSV Export Fields

The exported CSV includes all available Scopus metadata:

| Field | Description |
|-------|-------------|
| Scopus ID | Unique Scopus identifier |
| EID | Electronic Identifier |
| DOI | Digital Object Identifier |
| Title | Publication title |
| Authors | All authors (semicolon-separated) |
| Author IDs | Scopus Author IDs (semicolon-separated) |
| Publication Year | Year of publication |
| Source Title | Journal/Conference name |
| Volume | Volume number |
| Issue | Issue number |
| Page Range | Page numbers |
| Citation Count | Number of citations |
| Abstract | Publication abstract |
| Keywords | Author keywords (semicolon-separated) |
| Document Type | Article, Conference Paper, Review, etc. |
| Affiliations | Author affiliations (semicolon-separated) |
| Open Access | Yes/No |
| Funding Agency | Funding sources (semicolon-separated) |
| Subject Areas | Research areas (semicolon-separated) |
| ISSN | International Standard Serial Number |
| ISBN | International Standard Book Number |
| Publisher | Publisher name |
| Aggregation Type | Journal, Conference Proceeding, Book, etc. |
| Cover Date | Publication date |
| Publication Name | Full publication name |
| Scopus Link | Direct link to Scopus record |
| Staff Name | UTAR staff member name |
| Staff Email | UTAR staff member email |
| Staff Department | Department acronym |

## Usage Instructions

### For DMBE Department (Pilot)

1. Navigate to **Scopus Publications Dashboard**
2. Select **LKC FES** faculty
3. Select **DMBE** department
4. Click on the **EXPORT_PUBLICATIONS** tab
5. Configure export settings:
   - **Scope**: Choose Individual/Department/Faculty
   - **Staff**: Select staff member (if Individual scope)
   - **Year Range**: Toggle lifetime or use selected years
   - **Duplicate Handling**: Choose "With Duplicates" or "Unique Only"
6. Click **EXPORT TO CSV**
7. Wait for processing (status updates will appear)
8. CSV file will automatically download
9. Preview table shows first 10 publications

### Example Filenames
- `scopus-publications-individual-dr-john-doe-2023-2024-2025-with-duplicates-2026-01-22.csv`
- `scopus-publications-department-dmbe-lifetime-unique-2026-01-22.csv`
- `scopus-publications-faculty-lkc-fes-2023-2024-2025-with-duplicates-2026-01-22.csv`

## Technical Details

### API Endpoint
```
GET /api/scopus-publications/publication-details
```

**Query Parameters:**
- `scope`: 'individual' | 'department' | 'faculty'
- `department`: Department acronym (required for individual/department scope)
- `faculty`: Faculty acronym (default: 'LKC FES')
- `staffEmail`: Staff email (required for individual scope)
- `years`: Comma-separated years or 'lifetime'

**Response:**
```json
{
  "success": true,
  "publications": [...],
  "metadata": {
    "scope": "department",
    "department": "DMBE",
    "faculty": "LKC FES",
    "years": [2023, 2024, 2025],
    "totalPublications": 150,
    "staffCount": 23
  }
}
```

### Rate Limiting
- 500ms delay between Scopus API requests
- Maximum 3 retries on rate limit errors
- Automatic 5-second backoff on 429 responses

### Performance Considerations
- Export time depends on number of staff members and publications
- DMBE (23 staff): ~12-15 seconds for lifetime export
- Faculty-level exports may take several minutes

## Future Enhancements

### Phase 2: Expand to Other Departments
- [ ] Enable export for all LKC FES departments
- [ ] Test with larger departments (DASD, DMME, etc.)

### Phase 3: Faculty-Wide Support
- [ ] Implement faculty-level export for LKC FES
- [ ] Optimize for large-scale exports (100+ staff)

### Phase 4: Additional Features
- [ ] Excel export format (.xlsx)
- [ ] JSON export format
- [ ] Advanced filtering (by journal, citation count, etc.)
- [ ] Scheduled exports
- [ ] Email delivery of export files
- [ ] Publication analytics dashboard

## Testing Checklist

### DMBE Department Testing
- [ ] Individual staff export (with duplicates)
- [ ] Individual staff export (unique only)
- [ ] Department export for selected years (2023-2025)
- [ ] Department export for lifetime
- [ ] Department export with duplicates
- [ ] Department export unique only
- [ ] Verify CSV format and field accuracy
- [ ] Test with staff having 0 publications
- [ ] Test with staff having 100+ publications
- [ ] Verify duplicate removal logic

## Known Limitations

1. **Scopus API Quota**: Limited by Scopus API rate limits and quotas
2. **Browser Memory**: Very large exports (1000+ publications) may cause browser slowdown
3. **Current Scope**: Only LKC FES data is available
4. **No Caching**: Each export makes fresh API calls (ensures latest data)

## Troubleshooting

### Export Fails
- Check Scopus API key is valid
- Verify staff has valid Scopus Author ID
- Check browser console for error messages

### Missing Publications
- Ensure staff Scopus ID is correct
- Verify publication year is within selected range
- Check if publication is indexed in Scopus

### Duplicate Count Mismatch
- "With Duplicates" count = sum of all staff publications
- "Unique Only" count = distinct publications (by EID/DOI)
- Co-authored papers within same department are deduplicated in "Unique Only" mode

## Support
For issues or questions, contact the development team or refer to the main Scopus Dashboard documentation.
