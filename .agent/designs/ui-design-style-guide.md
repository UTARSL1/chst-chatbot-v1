# CHST AI Portal - UI Design Style Guide

**Version**: 1.5  
**Last Updated**: January 2026  
**Design Theme**: Pure Terminal / Command Center Aesthetic

---

## 🎨 Design Philosophy

The CHST AI Portal follows a **"Pure Terminal"** design aesthetic - a modern, professional command-line interface style that emphasizes:
- **Clarity and readability** with monospace fonts
- **Professional tech aesthetic** with sharp edges and clean lines
- **Strategic use of color** with blue accent on dark backgrounds
- **Consistent typography** across all components
- **Terminal-inspired elements** (prefixes, uppercase text, tracking)

---

## 🎯 Color Palette

### Primary Colors

| Color Name | Hex Code | Usage | Example |
|------------|----------|-------|---------|
| **Accent Blue** | `#3B82F6` | Primary accent, titles, buttons, active states | Page titles, primary buttons, links |
| **Lighter Blue** | `#60A5FA` | Hover states, secondary accents | Button hover, active tabs |
| **Dark Blue** | `#2563EB` | Button hover (darker) | Primary button hover |

### Background Colors

| Color Name | Tailwind Class | Hex Code | Usage |
|------------|---------------|----------|-------|
| **Primary Background** | `bg-[#0B0B10]` | `#0B0B10` | Main page background |
| **Secondary Background** | `bg-[#1A1A1F]` | `#1A1A1F` | Card headers, sections |
| **Card Background** | `bg-slate-900/80` | `rgba(15, 23, 42, 0.8)` | Main content cards |
| **Border** | `border-[#1E293B]` | `#1E293B` | Dividers, borders |

### Text Colors

| Color Name | Tailwind Class | Hex Code | Usage |
|------------|---------------|----------|-------|
| **Primary Text** | `text-white` | `#FFFFFF` | Main headings, important text |
| **Secondary Text** | `text-[#94A3B8]` | `#94A3B8` | Descriptions, labels, terminal prefixes |
| **Muted Text** | `text-[#64748B]` | `#64748B` | Less important text, placeholders |
| **Blue Text** | `text-[#3B82F6]` | `#3B82F6` | Titles, emphasis, active states |

### Semantic Colors

| Purpose | Color | Hex Code | Usage |
|---------|-------|----------|-------|
| **Success** | Green | `#10B981` | Success messages, online status |
| **Warning** | Amber | `#F59E0B` | Warnings, pending states |
| **Error** | Red | `#EF4444` | Error messages, destructive actions |
| **Info** | Blue | `#3B82F6` | Information, highlights |

---

## 📝 Typography

### Font Families

#### 1. **Orbitron** (Primary Display Font)
- **Usage**: Page titles, section headers, buttons, tabs, labels
- **Characteristics**: Geometric, futuristic, tech-focused
- **Import**: `font-['Orbitron',sans-serif]`
- **Examples**:
  - Page titles: `CHST AI PORTAL`
  - Section headers: `KNOWLEDGE BASE MANAGEMENT`
  - Buttons: `+ ADD LINK`, `SAVE`, `DELETE`
  - Tabs: `DEPARTMENT OVERVIEW`, `FACULTY OVERVIEW`

#### 2. **JetBrains Mono** (Monospace Font)
- **Usage**: Descriptions, terminal prefixes, code, data display, navigation links
- **Characteristics**: Monospace, terminal-style, highly readable
- **Import**: `font-['JetBrains_Mono',monospace]`
- **Examples**:
  - Terminal prefixes: `// INTELLIGENT_ASSISTANT`
  - Descriptions: `// MANAGE_INVITATION_CODES_FOR_STAFF_AND_STUDENTS`
  - Navigation: `Chat`, `Workspace`, `Admin`
  - Loading states: `// GENERATING_RESPONSE`

#### 3. **Inter** (Body Font - Fallback)
- **Usage**: General body text, paragraphs (when not using monospace)
- **Characteristics**: Clean, modern, highly readable
- **Import**: Default system font stack

### Typography Scale

| Element | Font | Size | Weight | Transform | Tracking |
|---------|------|------|--------|-----------|----------|
| **Page Title** | Orbitron | `text-2xl` (24px) | `font-bold` | `uppercase` | `tracking-[0.1em]` |
| **Section Header** | Orbitron | `text-xl` (20px) | `font-bold` | `uppercase` | `tracking-wide` |
| **Card Title** | Orbitron | `text-lg` (18px) | `font-bold` | `uppercase` | `tracking-wide` |
| **Button Text** | Orbitron | `text-xs` (12px) | `font-bold` | `uppercase` | `tracking-[0.15em]` |
| **Tab Text** | Orbitron | `text-sm` (14px) | `font-semibold` | `uppercase` | `tracking-wide` |
| **Description** | JetBrains Mono | `text-sm` (14px) | `normal` | `normal` | `normal` |
| **Terminal Prefix** | JetBrains Mono | `text-xs` (12px) | `normal` | `normal` | `normal` |
| **Body Text** | Inter | `text-base` (16px) | `normal` | `normal` | `normal` |

---

## 🧩 Component Patterns

### Buttons

#### Primary Button (White Background)
```tsx
className="bg-white text-black px-6 py-3 font-['Orbitron',sans-serif] font-bold text-xs uppercase tracking-[0.15em] hover:bg-white hover:shadow-[0_0_20px_rgba(255,255,255,0.6)] hover:scale-[1.02] transition-all duration-200"
```
**Usage**: Main actions (NEW CHAT, SEND, SAVE)

#### Secondary Button (Blue Accent)
```tsx
className="bg-[#3B82F6] text-white px-4 py-2 font-['Orbitron',sans-serif] font-bold text-xs uppercase tracking-wide hover:bg-[#2563EB] transition-colors"
```
**Usage**: Primary actions in admin panels (ADD, CREATE, UPDATE)

#### Outline Button
```tsx
className="border border-white/20 text-white px-4 py-2 font-['Orbitron',sans-serif] font-bold text-xs uppercase tracking-wide hover:bg-white/10 hover:border-white/40 transition-all"
```
**Usage**: Secondary actions, cancel buttons

### Page Headers

#### Standard Page Header
```tsx
<div className="mb-8">
  <h1 className="text-2xl font-bold text-[#3B82F6] mb-2 font-['Orbitron',sans-serif] uppercase tracking-[0.1em]">
    PAGE TITLE
  </h1>
  <p className="text-[#94A3B8] text-sm font-['JetBrains_Mono',monospace]">
    // DESCRIPTION_OF_PAGE_FUNCTIONALITY
  </p>
</div>
```

### Cards

#### Standard Card
```tsx
<div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.07)] p-6">
  <h3 className="text-lg font-bold text-white mb-4 font-['Orbitron',sans-serif] uppercase tracking-wide">
    CARD TITLE
  </h3>
  {/* Card content */}
</div>
```

### Tabs

#### Tab Navigation
```tsx
<div className="flex gap-4 border-b border-[#1E293B]">
  <button className="px-4 py-2 font-['Orbitron',sans-serif] text-sm uppercase tracking-wide text-[#3B82F6] border-b-2 border-[#3B82F6]">
    ACTIVE TAB
  </button>
  <button className="px-4 py-2 font-['Orbitron',sans-serif] text-sm uppercase tracking-wide text-[#94A3B8] hover:text-white transition-colors">
    INACTIVE TAB
  </button>
</div>
```

### Loading States

#### Generating Indicator
```tsx
<Button className="flex items-center gap-2 bg-background/80 backdrop-blur border-[#3B82F6]/30 text-[#3B82F6] hover:text-[#60A5FA] hover:bg-[#3B82F6]/10 hover:border-[#3B82F6]/50 transition-all shadow-sm font-['JetBrains_Mono',monospace] text-xs">
  <Spinner className="w-3 h-3 animate-spin" />
  <span className="uppercase tracking-wide">// GENERATING_RESPONSE</span>
  <span className="text-xs opacity-70 border-l border-[#3B82F6]/30 pl-2 ml-1 uppercase">STOP</span>
</Button>
```

---

## 🎭 Design Patterns

### Terminal Prefixes
Use `//` prefix for descriptions and secondary text:
- `// INTELLIGENT_ASSISTANT`
- `// MANAGE_KNOWLEDGE_BASE`
- `// GENERATING_RESPONSE`

### Text Transformation
- **Titles**: Always `UPPERCASE` with `Orbitron` font
- **Buttons**: Always `UPPERCASE` with wide tracking
- **Descriptions**: Use `JetBrains Mono` with terminal prefixes
- **Navigation**: `JetBrains Mono` for consistency

### Spacing & Layout
- **Page padding**: `p-6` or `p-8`
- **Card padding**: `p-6`
- **Section gaps**: `gap-4` or `gap-6`
- **Button padding**: `px-4 py-2` (small), `px-6 py-3` (large)

### Borders & Shadows
- **Card borders**: `border border-white/20`
- **Dividers**: `border-[#1E293B]`
- **Card shadows**: `shadow-[0_0_15px_rgba(255,255,255,0.07)]`
- **Button glow**: `shadow-[0_0_20px_rgba(255,255,255,0.6)]`

### Hover Effects
- **Buttons**: Glow + slight scale (`hover:scale-[1.02]`)
- **Cards**: Subtle border brightening
- **Links**: Color transition to lighter blue
- **Transitions**: `transition-all duration-200`

---

## 📐 Layout Guidelines

### Page Structure
```
┌─────────────────────────────────────┐
│ Header (with logo + title)          │
├─────────────────────────────────────┤
│ Page Title (Blue, Orbitron)         │
│ // Description (Gray, JetBrains)    │
├─────────────────────────────────────┤
│                                     │
│ Content Area (Cards, Tables, etc)   │
│                                     │
└─────────────────────────────────────┘
```

### Responsive Breakpoints
- **Mobile**: `< 768px` - Stack vertically
- **Tablet**: `768px - 1024px` - 2 columns
- **Desktop**: `> 1024px` - Full layout

---

## 🎨 Special Components

### Logo
- **Component**: `<ChstLogo />`
- **Sizes**: `w-7 h-7` (header), `w-12 h-12` (login), `w-20 h-20` (empty state)
- **Color**: Uses `currentColor` for easy theming

### Role Badges
- **Chairperson**: White border, white text
- **Member**: Gray border, gray text
- **Student**: Lighter gray border, lighter gray text
- **Style**: Border-only, no background, uppercase, `JetBrains Mono`

### Status Indicators
- **Online**: Green (`#10B981`)
- **Offline**: Gray (`#64748B`)
- **Pending**: Amber (`#F59E0B`)

---

## ✅ Design Checklist

When creating new components, ensure:

- [ ] Page title uses `Orbitron`, blue accent, uppercase
- [ ] Descriptions use `JetBrains Mono` with `//` prefix
- [ ] Buttons use `Orbitron`, uppercase, proper tracking
- [ ] Hover effects include glow and/or scale
- [ ] Colors follow the established palette
- [ ] Borders use `border-white/20` or `border-[#1E293B]`
- [ ] Cards have backdrop blur and subtle shadow
- [ ] Tabs use blue accent for active state
- [ ] Loading states use blue accent with terminal text
- [ ] Spacing is consistent with design system

---

## 🔄 Version History

### V1.5 (January 2026)
- Added terminal-style logo component
- Enhanced button hover effects with glow
- Updated generating indicator to blue accent
- Fixed Scopus calculation display
- Simplified Faculty Publications chart

### V1.0 (Initial)
- Established Pure Terminal aesthetic
- Defined color palette and typography
- Created component patterns
- Set up design guidelines

---

## 📚 Resources

### Font Imports
```css
/* Add to globals.css or layout */
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap');
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
```

### Tailwind Config
Ensure these fonts are available in `tailwind.config.js`:
```js
fontFamily: {
  orbitron: ['Orbitron', 'sans-serif'],
  jetbrains: ['JetBrains Mono', 'monospace'],
}
```

---

**Maintained by**: CHST Development Team  
**Contact**: For questions or suggestions, refer to project documentation
