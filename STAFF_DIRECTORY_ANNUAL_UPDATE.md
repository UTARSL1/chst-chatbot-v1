# Staff Directory - Annual Update Guide

## Current Version: 2026

**Last Updated:** January 21, 2026  
**Academic Year:** 2026  
**Total Staff:** 279 (LKC FES)

---

## 📅 Annual Update Process

This staff directory needs to be updated **annually** as faculty designations change (promotions, new hires, retirements, etc.).

### When to Update
- **Timing:** January each year (after new academic year appointments)
- **Trigger:** Staff promotions, new hires, departures

### How to Update

#### Step 1: Sync Latest Staff Data
```bash
# Run the staff directory sync script
npm run sync:staff
# or
npx tsx lib/tools/run-sync-local.ts
```

#### Step 2: Re-calculate Designation Statistics
```bash
# This adds/updates designation counts and lists
npx tsx lib/tools/add-designation-stats.ts
```

#### Step 3: Clean Encoding Issues
```bash
# Remove any encoding artifacts (Â characters, etc.)
npx tsx lib/tools/clean-encoding.ts
```

#### Step 4: Update Year Metadata
```powershell
# Update the academic year in metadata
$json = Get-Content "lib\tools\staff_directory.json" -Raw | ConvertFrom-Json
$json.metadata.academicYear = "2027"  # Update year
$json.metadata.designationStatsYear = "2027"
$json.metadata.lastUpdated = (Get-Date -Format "o")
$json | ConvertTo-Json -Depth 100 | Set-Content "lib\tools\staff_directory.json" -Encoding UTF8
```

#### Step 5: Verify Data
```bash
# Run test suite to verify counts
npx tsx lib/tools/test-designation-queries.ts
```

#### Step 6: Archive Previous Year
```bash
# Create backup of previous year's data
cp lib/tools/staff_directory.json lib/tools/staff_directory_2026.json
```

---

## 🔍 What Changes Annually

### Expected Changes
1. **Promotions**
   - Assistant → Associate Professor
   - Associate → Professor
   - Professor → Senior Professor

2. **New Hires**
   - New faculty members added
   - Designation counts increase

3. **Departures**
   - Retirements (may become Emeritus)
   - Resignations
   - Designation counts decrease

4. **Administrative Changes**
   - New Deans, Heads of Department
   - Research Centre appointments

### Data That Updates
- ✅ `designationCounts` - All counts recalculated
- ✅ `designationLists` - Staff names and emails updated
- ✅ `staffCount` - Total staff per department/faculty
- ✅ `lastUpdated` - Timestamp of last sync
- ✅ `academicYear` - Current academic year

---

## 📊 2026 Baseline Statistics

### LKC FES Designation Breakdown
```
Senior Professor:      6
Professor:            14
Emeritus Professor:    1
Associate Professor:  48
Assistant Professor: 101
Adjunct Professor:    12
Lecturer:             40
Other:                57
─────────────────────────
TOTAL:               279
```

### Key Departments (2026)
- **D3E:** 6 Professors + 5 Senior Professors = 11 senior faculty
- **DCL:** 12 Associate Professors (highest)
- **DMBE:** 1 Professor + 1 Senior Professor + 5 Associate Professors

---

## 🔄 Comparison with Previous Years

### 2025 → 2026 Changes
*(To be documented after 2027 update)*

### Expected 2026 → 2027 Changes
- Monitor promotion cycles (typically announced Dec/Jan)
- Track new faculty hires
- Update emeritus status for retirees

---

## ⚠️ Important Notes

1. **Backup First:** Always create a backup before updating
   ```bash
   cp lib/tools/staff_directory.json lib/tools/staff_directory_backup_$(date +%Y%m%d).json
   ```

2. **Verify Counts:** After updating, verify total counts match official records
   ```powershell
   $json = Get-Content "lib\tools\staff_directory.json" -Raw | ConvertFrom-Json
   $json.faculties.'LKC FES'.designationCounts
   ```

3. **Test Queries:** Run all 10 test cases in `DESIGNATION_QUERY_TESTS.md`

4. **Update Documentation:** Update test cases with new expected values

---

## 📝 Checklist for Annual Update

- [ ] Backup current staff_directory.json
- [ ] Run staff sync script
- [ ] Re-calculate designation stats
- [ ] Clean encoding issues
- [ ] Update year metadata
- [ ] Verify total counts
- [ ] Run test suite
- [ ] Update DESIGNATION_QUERY_TESTS.md with new values
- [ ] Archive previous year's data
- [ ] Document major changes (promotions, new hires)

---

## 🆘 Troubleshooting

### Issue: Counts don't match official records
**Solution:** Re-run the sync script and verify source data

### Issue: Encoding artifacts (Â characters)
**Solution:** Run `npx tsx lib/tools/clean-encoding.ts`

### Issue: Missing designation data
**Solution:** Re-run `npx tsx lib/tools/add-designation-stats.ts`

### Issue: Test cases failing
**Solution:** Update expected values in DESIGNATION_QUERY_TESTS.md

---

## 📞 Contact

For questions about the annual update process, contact the system administrator.

**Last Updated By:** System  
**Date:** January 21, 2026
