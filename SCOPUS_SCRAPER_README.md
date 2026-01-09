# Scopus Publication Scraper

This script scrapes publication counts from Scopus for UTAR staff members who have Scopus author profiles.

## Features

- ✅ Scrapes publication counts by year (e.g., 2025)
- ✅ Filters by faculty (optional)
- ✅ Handles rate limiting automatically
- ✅ Retries failed requests
- ✅ Exports results to JSON
- ✅ Shows detailed progress and statistics
- ✅ Identifies top publishers

## Prerequisites

1. **Scopus API Key**: You need a valid Scopus API key from [https://dev.elsevier.com/](https://dev.elsevier.com/)
2. **Staff Directory**: The script reads from `lib/tools/staff_directory.json`

## Setup

### 1. Add API Key to Environment

Add your Scopus API key to your `.env` file:

```bash
SCOPUS_API_KEY="your-scopus-api-key-here"
```

Alternatively, the script has the API key hardcoded as a fallback (not recommended for production).

### 2. Install Dependencies

The script uses built-in Node.js modules and TypeScript. Make sure you have `tsx` installed:

```bash
npm install -g tsx
```

## Usage

### Basic Usage - Scrape 2025 Publications

```bash
npx tsx scripts/scrape-scopus-publications.ts --year 2025
```

### Filter by Faculty

```bash
npx tsx scripts/scrape-scopus-publications.ts --year 2025 --faculty "LKC FES"
```

### Save Results to File

```bash
npx tsx scripts/scrape-scopus-publications.ts --year 2025 --output scopus-2025-results.json
```

### Combined Example

```bash
npx tsx scripts/scrape-scopus-publications.ts --year 2025 --faculty "LKC FES" --output lkcfes-2025.json
```

## Command Line Arguments

| Argument | Description | Default | Example |
|----------|-------------|---------|---------|
| `--year` | Publication year to query | `2025` | `--year 2024` |
| `--faculty` | Filter by faculty acronym | All faculties | `--faculty "LKC FES"` |
| `--output` | Output JSON file path | Console only | `--output results.json` |

## Output Format

### Console Output

The script displays:
- Progress for each staff member
- Scopus Author ID extraction
- Publication count for each staff
- Summary statistics
- Top 10 publishers

Example:
```
[1/540] Ir. Prof. Dr. Chee Pei Song (cheeps@utar.edu.my)
  Faculty: LKC FES, Department: DMBE
  Scopus Author ID: 37012425700
  Querying Scopus for Author ID 37012425700, Year 2025...
  ✅ Publications in 2025: 3
```

### JSON Output

When using `--output`, the script generates a JSON file with:

```json
{
  "metadata": {
    "scrapedAt": "2026-01-08T15:42:00.000Z",
    "year": 2025,
    "facultyFilter": "all",
    "totalStaff": 540,
    "successCount": 535,
    "errorCount": 5,
    "totalPublications": 1250,
    "averagePublications": 2.34
  },
  "results": [
    {
      "searchId": "15106",
      "name": "Ir. Prof. Dr. Chee Pei Song",
      "email": "cheeps@utar.edu.my",
      "faculty": "LKC FES",
      "department": "DMBE",
      "scopusAuthorId": "37012425700",
      "year": 2025,
      "publicationCount": 3,
      "success": true
    }
  ]
}
```

## Rate Limiting

The script implements rate limiting to comply with Scopus API limits:
- **Delay**: 500ms between requests (2 requests per second)
- **Retry Logic**: Automatically retries up to 3 times if rate limited (HTTP 429)
- **Backoff**: 5-second wait before retrying

## Error Handling

The script handles various error scenarios:

1. **Missing Scopus URL**: Staff without `scopusUrl` are skipped
2. **Invalid Author ID**: If Author ID cannot be extracted from URL
3. **API Errors**: HTTP errors, network issues, etc.
4. **Rate Limiting**: Automatic retry with backoff

All errors are logged and included in the final statistics.

## Performance

- **Processing Time**: ~500ms per staff member (due to rate limiting)
- **540 staff members**: ~4.5 minutes total
- **100 staff members**: ~50 seconds

## Example Use Cases

### 1. Annual Publication Report

Generate a comprehensive report for all staff in 2025:

```bash
npx tsx scripts/scrape-scopus-publications.ts --year 2025 --output annual-report-2025.json
```

### 2. Faculty-Specific Analysis

Analyze publications for a specific faculty:

```bash
npx tsx scripts/scrape-scopus-publications.ts --year 2025 --faculty "FICT" --output fict-2025.json
```

### 3. Multi-Year Comparison

Run the script for multiple years:

```bash
npx tsx scripts/scrape-scopus-publications.ts --year 2023 --output scopus-2023.json
npx tsx scripts/scrape-scopus-publications.ts --year 2024 --output scopus-2024.json
npx tsx scripts/scrape-scopus-publications.ts --year 2025 --output scopus-2025.json
```

## Integration with Staff Directory

To add publication counts back to your staff directory, you can:

1. Run the script and save results to JSON
2. Create a separate script to merge the results
3. Update the staff directory with publication counts

Example merge script (to be created):

```typescript
// scripts/merge-scopus-data.ts
import fs from 'fs';

const scopusResults = JSON.parse(fs.readFileSync('scopus-2025.json', 'utf-8'));
const staffDirectory = JSON.parse(fs.readFileSync('lib/tools/staff_directory.json', 'utf-8'));

// Merge logic here...
```

## Troubleshooting

### API Key Issues

If you get authentication errors:
1. Verify your API key is correct
2. Check if your API key is active at [https://dev.elsevier.com/](https://dev.elsevier.com/)
3. Ensure your institution has Scopus access

### Rate Limiting

If you're getting too many 429 errors:
1. Increase `RATE_LIMIT_DELAY_MS` in the script (default: 500ms)
2. Reduce the number of staff by using `--faculty` filter

### No Results

If publication counts are 0:
1. Verify the Scopus Author ID is correct
2. Check if publications exist for that year on Scopus website
3. Note: Scopus may still be indexing recent publications

## API Documentation

- **Scopus Search API**: [https://dev.elsevier.com/documentation/SCOPUSSearchAPI.wadl](https://dev.elsevier.com/documentation/SCOPUSSearchAPI.wadl)
- **Search Query Tips**: [https://dev.elsevier.com/documentation/search/SCOPUSSearchTips.htm](https://dev.elsevier.com/documentation/search/SCOPUSSearchTips.htm)

## Notes

- The script only queries for **publication counts**, not full publication details
- This is much faster and uses fewer API quota
- For full publication details, modify the `count` parameter in the API call

## Future Enhancements

Potential improvements:
- [ ] Fetch full publication details (title, journal, citations)
- [ ] Store results in Supabase database
- [ ] Create a web UI for viewing results
- [ ] Schedule automatic monthly scraping
- [ ] Compare year-over-year trends
- [ ] Export to CSV/Excel format
