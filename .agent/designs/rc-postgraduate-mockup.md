# RC Postgraduate Supervision - Complete Dashboard Mockup

## Overview
This document presents the complete visual design for the RC Postgraduate Supervision dashboard, following the same structure as RC Publications.

---

## Layout Structure

### Two-Panel Layout (Same as RC Publications)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    RC Postgraduate Supervision                       │
├──────────────────┬──────────────────────────────────────────────────┤
│                  │                                                   │
│  LEFT PANEL      │           RIGHT PANEL                             │
│  (1/3 width)     │           (2/3 width)                            │
│                  │                                                   │
│  ┌────────────┐  │  ┌──────────────────────────────────────────┐   │
│  │ RC Members │  │  │ Hum Yan Chai                             │   │
│  │    (5)     │  │  │ Postgraduate Supervision    [All Years ▼]│   │
│  │  [🔍] [⚙️] │  │  └──────────────────────────────────────────┘   │
│  └────────────┘  │                                                   │
│                  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                │
│  ┌────────────┐  │  │ 17  │ │ 11  │ │  6  │ │ 10  │                │
│  │ Chan S.C.  │  │  │Total│ │Prog.│ │Comp.│ │ PhD │                │
│  │ 12 students│  │  └─────┘ └─────┘ └─────┘ └─────┘                │
│  └────────────┘  │                                                   │
│                  │  ┌──────────┐  ┌──────────┐                      │
│  ┌────────────┐  │  │  Donut   │  │   Bar    │                      │
│  │ Hum Y.C. ★ │  │  │  Chart   │  │  Chart   │                      │
│  │ 17 students│  │  └──────────┘  └──────────┘                      │
│  └────────────┘  │                                                   │
│                  │  ┌──────────────────────────────────────────┐   │
│  ┌────────────┐  │  │      Supervision Timeline                │   │
│  │ Goh C.H.   │  │  │      [Bar Chart 2017-2028]               │   │
│  │  8 students│  │  └──────────────────────────────────────────┘   │
│  └────────────┘  │                                                   │
│                  │  ┌──────────────────────────────────────────┐   │
│  ┌────────────┐  │  │      Student List Table                  │   │
│  │ Upload     │  │  │  [Search] [Level▼] [Status▼] [Role▼]    │   │
│  │ [📤 Upload]│  │  │  ┌────────────────────────────────────┐  │   │
│  └────────────┘  │  │  │ Name │ Level │ Status │ Role │...  │  │   │
│                  │  │  └────────────────────────────────────┘  │   │
│                  │  └──────────────────────────────────────────┘   │
└──────────────────┴──────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. LEFT PANEL - RC Members List

#### Header
- **Title**: "RC Members (5)" with Users icon
- **Search Icon**: Magnifying glass button
- **Filter Icon**: Funnel button with badge showing active filter count

#### Member List Cards
Each card shows:
```
┌──────────────────────────────────────┐
│ [≡] Member Name           17 students│
│     Main: 8 | Co: 9   [🎓]10 [📚]7  │
└──────────────────────────────────────┘
```

**Components:**
- Grip icon (left)
- Member name (white text)
- Student count badge (blue, right)
- Mini stats: Main vs Co-Supervisor counts
- PhD icon + count, Master icon + count

**States:**
- **Default**: `bg-white/5 border-transparent`
- **Hover**: `border-blue-400/30 shadow-[0_0_15px_rgba(59,130,246,0.3)]`
- **Selected**: `bg-blue-900/40 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]`

#### Upload Section (Bottom)
```
┌──────────────────────────────────────┐
│ 📤 Upload Member Supervision         │
│    Upload CSV file containing        │
│    supervision data                  │
│                                      │
│         [Upload Button]              │
│                                      │
│ ℹ️ Each CSV contains data for        │
│   ONE member only                    │
└──────────────────────────────────────┘
```

---

### 2. RIGHT PANEL - Analytics Dashboard

#### A. Header Section
```
┌────────────────────────────────────────────────────┐
│ Hum Yan Chai                      [Years: All ▼]  │
│ Postgraduate Supervision                           │
└────────────────────────────────────────────────────┘
```

**Year Filter (Multi-Select with Checkboxes)**

Button Label Changes Based on Selection:
- "Years: All" (when all selected)
- "Years: 2024" (when one selected)
- "Years: 2022, 2023, 2024" (when multiple selected)
- "Years: 3 selected" (when many selected)

**Dropdown Menu:**
```
┌────────────────────────┐
│ ☑ All Years            │
│ ☑ 2024                 │
│ ☑ 2023                 │
│ ☐ 2022                 │
│ ☐ 2021                 │
│ ☐ 2020                 │
│ ☐ 2019                 │
│ ☐ 2018                 │
│ ☐ 2017                 │
├────────────────────────┤
│ Clear All    [Apply]   │
└────────────────────────┘
```

**Behavior:**
- **"All Years" checkbox**: 
  - When checked: Selects all years, disables individual checkboxes
  - When unchecked: Enables individual year selection
- **Individual year checkboxes**:
  - Can select multiple years
  - Selecting all manually checks "All Years"
  - Unchecking any year unchecks "All Years"
- **"Clear All" button**: Unchecks all selections, defaults to "All Years"
- **"Apply" button**: Closes dropdown and applies filter

**Filter Logic:**
- Default: "All Years" checked → Show ALL students
- Multiple years selected (e.g., 2022, 2023, 2024):
  - Show students who started in ANY of the selected years
  - Metrics aggregate across selected years
  - Timeline highlights selected years
  - Table shows students from selected years
  - Charts recalculate for combined data

**Use Cases:**
1. **Trend Analysis**: Select 2022, 2023, 2024 to see recent 3-year trend
2. **Year Comparison**: Select 2020, 2024 to compare two specific years
3. **Period Analysis**: Select 2018-2021 to analyze a 4-year period
4. **Single Year**: Select only 2023 to focus on one year
5. **All Years**: Default view showing complete history

---

#### B. Key Metrics (4 Cards)

```
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│   17    │ │   11    │ │    6    │ │   10    │
│  Total  │ │   In    │ │  Comp-  │ │   PhD   │
│Students │ │Progress │ │  leted  │ │Students │
└─────────┘ └─────────┘ └─────────┘ └─────────┘
```

**Card Styling:**
- `bg-white/10 backdrop-blur-md`
- `border border-white/20`
- `hover:bg-white/20 transition-colors shadow-lg`

**Colors:**
- Total: White
- In Progress: Blue (`text-blue-400`)
- Completed: Green (`text-emerald-400`)
- PhD: Purple (`text-purple-400`)

---

#### C. Visualization Section

##### Row 1: Role & Level Distribution (2 columns)

**Left: Supervision Role Distribution (Donut Chart)**
```
        Main Supervisor
             ╱  ╲
            ╱ 47%╲
           │  8   │
            ╲ 53%╱
             ╲  ╱
        Co-Supervisor
```
- Center: Total count
- Segments: Main (blue), Co (purple)
- Legend with percentages

**Right: Student Level Distribution (Horizontal Bar)**
```
PhD     ████████████████ 59% (10)
Master  ███████████ 41% (7)
```
- PhD: Purple gradient with glow
- Master: Blue gradient with glow
- Shows count and percentage

---

##### Row 2: Supervision Timeline

```
Supervision Timeline

 8│     
 7│     ██
 6│     ██
 5│  ██ ██ ██
 4│  ██ ██ ██
 3│  ██ ██ ██ ██
 2│  ██ ██ ██ ██ ██
 1│  ██ ██ ██ ██ ██ ██
 0└──┴──┴──┴──┴──┴──┴──┴──┴──
   17 18 19 20 21 22 23 24 25

Legend: ■ In Progress  ■ Completed
```

**Features:**
- Stacked bars (blue + green)
- X-axis: Years (2017-2028)
- Y-axis: Student count
- Hover tooltip shows breakdown
- Shows ALL years by default
- Filters when year selected in dropdown

---

##### Row 3: Area of Study Breakdown

```
Research Areas

[Engineering, Green Tech: 12] [Medical Sciences: 3] [ICT: 2]
```

**Pill Badges:**
- Engineering: Emerald
- Medical: Rose
- ICT: Sky
- Each shows count

---

#### D. Student List Table

```
┌────────────────────────────────────────────────────────────────┐
│ [🔍 Search students...]  [Level ▼] [Status ▼] [Role ▼]        │
├──────────────┬────────┬──────────┬──────────┬─────────────────┤
│ Student Name │ Level  │  Status  │   Role   │  Institution    │
├──────────────┼────────┼──────────┼──────────┼─────────────────┤
│ Nyee Wen Jet │[Master]│[Complete]│  [Main]  │ UTAR            │
│ Kelvin Ling  │ [PhD]  │[Progress]│  [Co]    │ UTM             │
│ Joyce Sia    │ [PhD]  │[Complete]│  [Co]    │ UTM             │
│ ...          │        │          │          │                 │
└──────────────┴────────┴──────────┴──────────┴─────────────────┘

Showing 1-10 of 17 students        [< 1 2 >] [Export CSV]
```

**Columns:**
1. Student Name
2. Level (PhD/Master badge)
3. Status (In Progress/Completed badge)
4. Role (Main/Co-Supervisor badge)
5. Institution
6. Start Date
7. Expected/Completed Date
8. Duration (calculated)

**Features:**
- Search by student name
- Filter dropdowns for Level, Status, Role
- Sort by any column (click header)
- Pagination (10 per page)
- Export to CSV button
- Responsive to year filter

**Badge Colors:**
- PhD: `bg-purple-500/20 text-purple-300 border-purple-500/50`
- Master: `bg-sky-500/20 text-sky-300 border-sky-500/50`
- In Progress: `bg-blue-500/20 text-blue-300 border-blue-500/50`
- Completed: `bg-emerald-500/20 text-emerald-300 border-emerald-500/50`
- Main: `bg-blue-600/20 text-blue-300 border-blue-600/50`
- Co: `bg-purple-600/20 text-purple-300 border-purple-600/50`

---

## Year Filter Behavior (Multi-Select)

### Default State: "All Years" Checked
- Shows ALL 17 students
- Timeline shows all years (2017-2028) with full opacity
- Metrics show total counts
- Table shows all students
- Button label: "Years: All"

### Single Year Selected (e.g., "2022" only)
- Shows only students who **started in 2022**
- Metrics update:
  - Total: 5 students (started in 2022)
  - In Progress: 4
  - Completed: 1
  - PhD: 3
- Timeline:
  - 2022 bar highlighted with full color and glow
  - Other years shown in muted gray (30% opacity)
- Table filters to show only 2022 students
- Charts recalculate based on 2022 data only
- Button label: "Years: 2022"

### Multiple Years Selected (e.g., "2022, 2023, 2024")
- Shows students who started in **any of the selected years**
- Metrics aggregate:
  - Total: 12 students (combined from 2022, 2023, 2024)
  - In Progress: 9 (across all 3 years)
  - Completed: 3 (across all 3 years)
  - PhD: 7 (across all 3 years)
- Timeline:
  - 2022, 2023, 2024 bars highlighted with full color and glow
  - Other years (2017-2021, 2025-2028) shown in muted gray
  - Clearly shows trend across selected years
- Table shows students from 2022, 2023, or 2024
- Charts combine data from all selected years
- Button label: "Years: 2022, 2023, 2024" or "Years: 3 selected"

### Comparison Example: "2020" and "2024"
- Shows students from 2020 OR 2024
- Metrics aggregate both years
- Timeline highlights only 2020 and 2024 bars
- Useful for comparing two specific years
- Button label: "Years: 2020, 2024"

### Period Analysis: "2018, 2019, 2020, 2021"
- Shows 4-year period
- Metrics aggregate all 4 years
- Timeline highlights 2018-2021 range
- Useful for analyzing a specific period
- Button label: "Years: 4 selected"

### Year Options
Dynamically generated from student start dates:
- ☑ All Years (master checkbox)
- ☐ 2024
- ☐ 2023
- ☐ 2022
- ☐ 2021
- ☐ 2020
- ... (all years with students)

### Interactive Behavior

**Selecting "All Years":**
1. Checks "All Years" checkbox
2. Disables individual year checkboxes (grayed out)
3. Shows all data
4. Button updates to "Years: All"

**Unchecking "All Years":**
1. Unchecks "All Years"
2. Enables individual year checkboxes
3. User can now select specific years
4. If no years selected, defaults back to "All Years"

**Selecting Individual Years:**
1. User checks 2022, 2023, 2024
2. "All Years" remains unchecked
3. Click "Apply" button
4. Dropdown closes
5. Filter applies immediately
6. Button updates to "Years: 2022, 2023, 2024"

**Selecting All Years Manually:**
1. User checks every individual year
2. System automatically checks "All Years"
3. Individual checkboxes become disabled
4. Same result as clicking "All Years" directly

**Clear All Button:**
1. Unchecks all selections
2. Automatically checks "All Years"
3. Resets to default state
4. Does NOT close dropdown (user can reselect)

**Apply Button:**
1. Closes dropdown
2. Applies selected filter
3. Updates all metrics, charts, and table
4. Updates button label

### Timeline Visual Feedback

**All Years Selected:**
```
All bars shown with full color and opacity
2017 ██ 2018 ██ 2019 ██ 2020 ██ 2021 ██ 2022 ██ 2023 ██ 2024 ██
```

**2022, 2023, 2024 Selected:**
```
Muted bars          Highlighted bars        Muted bars
2017 ░░ 2018 ░░ ... 2022 ██ 2023 ██ 2024 ██ 2025 ░░ ...
```

**2020 and 2024 Selected:**
```
Muted    Highlight  Muted bars      Highlight  Muted
2017 ░░  2020 ██    2021 ░░ ...     2024 ██    2025 ░░
```

---

## Interaction Flow

### 1. Initial Load
```
User lands on page
    ↓
Load all RC members
    ↓
Auto-select first member
    ↓
Show their dashboard (All Years)
```

### 2. Member Selection
```
User clicks different member
    ↓
Highlight selected member card
    ↓
Load member's supervision data
    ↓
Update right panel with their data
    ↓
Reset year filter to "All Years"
```

### 3. Year Filter
```
User selects year from dropdown
    ↓
Filter student data by start year
    ↓
Update all metrics
    ↓
Update all charts
    ↓
Update student table
    ↓
Keep member selection
```

### 4. Upload New Member
```
User clicks Upload button
    ↓
Select CSV file
    ↓
Parse and validate
    ↓
Create/Update member
    ↓
Refresh member list
    ↓
Auto-select uploaded member
    ↓
Show their dashboard
```

---

## Responsive Breakpoints

### Desktop (≥1024px)
- Two-panel layout (1:2 ratio)
- All visualizations side-by-side
- Full table visible

### Tablet (768px-1023px)
- Two-panel layout (narrower)
- Visualizations stack vertically
- Table scrolls horizontally

### Mobile (<768px)
- Single column
- Collapsible member list
- Simplified visualizations
- Table becomes cards

---

## Color Palette Summary

### Status Colors
- **In Progress**: `blue-500` (#3B82F6)
- **Completed**: `emerald-500` (#10B981)

### Level Colors
- **PhD**: `purple-500` (#A855F7)
- **Master**: `sky-500` (#0EA5E9)

### Role Colors
- **Main Supervisor**: `blue-600` (#2563EB)
- **Co-Supervisor**: `purple-600` (#9333EA)

### Area Colors
- **Engineering**: `emerald-500` (#10B981)
- **Medical Sciences**: `rose-500` (#F43F5E)
- **ICT**: `sky-500` (#0EA5E9)

### UI Colors
- **Background**: `slate-950` (#020617)
- **Cards**: `slate-900/80` with `backdrop-blur-xl`
- **Borders**: `white/20` (rgba(255,255,255,0.2))
- **Text Primary**: `white` (#FFFFFF)
- **Text Secondary**: `slate-400` (#94A3B8)
- **Accent**: `blue-500` (#3B82F6)

---

## Glassmorphism Styling

### Main Containers
```css
background: rgba(15, 23, 42, 0.8);
backdrop-filter: blur(24px);
border: 1px solid rgba(255, 255, 255, 0.2);
box-shadow: 0 0 15px rgba(255, 255, 255, 0.07);
border-radius: 0.5rem;
```

### Metric Cards
```css
background: rgba(255, 255, 255, 0.1);
backdrop-filter: blur(12px);
border: 1px solid rgba(255, 255, 255, 0.2);
box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
transition: all 0.3s ease;
```

### Hover Effects
```css
hover:background: rgba(255, 255, 255, 0.2);
hover:box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
```

---

## Next Steps

1. ✅ Design approved
2. Create database schema
3. Build CSV parser
4. Implement API endpoints
5. Build UI components
6. Test with sample data
7. Deploy

---

## Notes

- **Exact same structure as RC Publications** for consistency
- **Year filter is optional** - defaults to "All Years"
- **One CSV per member** - not one CSV for all members
- **Glassmorphism throughout** - maintain visual consistency
- **Performance optimized** - use memoization and caching
- **Responsive design** - works on all devices
