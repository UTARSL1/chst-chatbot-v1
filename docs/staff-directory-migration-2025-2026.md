# Staff Directory Migration: 2025 → 2026

## Overview

This document describes the staff directory archival and migration system implemented to support year-over-year comparisons of staff data.

## File Structure

### Current Files

| File | Purpose | Year | Last Updated |
|------|---------|------|--------------|
| `staff_directory.json` | Current/Active directory | 2026 | 2026-01-06 |
| `staff_directory_legacy_2025.json` | Archived 2025 data | 2025 | 2025-12-30 |
| `staff_directory_2025.json` | Old 2025 snapshot | 2025 | 2025-12-30 |

### Recommended Structure (Future)

For better organization, consider:
- `staff_directory.json` - Always the current year
- `staff_directory_archive/` - Folder containing:
  - `staff_directory_2025.json`
  - `staff_directory_2024.json`
  - etc.

## Scripts

### 1. Sync Fresh Data
**File**: `lib/tools/sync-2026-lkcfes.ts`

Scrapes fresh staff data for a specific faculty (currently LKC FES) and updates the main `staff_directory.json`.

```bash
npx tsx lib/tools/sync-2026-lkcfes.ts
```

### 2. Compare Years
**File**: `lib/tools/compare-2025-2026.ts`

Compares two staff directories and generates a detailed comparison report showing:
- Administrative position changes
- Designation changes (promotions/demotions)
- New hires and departures
- Staff count changes by faculty/department

```bash
npx tsx lib/tools/compare-2025-2026.ts
```

## Usage Examples

### Example Query 1: List Administrative Position Changes in LKC FES

**User Query**: "List the administrative position changes in LKC FES between 2025 and 2026"

**Expected Agent Action**:
1. Load `staff_directory_legacy_2025.json` (2025 data)
2. Load `staff_directory.json` (2026 data)
3. Run comparison focusing on `adminPostChanges`
4. Filter by faculty: `LKC FES`
5. Present results in table format

**Sample Output**:

| Name | Department | Added Posts | Removed Posts |
|------|------------|-------------|---------------|
| Ir. Prof. Dr. Chang Yoong Choon | D3E | Dean, Director (Xinwei Institute) | Head of Department (D3E) |
| Ir. Prof. Dr. Chee Pei Song | DMBE | Deputy Dean (R&D and Postgraduate Programmes) | Chairperson (CHST) |
| Ir Ts Dr Hum Yan Chai | DMBE | Chairperson (CHST) | - |

### Example Query 2: List Designation Changes in LKC FES

**User Query**: "List the designation changes in LKC FES between 2025 and 2026"

**Expected Agent Action**:
1. Load both directories
2. Run comparison focusing on `positionChanges`
3. Filter by faculty: `LKC FES`
4. Categorize by promotion/demotion/lateral
5. Present results in table format

**Sample Output**:

| Name | Department | Old Designation | New Designation | Change Type |
|------|------------|-----------------|-----------------|-------------|
| Ts Dr Shuit Siew Hoong | DCL | Assistant Professor | Associate Professor | Promotion |
| Ir Dr Chua Kein Huat | D3E | Associate Professor | Professor | Promotion |
| Ir Dr Lim Boon Han | D3E | Associate Professor | Professor | Promotion |

## LKC FES 2025 → 2026 Summary

### Statistics
- **Total Staff**: 1,284 (no change)
- **Promotions**: 9
- **Demotions**: 0
- **Administrative Changes**: 25
- **New Hires**: 0
- **Departures**: 0

### Major Leadership Changes

#### Dean Level
- **New Dean**: Ir. Prof. Dr. Chang Yoong Choon (previously Head of D3E)
- **Former Dean**: Prof Ts Dr Yap Wun She (now Chairperson of CAICA)

#### Deputy Dean
- **New Deputy Dean (R&D)**: Ir. Prof. Dr. Chee Pei Song
- **Former Deputy Dean (R&D)**: Ir Dr Ling Lloyd (position removed)

#### Department Heads
1. **D3E**: Ir Ts Dr Lee Ying Loong (new)
2. **DCI**: Ts Dr Chin Ren Jie (new, also promoted to Associate Professor)
3. **DS**: Sr Ibtisam Azwani Binti Mat Ya'acob (new)

#### Research Centre Chairpersons
1. **CHST**: Ir Ts Dr Hum Yan Chai (new)
2. **CAICA**: Prof Ts Dr Yap Wun She (new)
3. **CSDBE**: Ir Ts Dr Jeffrey Yap Boon Hui (new)

### Promotions by Department

| Department | Promotions |
|------------|-----------|
| DCL | 3 (2 to Assoc Prof, 1 to Prof) |
| D3E | 3 (1 to Assoc Prof, 2 to Prof) |
| DCI | 1 (to Assoc Prof) |
| DS | 1 (to Prof) |
| DC | 1 (to Assoc Prof) |

## Next Steps

### Stage 2: Sync All Faculties for 2026

To complete the 2026 data collection, sync the remaining faculties:

```typescript
// Create sync-2026-all-faculties.ts
const facultiesToSync = [
    'FAM', 'FAS', 'FCS', 'FCI', 'FEd', 'FEGT',
    'FICT', 'FSc', 'MK FMHS', 'THP FBF'
];

await syncStaffDirectory(facultiesToSync, logger);
```

### Stage 3: Integrate with Chatbot

Update the `utar_staff_search` tool to support year-based queries:

1. Add `year` parameter (optional, defaults to current year)
2. Load appropriate directory based on year
3. Support comparison queries like:
   - "Compare staff in D3E between 2025 and 2026"
   - "Who were promoted in LKC FES in 2026?"
   - "Show administrative changes in DMBE from 2025 to 2026"

### Stage 4: Automate Annual Archival

Create a workflow to automatically:
1. Archive current directory at year-end
2. Trigger fresh sync for new year
3. Generate year-over-year comparison reports

## Technical Notes

### Data Integrity
- Staff are matched by `searchId` (unique identifier)
- Administrative posts are compared as arrays
- Designation changes are classified using academic rank hierarchy

### Performance
- Comparison runs in O(n) time where n = number of staff
- Filtering is done in-memory (fast for current dataset size)
- Full comparison report generation takes < 1 second

### Limitations
- Currently only supports 2025 vs 2026 comparison
- No support for multi-year trend analysis yet
- Requires manual sync for each faculty

## Maintenance

### Annual Tasks (January)
1. Archive previous year's directory
2. Sync all faculties for new year
3. Generate comparison reports
4. Update documentation

### Monthly Tasks
- Spot-check for major changes
- Sync specific faculties if needed

### On-Demand
- Sync when users report outdated information
- Generate custom comparison reports
