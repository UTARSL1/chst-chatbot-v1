# RC Postgraduate Supervision Dashboard - Design Specification

## Overview
A comprehensive analytics dashboard for Research Centre coordinators to track and analyze postgraduate student supervision across RC members.

---

## Data Model

### CSV Structure
```csv
Staff ID, Staff Name, Faculty, Supervision Status, Area of Study, Research Centre,
Name of Student, Level, Institution, Program Title, Start Date, Completed Date, Role
```

### Key Entities
- **RC Member**: Staff supervising postgraduate students
- **Student**: Postgraduate student (Master/PhD)
- **Supervision**: Relationship between member and student

### Aggregated Metrics Per Member
- Total students supervised
- In Progress count
- Completed count
- PhD vs Master breakdown
- Main Supervisor vs Co-Supervisor ratio
- Area of Study distribution
- Timeline of supervisions

---

## Dashboard Layout

### 1. **Left Panel - RC Members List** (Similar to Publications)
**Components:**
- Search bar
- Sort dropdown (Name, Total Students, In Progress, Completed)
- Filter panel (expandable)
  - Student Level (PhD, Master)
  - Status (In Progress, Completed)
  - Role (Main Supervisor, Co-Supervisor)
  - Year Range

**Member List Item:**
```
[Grip Icon] [Member Name]                    [17 students]
            Main: 8 | Co: 9    [PhD icon] 10  [Master icon] 7
```

**Styling:**
- Glassmorphism cards
- Hover effect with blue glow
- Selected state with stronger glow
- Mini visualization showing PhD/Master ratio

---

### 2. **Right Panel - Analytics Dashboard**

#### **A. Header Section**
- Member name + "Postgraduate Supervision"
- Year filter dropdown (All Years, 2024, 2023, etc.)

#### **B. Key Metrics Row** (4 cards)
1. **Total Students**
   - Large number
   - Label: "Total Students"
   - Icon: Users

2. **In Progress**
   - Large number (blue)
   - Label: "In Progress"
   - Icon: Clock
   - Percentage of total

3. **Completed**
   - Large number (green)
   - Label: "Completed"
   - Icon: CheckCircle
   - Percentage of total

4. **PhD Students**
   - Large number (purple)
   - Label: "PhD Students"
   - Icon: GraduationCap
   - Percentage of total

**Card Styling:**
- `bg-white/10 backdrop-blur-md`
- `border border-white/20`
- `hover:bg-white/20 transition-colors shadow-lg`

---

#### **C. Visualization Section**

##### **Row 1: Role & Level Distribution** (2 columns)

**Left: Supervision Role Distribution**
- Donut chart
- Segments:
  - Main Supervisor (blue)
  - Co-Supervisor (purple)
- Center shows total count
- Legend with counts and percentages

**Right: Student Level Distribution**
- Horizontal bar chart
- Two bars:
  - PhD (purple gradient)
  - Master (blue gradient)
- Shows count and percentage
- Bars have glow effect

##### **Row 2: Timeline View**
- Title: "Supervision Timeline"
- Horizontal timeline chart (2017-2028)
- Vertical bars for each year
- Stacked bars showing:
  - In Progress (blue)
  - Completed (green)
- Hover tooltip shows breakdown
- Year labels below

##### **Row 3: Area of Study Breakdown**
- Title: "Research Areas"
- Colored pill badges showing:
  - Engineering, Green Technology (emerald)
  - Medical and Health Sciences (rose)
  - Information and Communication Technology (sky)
- Each pill shows count

---

#### **D. Student List Table**

**Columns:**
1. Student Name
2. Level (PhD/Master badge)
3. Status (In Progress/Completed badge)
4. Role (Main/Co badge)
5. Institution
6. Start Date
7. Expected/Completed Date
8. Duration (calculated)

**Features:**
- Search by student name
- Sort by any column
- Filter by Level, Status, Role
- Pagination (10 per page)
- Export to CSV button

**Row Styling:**
- Glassmorphism background
- Hover effect
- Alternating subtle background
- Status badges color-coded

---

## Color Scheme

### Status Colors
- **In Progress**: `blue-500` (rgb(59, 130, 246))
- **Completed**: `emerald-500` (rgb(16, 185, 129))

### Level Colors
- **PhD**: `purple-500` (rgb(168, 85, 247))
- **Master**: `sky-500` (rgb(14, 165, 233))

### Role Colors
- **Main Supervisor**: `blue-600`
- **Co-Supervisor**: `purple-600`

### Area Colors
- **Engineering**: `emerald-500`
- **Medical Sciences**: `rose-500`
- **ICT**: `sky-500`

---

## Filtering & Sorting

### Filter Criteria
1. **Student Level**: PhD, Master (multi-select)
2. **Status**: In Progress, Completed (multi-select)
3. **Role**: Main Supervisor, Co-Supervisor (multi-select)
4. **Year Range**: Start year filter
5. **Institution**: Filter by university

### Sort Options
- Name (A→Z, Z→A)
- Total Students (High→Low, Low→High)
- In Progress Count
- Completed Count
- PhD Count
- Recent Activity (latest start date)

### Active Filter Chips
- Display below search bar
- Color-coded by filter type
- Individual removal (X button)
- "Clear all" option

---

## Upload Functionality

**Location:** Below member list (similar to Publications)

**Important:** Each CSV file contains supervision data for **ONE member only**. To add multiple members, upload multiple CSV files.

### Upload Flow
1. User clicks "Upload" button
2. Selects CSV file for a single member
3. System parses CSV and extracts:
   - Staff Name (from any row - all rows have same staff)
   - All supervision records for that staff member
4. System checks if member already exists (by name)
   - **If exists**: Replace all supervision records for that member
   - **If new**: Create new member with supervision records
5. Member list refreshes automatically

### CSV Structure (One Member)
```csv
No.,Staff ID,Staff Name,Faculty,Staff Category,Supervision Status,Area of Study,Research Centre,Name of Student,Level,Institution,Program Title,Start Date,Completed Date,Role
1,16072,Hum Yan Chai,LKC FES,Academic,COMPLETED,MEDICAL AND HEALTH SCIENCES,CHST,Nyee Wen Jet,MASTER,University Tunku Abdul Rahman,,Jul-17,Jul-20,MAIN SUPERVISOR
2,16072,Hum Yan Chai,LKC FES,Academic,IN PROGRESS,ENGINEERING,CHST,Kelvin Ling,PHD,UTM,PhD in Biomedical Engineering,Oct-18,Oct-21,CO-SUPERVISOR
...
```

**Key Points:**
- All rows have the **same Staff Name** (one member per file)
- Each row represents one student supervision
- Multiple students per member in the same file

### Validation
- ✅ Check required columns exist
- ✅ Validate date formats (Jul-17, Oct-18, etc.)
- ✅ Verify all rows have same Staff Name
- ✅ Check Level is PHD or MASTER
- ✅ Check Status is IN PROGRESS or COMPLETED
- ✅ Check Role is MAIN SUPERVISOR or CO-SUPERVISOR
- ❌ Reject if Staff Name varies across rows
- ❌ Reject if required columns missing

### Success/Error Feedback
- **Success**: "Successfully uploaded 17 supervisions for Hum Yan Chai"
- **Update**: "Updated supervision records for Hum Yan Chai (17 students)"
- **Error**: Clear message indicating what went wrong

### Progress Indicator
- Show upload progress
- Display parsing status
- Show success/error message

### Auto-Refresh
- Member list updates immediately
- If member was selected, refresh their analytics
- Scroll to updated/new member

---

## Responsive Design

### Desktop (≥1024px)
- 3-column grid (1:2 ratio for members:analytics)
- All visualizations side-by-side

### Tablet (768px-1023px)
- 2-column grid
- Visualizations stack vertically

### Mobile (<768px)
- Single column
- Collapsible member list
- Simplified visualizations

---

## API Endpoints Needed

### GET `/api/rc-management/postgraduate/members`
Returns list of RC members with student counts

### GET `/api/rc-management/postgraduate/members/[id]?year=[year]`
Returns detailed supervision data for a specific member

### POST `/api/rc-management/postgraduate/upload`
Handles CSV upload and data processing

### DELETE `/api/rc-management/postgraduate/members/[id]`
Deletes a member and all their supervision records

---

## Database Schema

### `rc_postgraduate_supervisions` Collection

```typescript
{
  _id: ObjectId,
  staffId: string,
  staffName: string,
  faculty: string,
  researchCentre: string,
  studentName: string,
  level: 'PHD' | 'MASTER',
  status: 'IN PROGRESS' | 'COMPLETED',
  role: 'MAIN SUPERVISOR' | 'CO-SUPERVISOR',
  areaOfStudy: string,
  institution: string,
  programTitle: string,
  startDate: Date,
  completedDate: Date | null,
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes
- `staffId` (for member queries)
- `researchCentre` (for RC filtering)
- `status` (for filtering)
- `level` (for filtering)
- `startDate` (for timeline queries)

---

## Implementation Priority

### Phase 1: Core Functionality
1. ✅ CSV upload and parsing
2. ✅ Member list with search/filter
3. ✅ Key metrics display
4. ✅ Student list table

### Phase 2: Visualizations
1. ✅ Role distribution donut chart
2. ✅ Level distribution bar chart
3. ✅ Timeline view
4. ✅ Area of study breakdown

### Phase 3: Advanced Features
1. Export functionality
2. Bulk operations
3. Advanced analytics (trends, predictions)
4. Comparison between members

---

## Notes

- **Glassmorphism Consistency**: Match RC Publications styling exactly
- **Performance**: Use memoization for expensive calculations
- **Caching**: Cache member stats to avoid repeated API calls
- **Validation**: Strict CSV validation to prevent data corruption
- **Empty States**: Handle cases where member has no students
- **Date Handling**: Support multiple date formats (Jul-17, 2017-07, etc.)

---

## Differences from RC Publications

| Feature | Publications | Postgraduate |
|---------|-------------|--------------|
| Primary Metric | Publication count | Student count |
| Status Types | N/A | In Progress / Completed |
| Quartile Equivalent | Q1-Q4 | PhD / Master |
| Role Types | Author types | Main / Co-Supervisor |
| Timeline | Publication years | Supervision duration |
| Completion | All complete | Some ongoing |

---

## Next Steps

1. Review and approve this design
2. Create database schema
3. Implement API endpoints
4. Build UI components
5. Test with sample data
6. Deploy to production
