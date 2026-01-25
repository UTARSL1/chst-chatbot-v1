# 5 Quick Test Prompts - Designation Queries (2026)

## Test These in Your Chatbot

---

### ✅ Test 1: Basic Count Query
**Prompt:**
```
How many professors and senior professors are in LKC FES?
```

**Expected Answer:**
- **14 Professors**
- **6 Senior Professors**
- **Total: 20 Professors and Senior Professors**

---

### ✅ Test 2: List All Staff with Designation
**Prompt:**
```
List all senior professors in LKC FES
```

**Expected Answer:** (6 Senior Professors)
1. Ir. Prof. Dr. Goi Bok Min (goibm@utar.edu.my)
2. Prof. Dr Chong Kok Keong (chongkk@utar.edu.my)
3. Ir. Prof. Dato' Dr. Ewe Hong Tat (eweht@utar.edu.my)
4. Prof Ts Dr Lim Eng Hock (limeh@utar.edu.my)
5. Ir. Prof. Dr. Lim Yun Seng (yslim@utar.edu.my)
6. Prof. Dr Yan Lei (yanlei@utar.edu.my)

**Note:** Should return names AND emails, not just a count.

---

### ✅ Test 3: Department-Level Query
**Prompt:**
```
How many associate professors are in DMBE?
```

**Expected Answer:**
- **5 Associate Professors**
- Department: Department of Mechatronics and BioMedical Engineering (DMBE)

---

### ✅ Test 4: Cross-Department Comparison
**Prompt:**
```
Compare the number of professors across all departments in LKC FES
```

**Expected Answer:**
Departments with Professors (should show breakdown):
- **D3E** (Electrical and Electronic Engineering): **6 Professors** (highest)
- **DC** (Chemistry): **2 Professors**
- **DMBE, DCI, DS, DMME**: **1 Professor each**
- Other departments: **0 Professors**

**Bonus:** D3E also has **5 Senior Professors**, making it the department with the most senior faculty.

---

### ✅ Test 5: Complete Breakdown
**Prompt:**
```
What is the total staff breakdown by designation in LKC FES?
```

**Expected Answer:**
Lee Kong Chian Faculty of Engineering and Science - Designation Breakdown:
- Senior Professor: **6**
- Professor: **14**
- Emeritus Professor: **1**
- Associate Professor: **48**
- Assistant Professor: **101**
- Adjunct Professor: **12**
- Lecturer: **40**
- Other: **57**
- **TOTAL: 279 staff members**

---

## ✅ Success Criteria

For each test:
1. ✅ **Correct Count** - Numbers match expected values
2. ✅ **Complete List** - When asking to "list", should return names AND emails
3. ✅ **No Encoding Issues** - No "Â" characters in names
4. ✅ **Fast Response** - Should be instant (pre-calculated data)
5. ✅ **Proper Attribution** - Should mention department/faculty names

---

## 🔍 What to Check

### If Test Fails:
1. **Wrong count?** → Check if designation stats were calculated correctly
2. **Missing names?** → Check if query is using `designationLists` not just `designationCounts`
3. **Encoding issues?** → Re-run `npx tsx lib/tools/clean-encoding.ts`
4. **Slow response?** → Check if using pre-calculated metadata vs filtering

### Verification Command:
```powershell
$json = Get-Content "lib\tools\staff_directory.json" -Raw | ConvertFrom-Json
$lkcfes = $json.faculties.'LKC FES'

# Verify Test 1
Write-Host "Professors: $($lkcfes.designationCounts.Professor)"
Write-Host "Senior Professors: $($lkcfes.designationCounts.'Senior Professor')"

# Verify Test 2
$lkcfes.designationLists.'Senior Professor' | Format-Table name, email

# Verify Test 3
Write-Host "DMBE Associate Professors: $($lkcfes.departments.DMBE.designationCounts.'Associate Professor')"
```

---

**Data Version:** 2026  
**Last Updated:** January 21, 2026  
**Status:** ✅ All values verified
