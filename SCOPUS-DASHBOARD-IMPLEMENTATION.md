# Scopus Publications Dashboard - Implementation Summary

## Overview
Created a new Scopus Publications Dashboard UI that resembles the RC Publications interface, with faculty and department selection capabilities.

## Features Implemented

### 1. **Faculty Selection**
- Dropdown to select faculty (currently showing only LKC FES)
- Designed to support multiple faculties in the future
- Shows full faculty name for clarity

### 2. **Department Selection**
- Dropdown populated based on selected faculty
- Shows 9 academic departments for LKC FES (excluding FGO and DLMSA):
  - DMBE - Department of Mechanical and Biomedical Engineering
  - DCL - Department of Chemical Engineering
  - D3E - Department of Electrical and Electronic Engineering
  - DCI - Department of Civil Engineering
  - DASD - Department of Architecture & Sustainable Design
  - DMME - Department of Mechanical and Materials Engineering
  - DC - Department of Chemistry
  - DS - Department of Science
  - DMAS - Department of Mathematics and Actuarial Science
- Shows staff count for each department

### 3. **Year Selection**
- Checkboxes for 2023, 2024, and 2025
- Users can select multiple years
- Publications are filtered based on selected years
- Requires at least one year to be selected

### 4. **Two-Tab Interface**

#### **Tab 1: Individual Staff**
- Table showing all staff in the selected department
- Columns:
  - Name
  - Scopus ID (or "-" if not available)
  - Status (Available/Not Available)
  - Publications count for selected years
- Sorted by publication count (highest first)
- Color-coded status badges

#### **Tab 2: Department Overview**
- **Summary Cards**:
  - Total Staff
  - Staff with Scopus Data
  - Total Publications (for selected years)
  - Average Publications per Staff
- **Publications by Year Chart**:
  - Bar chart showing publications for each selected year
  - Dynamic height based on publication counts
  - Shows exact numbers above each bar

### 5. **Access Control System**
- **Role-Based Access**:
  - **Chairperson**: Full access to all departments + ability to manage permissions.
  - **Regular Users**: Restricted access. Can only view departments they have been explicitly granted access to.
- **Management UI**:
  - "Manage Access" button for Chairpersons.
  - Modal to grant access (add email) or revoke access (remove email) for specific departments.
- **Security**:
  - Backend API verifies permissions before returning staff data.
  - Permissions stored in `faculty-permissions.json`.

## Files Created/Modified

### Frontend
- `components/chat/ChatSidebar.tsx` - Updated to include "Faculty Dashboard" section under Workspace.
- `app/scopus-publications/page.tsx` - Main dashboard page (Updated with Access Control UI).

### API Endpoints
- `app/api/scopus-publications/departments/route.ts` - Fetch departments for a faculty.
- `app/api/scopus-publications/staff/route.ts` - Fetch staff data (Protected).
- `app/api/scopus-publications/access/route.ts` - **New**: Handle permission checks and updates.

### Data
- `faculty-permissions.json` - **New**: JSON store for department-level access permissions.


## Data Source
- Uses `lkcfes-scopus-publications.json` for publication data
- Uses `lib/tools/staff_directory.json` for department structure

## Design Features
- Matches RC Publications aesthetic
- Dark theme with glassmorphism effects
- Responsive layout
- Smooth transitions and hover effects
- Color-coded status indicators
- Professional data visualization

## Access
- URL: `/scopus-publications`
- Requires authentication (redirects to `/chat` if not logged in)
- Available to all authenticated users

## Next Steps
1. Test the UI in the browser
2. Verify data loading from APIs
3. Add more faculties when data becomes available
4. Enhance visualizations (e.g., add more chart types)
5. Add export functionality (CSV/PDF)
6. Add filtering and sorting options

## Usage
1. Navigate to `/scopus-publications`
2. Select a faculty (currently only LKC FES)
3. Select a department from the dropdown
4. Check the years you want to analyze (2023, 2024, 2025)
5. Switch between "Individual Staff" and "Department Overview" tabs
6. View publication statistics and data
