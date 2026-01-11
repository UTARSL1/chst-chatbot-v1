# Phase 2: H-Index Distribution Visualizations

## Overview
Add two complementary visualizations to Department and Faculty Overview tabs to show H-Index distribution and research impact patterns.

## Visualization 1: Bubble Chart - "Research Impact Landscape"

### Purpose
Show the relationship between H-Index, Citations, and Publications across all dimensions.

### Specifications
- **X-axis**: H-Index (Lifetime)
- **Y-axis**: Total Citations (Lifetime)
- **Bubble Size**: Lifetime Publications
- **Bubble Color**: Department (for Faculty view) or single color (for Department view)
- **Interactivity**: 
  - Hover tooltip showing staff name, H-Index, Citations, Publications
  - Click to highlight
- **Library**: Use Recharts ScatterChart

### Data Requirements
- Filter staff with valid H-Index (> 0)
- Handle edge cases (staff with no metrics)

## Visualization 2: Beeswarm Plot - "H-Index Distribution"

### Purpose
Show pure H-Index distribution to reveal typical ranges and outliers.

### Specifications
- **X-axis**: H-Index value
- **Y-axis**: Jittered position (to prevent overlap)
- **Point Color**: Department (for Faculty view) or gradient by value (for Department view)
- **Interactivity**:
  - Hover tooltip showing staff name and H-Index
  - Visual density indication
- **Implementation**: Custom D3-based or simplified scatter with jitter

### Data Requirements
- All staff with H-Index > 0
- Calculate jitter to prevent overlap

## Implementation Steps

### Step 1: Add Bubble Chart Component
- Create reusable BubbleChart component
- Integrate with Department Overview
- Integrate with Faculty Overview

### Step 2: Add Beeswarm Plot Component
- Create BeeswarmPlot component with jitter logic
- Integrate with Department Overview
- Integrate with Faculty Overview

### Step 3: Layout Integration
- Add charts below optional metrics
- Ensure responsive design
- Add print-friendly styling

### Step 4: Testing
- Test with real data
- Verify tooltips and interactivity
- Check responsive behavior

## Success Criteria
- Both charts render correctly with real data
- Tooltips show accurate information
- Charts are responsive and print-friendly
- Visual hierarchy is clear
- Performance is acceptable (< 500ms render time)
