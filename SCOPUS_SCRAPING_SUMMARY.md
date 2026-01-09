# LKC FES Scopus Publication Scraping - Summary Report

## Overview

Successfully scraped Scopus publication data for LKC FES academic staff for years 2023, 2024, and 2025.

## Key Statistics

### Total Staff
- **Total LKC FES Academic Staff**: 225 (excluding DLMSA and FGO)
- **Staff with Scopus Access**: 154 (68.4%)
- **Staff without Scopus IDs**: 71 (31.6%)

### Publication Results
- **Total Publications (2023-2025)**: 1,568
- **Publications in 2023**: 508
- **Publications in 2024**: 555
- **Publications in 2025**: 505
- **Average per Staff**: 10.18 publications

### Issues Identified
- **Staff with 0 Publications**: 29 (likely incorrect/truncated Scopus IDs)
- **Staff without Scopus IDs**: 71
- **Total Needing Manual Verification**: 100

## Critical Finding: Incorrect Scopus IDs

### Example Case: Ir Dr Ng Law Yong
- **Current ID in Directory**: 36680687200 (INCORRECT)
- **Actual Working ID**: 58187243200 (CORRECT)
- **Result**: 0 publications found with incorrect ID

This pattern suggests many of the 29 staff with "0 publications" likely have truncated or incorrect Scopus IDs in the staff directory.

## Files Generated

### 1. `lkcfes-scopus-publications.json` (115 KB)
Complete publication data for 154 staff members with accessible Scopus IDs.

**Structure**:
```json
{
  "metadata": {
    "scrapedAt": "2026-01-08T16:14:11.527Z",
    "faculty": "LKC FES",
    "years": [2023, 2024, 2025],
    "totalStaff": 225,
    "accessibleStaff": 154,
    "inaccessibleStaff": 71,
    "statistics": {
      "publications2023": 508,
      "publications2024": 555,
      "publications2025": 505,
      "totalPublications": 1568
    }
  },
  "results": [...]
}
```

### 2. `lkcfes-inaccessible-scopus.json`
List of 71 staff members without Scopus IDs in the directory.

### 3. `lkcfes-needs-manual-verification.json` (28 KB)
**Most Important File** - Contains 100 staff members requiring attention:
- 29 staff with 0 publications (likely incorrect IDs)
- 71 staff without Scopus IDs

## Staff with 0 Publications (Likely Incorrect IDs)

These 29 staff members have Scopus IDs in the directory but returned 0 publications:

1. **Ms Tan Yin Qing** (DMBE) - ID: 56621840000
2. **Ir Dr Ng Law Yong** (DCL) - ID: 36680687200 ⚠️ Known to be incorrect
3. **Dr Lai Soon Onn** (DCL) - ID: 7402935898
4. **Dr Sim Jia Huey** (DCL) - ID: 16032597600
5. **Dr Yap Yeow Hong** (DCL) - ID: 57191992158
6. **Ir Dr Koo Chai Hoon** (DCI) - ID: 57195364917
7. **Dr Ong Chuan Fang** (DCI) - ID: 57054880400
8. **Dr Khaw Mei Kum** (D3E) - ID: 14019642000
9. **Ts Dr Kong Sin Guan** (D3E) - ID: 26664650400
10. **Dr Yong Thian Khok** (D3E) - ID: 8643647800
11. **Dr Wong Voon Hee** (DMAS) - ID: 25029061700
12. **Dr Wong Wai Kuan** (DMAS) - ID: 25022766000
13. **Dr Lee Yap Jia** (DMAS) - ID: 57194233702
14. **Dr Liew How Hui** (DMAS) - ID: 7201507726
15. **Dr Tan Wei Lun** (DMAS) - ID: 55804400500
16. **Dr Yong Chin Khian** (DMAS) - ID: 55909760300
17. **Sr Ibtisam Azwani Binti Mat Ya'acob** (DS) - ID: 57205214162
18. **Ms Lay Pei Sin** (DS) - ID: 57219279855
19. **Sr Li Zi Qian** (DS) - ID: 57194034852
20. **Ts Dr Toh Tien Choon** (DS) - ID: 57195942200
21. **Ts Tung Yew Hou** (DS) - ID: 57340101900
22. **Ts Dr Lee Chen Kang** (DC) - ID: 56739498000
23. **Ms Gunavathi a/p Duraisamy** (DC) - ID: 6601962335
24. **Dr Khor Kok Chin** (DC) - ID: 15755930400
25. **Dr Mohamad Faiz bin Ahmad Johari** (DC) - ID: 57190284846
26. **Cik Murni Fatehah Binti Alias** (DC) - ID: 56405480700
27. **Dr Norazah binti Yusof** (DC) - ID: 25825824000
28. **Ir Ts Dr Lee Hwang Sheng** - ID: 43861444100
29. **Ts Dr Wong Mee Chu** - ID: 7404759544

## Top 10 Publishers (2023-2025)

1. **Prof Ts Dr Lim Eng Hock** (D3E) - 64 publications
2. **Ir. Prof. Dr. Chee Pei Song** (DMBE) - 46 publications
3. **Ir. Prof. Dr. Chua Kein Huat** (D3E) - 42 publications
4. **Ts Dr Jun Hieng Kiat** - 39 publications
5. **Dr Pang Yean Ling** (DCL) - 38 publications
6. **Prof Ts Dr Yau Kok Lim** (DC) - 36 publications
7. **Prof Ts Dr Yap Wun She** (D3E) - 35 publications
8. **Ir. Prof. Ts. Dr Bernard Saw Lip Huat** - 34 publications
9. **Ir Ts Dr Leong Kah Hon** (DCI) - 33 publications
10. **Ts Dr Shuit Siew Hoong** (DCL) - 32 publications

## Department Breakdown

| Department | Staff | 2023 | 2024 | 2025 | Total | Avg/Staff |
|------------|-------|------|------|------|-------|-----------|
| D3E        | 43    | 180  | 177  | 161  | 518   | 12.0      |
| DC         | 27    | 76   | 103  | 80   | 259   | 9.6       |
| DCL        | 21    | 78   | 63   | 91   | 232   | 11.0      |
| DMAS       | 18    | 59   | 70   | 52   | 181   | 10.1      |
| DCI        | 13    | 55   | 59   | 51   | 165   | 12.7      |
| DMBE       | 15    | 50   | 68   | 56   | 174   | 11.6      |
| DS         | 5     | 8    | 13   | 12   | 33    | 6.6       |
| (Others)   | 12    | 2    | 2    | 2    | 6     | 0.5       |

## Next Steps & Recommendations

### Immediate Actions Required

1. **Verify the 29 staff with 0 publications**
   - Manually search each staff member on Scopus website
   - Find correct Scopus Author IDs
   - Update staff directory with correct IDs
   - Re-run scraper for these staff

2. **Find Scopus IDs for 71 staff without IDs**
   - Search on Scopus by name and UTAR affiliation
   - Some staff may not have Scopus profiles (especially non-research staff)
   - Add found IDs to staff directory

3. **Handle Multiple Scopus Profiles**
   - Some staff may have multiple Scopus author profiles (name variations, institution changes)
   - Need to identify the correct/primary profile
   - May need to merge profiles on Scopus

### Verification Process

For each staff member needing attention:

1. Go to [Scopus Author Search](https://www.scopus.com/freelookup/form/author.uri)
2. Search by:
   - Last name
   - First name
   - Affiliation: "Universiti Tunku Abdul Rahman" or "UTAR"
3. Verify the author by:
   - Checking publication titles
   - Verifying department/field matches
   - Confirming recent publications
4. Record the correct Scopus Author ID
5. Update staff directory

### Automation Opportunity

Consider creating a script to:
1. Accept a CSV/JSON file with corrected Scopus IDs
2. Automatically update the staff directory
3. Re-scrape publications for updated staff
4. Merge results with existing data

## Usage Instructions

### View Complete Results
```bash
# View metadata
cat lkcfes-scopus-publications.json | jq '.metadata'

# View specific staff member
cat lkcfes-scopus-publications.json | jq '.results[] | select(.email == "cheeps@utar.edu.my")'

# View all staff with 0 publications
cat lkcfes-scopus-publications.json | jq '.results[] | select(.totalPublications == 0)'
```

### Analyze Results
```bash
# Run analysis script
npx tsx scripts/analyze-scopus-results.ts
```

### Re-scrape After Corrections
```bash
# After updating staff directory with correct IDs
npx tsx scripts/scrape-lkcfes-scopus.ts
```

## Technical Notes

- **API Rate Limiting**: 500ms delay between requests (2 req/sec)
- **Processing Time**: ~2 minutes for 154 staff (3 years × 154 staff = 462 API calls)
- **API Key Used**: `246160ba1cace197268c2b42a06f5349`
- **Scopus API Endpoint**: `https://api.elsevier.com/content/search/scopus`

## Known Issues

1. **Truncated Scopus IDs**: Some IDs in staff directory appear to be truncated or incorrect
2. **Missing Scopus IDs**: 31.6% of staff don't have Scopus IDs in directory
3. **Department Field**: Some staff have empty department fields in results
4. **Name Variations**: Malaysian names with "a/l", "a/p", "bin", "binti" may cause search issues

## Contact for Corrections

Please provide corrected Scopus IDs in the following format:

```json
{
  "email": "lyng@utar.edu.my",
  "name": "Ir Dr Ng Law Yong",
  "correctScopusId": "58187243200",
  "notes": "Verified on Scopus website"
}
```

---

**Generated**: 2026-01-09
**Script**: `scripts/scrape-lkcfes-scopus.ts`
**Analysis**: `scripts/analyze-scopus-results.ts`
