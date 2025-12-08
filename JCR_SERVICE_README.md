
# JCR Journal Impact Factor Lookup Service

This service provides fast, deterministic lookup of Journal Citation Report (JCR) metrics (JIF, Quartile, etc.) for journals across multiple years. It uses Supabase for storage and an in-memory Vercel cache for performance.

## 1. Setup & Data Data Structure

Ensure the JCR CSV files are placed in the following structure:

```
data/
  jcr/
    2020/
      JCR_2020.csv
    2021/
      JCR_2021.csv
    ...
    2024/
      JCR_2024.csv
```

## 2. Environment Variables

The service relies on the project's existing Supabase configuration. Ensure these are present in `.env` (or Vercel environment):

- `DATABASE_URL`: Connection string for Supabase (Transaction)
- `DIRECT_URL`: Connection string for Supabase (Session/Direct)

## 3. Importing Data

To import data for a specific year, run the following command:

```bash
# Example: Import 2024 data
npm run import:jcr -- 2024

# Example: Import 2023 data
npm run import:jcr -- 2023
```

This script:
- Reads the CSV from `data/jcr/<YEAR>/JCR_<YEAR>.csv`.
- Normalizes journal titles (lowercase, trimmed).
- Upserts metrics into the `jcr_journal_metrics` table in Supabase.

## 4. API Usage

The HTTP API is available at `/api/jcr/journal-metrics`.

### Endpoint
`POST /api/jcr/journal-metrics`

### Request Body
| Field | Type | Description |
|---|---|---|
| `issn` | string | Optional. ISSN (Print or Electronic) to search for. |
| `query` | string | Optional. Journal title to search for (if ISSN not provided or not found). |
| `years` | number[] | Optional. Array of years to return metrics for. If omitted, returns all available years. |

### Example 1: Lookup by ISSN (Two Years)
```bash
curl -X POST https://your-app-url.vercel.app/api/jcr/journal-metrics \
  -H "Content-Type: application/json" \
  -d '{
    "issn": "0007-9235",
    "years": [2023, 2024]
  }'
```

**Response:**
```json
{
  "found": true,
  "journal": {
    "fullTitle": "CA-A CANCER JOURNAL FOR CLINICIANS",
    "issnPrint": "0007-9235",
    "issnElectronic": "1542-4863"
  },
  "metrics": [
    {
      "year": 2023,
      "jifValue": 286.1,
      "bestQuartile": "Q1",
      "categories": [
        {
          "category": "ONCOLOGY",
          "edition": "SCIE",
          "jifQuartile": "Q1",
          "jifValue": 286.1
        }
      ]
    },
    ...
  ],
  "matchType": "issn"
}
```

### Example 2: Lookup by Title (Single Year)
```bash
curl -X POST https://your-app-url.vercel.app/api/jcr/journal-metrics \
  -H "Content-Type: application/json" \
  -d '{
    "query": "nature",
    "years": [2023]
  }'
```

### Example 3: Not Found
```bash
curl -X POST https://your-app-url.vercel.app/api/jcr/journal-metrics \
  -H "Content-Type: application/json" \
  -d '{
    "query": "nonexistent journal"
  }'
```

**Response:**
```json
{
  "found": false,
  "reason": "No matching journal for given ISSN or title"
}
```

## 5. Caching Strategy
The service loads all available metrics from Supabase into an in-memory cache on the first request to the API. Subsequent requests are served instantly from memory.
- **Cache Scope**: Per Vercel Serverless Function instance.
- **Initialization**: Lazy-loaded upon first request.
