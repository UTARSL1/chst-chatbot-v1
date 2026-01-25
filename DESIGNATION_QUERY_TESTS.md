# Designation Query Test Cases - LKC FES

**Academic Year:** 2026  
**Data as of:** January 21, 2026  
**Note:** These values will change annually with promotions and staff changes.

---

## 10 Test Prompts with Expected Answers

### Test 1: Count Associate Professors in DMBE
**Prompt:** "How many associate professors are in DMBE?"

**Expected Answer:**
- **5 Associate Professors**
- Department: Department of Mechatronics and BioMedical Engineering (LKC FES)

---

### Test 2: Count Professors and Senior Professors in LKC FES
**Prompt:** "How many professors and senior professors are in LKC FES?"

**Expected Answer:**
- **14 Professors**
- **6 Senior Professors**
- **Total: 20 Professors and Senior Professors**

---

### Test 3: List All Professors in LKC FES
**Prompt:** "List all professors in LKC FES"

**Expected Answer:** (14 Professors)
1. Ir. Prof. Dr. Chee Pei Song (cheeps@utar.edu.my)
2. Prof. Dr Yamuna a/p Munusamy (yamunam@utar.edu.my)
3. Ir. Prof. Dr. Huang Yuk Feng (huangyf@utar.edu.my)
4. Ir. Prof. Dr. Khoo Hooi Ling @ Lai Hooi Ling (khoohl@utar.edu.my)
5. Ir. Prof. Dr. Chang Yoong Choon (ycchang@utar.edu.my)
6. Ir. Prof. Dr. Chua Kein Huat (chuakh@utar.edu.my)
7. Ir. Prof. Dr. Chung Boon Kuan (chungbk@utar.edu.my)
8. Ir. Prof. Dr. Lim Boon Han (limbhan@utar.edu.my)
9. Prof Ts Dr Yap Wun She (yapws@utar.edu.my)
10. Ir. Prof. Dr. Yow Ho Kwang (yowhk@utar.edu.my)
11. Ir. Prof. Ts. Dr Jeffrey Yap Boon Hui (bhyap@utar.edu.my)
12. Prof. Dr Azizah binti Abd Manaf (azizahm@utar.edu.my)
13. Prof Ts Dr Yau Kok Lim (yaukl@utar.edu.my)
14. Ir. Prof. Ts. Dr Bernard Saw Lip Huat (sawlh@utar.edu.my)

---

### Test 4: List All Senior Professors in LKC FES
**Prompt:** "List all senior professors in LKC FES"

**Expected Answer:** (6 Senior Professors)
1. Ir. Prof. Dr. Goi Bok Min (goibm@utar.edu.my)
2. Prof. Dr Chong Kok Keong (chongkk@utar.edu.my)
3. Ir. Prof. Dato' Dr. Ewe Hong Tat (eweht@utar.edu.my)
4. Prof Ts Dr Lim Eng Hock (limeh@utar.edu.my)
5. Ir. Prof. Dr. Lim Yun Seng (yslim@utar.edu.my)
6. Prof. Dr Yan Lei (yanlei@utar.edu.my)

---

### Test 5: Compare Professors Across Departments in LKC FES
**Prompt:** "Compare the number of professors across all departments in LKC FES"

**Expected Answer:**
Departments with Professors (ranked by count):
- **D3E** (Department of Electrical and Electronic Engineering): **6 Professors** (highest)
- **DMBE** (Department of Mechatronics and BioMedical Engineering): **1 Professor**
- **DCI** (Department of Computer and Information Sciences): **1 Professor**
- **DC** (Department of Chemistry): **2 Professors**
- **DS** (Department of Science): **1 Professor**
- **DMME** (Department of Mechanical and Material Engineering): **1 Professor**
- Other departments: 0 Professors

Note: D3E also has **5 Senior Professors**, making it the department with the most senior faculty.

---

### Test 6: Count Assistant Professors in D3E
**Prompt:** "How many assistant professors are in D3E?"

**Expected Answer:**
- **10 Assistant Professors**
- Department: Department of Electrical and Electronic Engineering (D3E), LKC FES

---

### Test 7: Count Lecturers in Department of Chemistry
**Prompt:** "How many lecturers are in the Department of Chemistry?"

**Expected Answer:**
- **4 Lecturers**
- Department: Department of Chemistry (DC), LKC FES

---

### Test 8: All Designation Statistics for DMBE
**Prompt:** "Show me all designation statistics for DMBE"

**Expected Answer:**
Department of Mechatronics and BioMedical Engineering (DMBE):
- **Senior Professor:** 1
- **Professor:** 1
- **Associate Professor:** 5
- **Assistant Professor:** 10
- **Lecturer:** 2
- **Total: 19 staff members**

---

### Test 9: Compare Associate Professors Across LKC FES Departments
**Prompt:** "Compare the number of associate professors across all departments in LKC FES"

**Expected Answer:**
Top departments with Associate Professors (ranked):
1. **DCL** (Department of Chemical Engineering): **12 Associate Professors**
2. **D3E** (Department of Electrical and Electronic Engineering): **9 Associate Professors**
3. **DMME** (Department of Mechanical and Material Engineering): **7 Associate Professors**
4. **DCI** (Department of Computer and Information Sciences): **7 Associate Professors**
5. **DMBE** (Department of Mechatronics and BioMedical Engineering): **5 Associate Professors**

Summary: **8 out of 11 departments** have Associate Professors

---

### Test 10: Total Staff Breakdown by Designation in LKC FES
**Prompt:** "What is the total staff breakdown by designation in LKC FES?"

**Expected Answer:**
Lee Kong Chian Faculty of Engineering and Science - Complete Designation Breakdown:
- **Senior Professor:** 6
- **Professor:** 14
- **Emeritus Professor:** 1
- **Associate Professor:** 48
- **Assistant Professor:** 101
- **Adjunct Professor:** 12
- **Lecturer:** 40
- **Other:** 57
- **TOTAL: 279 staff members**

Key Insights:
- Assistant Professors form the largest group (36%)
- Associate Professors are the second largest (17%)
- Combined Professors and Senior Professors: 20 (7%)

---

### Test 11: List Large Group (>30) - Assistant Professors in LKC FES
**Prompt:** "List all assistant professors in LKC FES"

**Expected Answer:**
- **Status:** Should show **preview of first 10** + **CSV Download Link**
- **Count:** 101 Assistant Professors
- **Message:** "There are 101 Assistant Professors. Showing first 10... Download the CSV for the full list."
- **Reason:** Count > 30 threshold logic triggers CSV generation.

---

### Test 12: Table Summary Verification (Deterministic Stats)
**Prompt:** "Summarize the number of lecturer, assistant professor, associate professors, professors, senior professors in LKCFES, in table."

**Expected Answer:**
Table with EXACT counts (sourced from pre-calculated metadata):
| Designation | Count |
| :--- | :--- |
| Senior Professor | **6** (Must be 6, not 8) |
| Professor | **14** |
| Associate Professor | **48** |
| Assistant Professor | **101** |
| Lecturer | **40** |

**Note:** If Senior Professor shows 8, it means the bot is hallucinating/recounting manually. It must show 6.


## Verification Commands

### Quick verification in PowerShell:
```powershell
# Load the data
$json = Get-Content "lib\tools\staff_directory.json" -Raw | ConvertFrom-Json
$lkcfes = $json.faculties.'LKC FES'

# Test 1: DMBE Associate Professors
$lkcfes.departments.DMBE.designationCounts.'Associate Professor'

# Test 2: LKC FES Professors and Senior Professors
$lkcfes.designationCounts.Professor
$lkcfes.designationCounts.'Senior Professor'

# Test 10: Full breakdown
$lkcfes.designationCounts | ConvertTo-Json
```

### Run automated tests:
```bash
npx tsx lib/tools/test-designation-queries.ts
```

---

## Summary

These 10 test cases cover:
1. ✅ Single department, single designation count
2. ✅ Faculty-wide, multiple designation counts
3. ✅ Faculty-wide, list all staff with designation
4. ✅ Faculty-wide, list all staff with different designation
5. ✅ Cross-department comparison for one designation
6. ✅ Single department, different designation count
7. ✅ Single department, different designation count
8. ✅ Single department, all designations
9. ✅ Cross-department comparison for different designation
10. ✅ Faculty-wide, complete breakdown

All answers are verified against the actual `staff_directory.json` data as of 2026-01-21.
