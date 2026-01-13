# CHST AI Portal - Terminal Design System

**Version:** 1.0  
**Last Updated:** 2026-01-13  
**Design Theme:** Pure Terminal / Command Center Aesthetic

---

## 🎨 Color Palette

### Primary Colors
```css
--terminal-black: #0B0B10      /* Deep space black - Main background */
--terminal-dark: #1A1A1F       /* Dark gray - Cards, panels */
--terminal-border: #1E293B     /* Border color */
--terminal-border-light: #334155 /* Lighter borders */
--terminal-white: #F8FAFC      /* Star white - Primary text */
--terminal-gray: #94A3B8       /* Metallic gray - Secondary text */
--terminal-gray-dark: #64748B  /* Darker gray - Muted text */
--terminal-blue: #3B82F6       /* Accent blue - Titles, primary actions */
--terminal-success: #10B981    /* Green - Success states */
--terminal-error: #EF4444      /* Red - Error states */
```

### Usage Guidelines
- **Blue Accent (`#3B82F6`)**: Use strategically for:
  - Main titles (e.g., "CHST AI PORTAL")
  - Primary action buttons (e.g., "Export CSV", "Submit")
  - Important call-to-action elements
  - **Do NOT overuse** - keep it special for key elements only

### Role Badge Colors (Monochrome Hierarchy)
```css
--role-chairperson: #FFFFFF (white bg, black text)
--role-member: #E5E5E5 (light gray bg, black text)
--role-student: #94A3B8 (medium gray bg, black text)
--role-public: #64748B (dark gray bg, white text)
```

---

## 📝 Typography

### Font Families
```css
--font-display: 'Orbitron', sans-serif;     /* Headers, buttons, titles */
--font-mono: 'JetBrains Mono', monospace;   /* Body text, code, data */
--font-fallback: Inter, sans-serif;         /* Fallback */
```

### Font Imports (Google Fonts)
```html
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### Typography Scale
```css
/* Headers - Orbitron */
.terminal-h1 { font-family: 'Orbitron'; font-size: 24px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
.terminal-h2 { font-family: 'Orbitron'; font-size: 20px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
.terminal-h3 { font-family: 'Orbitron'; font-size: 16px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
.terminal-h4 { font-family: 'Orbitron'; font-size: 14px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }

/* Body - JetBrains Mono */
.terminal-body { font-family: 'JetBrains Mono'; font-size: 14px; line-height: 1.6; }
.terminal-small { font-family: 'JetBrains Mono'; font-size: 12px; }
.terminal-tiny { font-family: 'JetBrains Mono'; font-size: 10px; }
```

---

## 🧩 Component Styles

### Buttons

#### Primary Terminal Button
```tsx
className="bg-white text-black px-6 py-3 font-['Orbitron',sans-serif] font-bold text-xs uppercase tracking-[0.15em] hover:bg-[#E5E5E5] transition-colors"
```

#### Secondary Terminal Button
```tsx
className="bg-[#1A1A1F] text-white border border-[#334155] px-6 py-3 font-['Orbitron',sans-serif] font-bold text-xs uppercase tracking-[0.15em] hover:border-white transition-colors"
```

#### Destructive Button
```tsx
className="bg-[#EF4444] text-white px-6 py-3 font-['Orbitron',sans-serif] font-bold text-xs uppercase tracking-[0.15em] hover:bg-[#DC2626] transition-colors"
```

### Cards

#### Terminal Card
```tsx
className="bg-[#1A1A1F] border border-[#334155] p-4 hover:border-white transition-colors"
```

#### Terminal Card (Elevated)
```tsx
className="bg-[#1A1A1F] border-2 border-white p-4"
```

### Input Fields

#### Terminal Input
```tsx
className="w-full bg-[#0B0B10] border border-[#334155] text-white px-4 py-3 font-['JetBrains_Mono',monospace] text-sm focus:outline-none focus:border-white transition-colors placeholder:text-[#64748B]"
placeholder="// ENTER_TEXT"
```

### Status Bar

#### Terminal Status Bar
```tsx
<div className="flex items-center justify-between px-6 py-2 border-b border-[#1E293B] font-['JetBrains_Mono',monospace] text-[10px] text-[#94A3B8]">
  <div className="flex items-center gap-4">
    <span>SYSTEM: CHST_AI_PORTAL</span>
    <span className="text-[#10B981]">STATUS: ONLINE</span>
  </div>
  <div className="flex items-center gap-3">
    <span suppressHydrationWarning>VERSION: {version}</span>
    <span>USER: {userName}</span>
  </div>
</div>
```

### Message Bubbles

#### User Message
```tsx
className="bg-white text-black border-2 border-white p-4 max-w-[70%]"
```

#### Assistant Message
```tsx
className="bg-[#1A1A1F] border border-[#334155] p-4 max-w-[70%]"
```

### Role Badges
```tsx
className={`text-[10px] px-2 py-1 font-['JetBrains_Mono',monospace] uppercase tracking-wide ${
  role === 'chairperson' ? 'bg-white text-black' :
  role === 'member' ? 'bg-[#E5E5E5] text-black' :
  role === 'student' ? 'bg-[#94A3B8] text-black' :
  'bg-[#64748B] text-white'
}`}
```

---

## 🎭 Design Principles

### 1. **Sharp Geometry**
- ❌ No rounded corners (`rounded-none` or no rounding)
- ✅ Sharp rectangles and squares
- ✅ Precise borders and edges

### 2. **Monochrome Palette**
- ❌ No gradients (purple, blue, green, etc.)
- ✅ Black, white, and shades of gray only
- ✅ Green for success, red for errors only

### 3. **Terminal Typography**
- ✅ Orbitron for headers and UI elements
- ✅ JetBrains Mono for body text and data
- ✅ Uppercase for emphasis
- ✅ Wide letter-spacing (tracking)

### 4. **Minimalist Interactions**
- ✅ Subtle hover effects (border color changes)
- ✅ No shadows or glows (except functional ones)
- ✅ Fast, snappy transitions (200ms)

### 5. **Terminal Prefixes**
- ✅ Use `//` for comments/labels
- ✅ Use `>` for actions/commands
- ✅ Use `[]` for status indicators
- ✅ Use `::` for separators

---

## 📦 Tailwind Configuration

Add to `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        terminal: {
          black: '#0B0B10',
          dark: '#1A1A1F',
          border: '#1E293B',
          'border-light': '#334155',
          white: '#F8FAFC',
          gray: '#94A3B8',
          'gray-dark': '#64748B',
          success: '#10B981',
          error: '#EF4444',
        },
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        jetbrains: ['JetBrains Mono', 'monospace'],
      },
    },
  },
};
```

---

## 🚀 Usage Examples

### Page Header
```tsx
<div className="bg-[#1A1A1F] border-b border-[#1E293B]">
  {/* Status Bar */}
  <div className="flex items-center justify-between px-6 py-2 border-b border-[#1E293B] font-['JetBrains_Mono',monospace] text-[10px] text-[#94A3B8]">
    <div className="flex items-center gap-4">
      <span>SYSTEM: CHST_AI_PORTAL</span>
      <span className="text-[#10B981]">STATUS: ONLINE</span>
    </div>
    <div className="flex items-center gap-3">
      <span>VERSION: V1.5</span>
      <span>USER: {userName}</span>
    </div>
  </div>

  {/* Main Header */}
  <div className="px-6 py-3 flex items-center justify-between">
    <h1 className="text-white font-['Orbitron',sans-serif] text-sm font-bold tracking-[0.1em] uppercase">
      CHST AI PORTAL
    </h1>
  </div>
</div>
```

### Form Input
```tsx
<div className="space-y-2">
  <label className="text-[#F8FAFC] font-['Orbitron',sans-serif] text-xs uppercase tracking-[0.1em]">
    // USER_EMAIL
  </label>
  <input
    type="email"
    className="w-full bg-[#0B0B10] border border-[#334155] text-white px-4 py-3 font-['JetBrains_Mono',monospace] text-sm focus:outline-none focus:border-white transition-colors placeholder:text-[#64748B]"
    placeholder="// ENTER_EMAIL"
  />
</div>
```

### Dashboard Card
```tsx
<div className="bg-[#1A1A1F] border border-[#334155] p-4 hover:border-white transition-colors">
  <h3 className="text-white font-['Orbitron',sans-serif] text-sm font-bold uppercase mb-2">
    PUBLICATIONS
  </h3>
  <p className="text-[#94A3B8] font-['JetBrains_Mono',monospace] text-xs">
    Manage research outputs
  </p>
</div>
```

---

## ✅ Checklist for New Pages

When creating a new page, ensure:

- [ ] Background is `#0B0B10` (terminal-black)
- [ ] All headers use Orbitron font, uppercase, wide tracking
- [ ] All body text uses JetBrains Mono
- [ ] No rounded corners on cards/buttons
- [ ] No color gradients (only monochrome)
- [ ] Buttons use white background with black text
- [ ] Input fields have dark background with thin borders
- [ ] Status bar included at top (if applicable)
- [ ] Role badges use monochrome hierarchy
- [ ] Terminal prefixes used (`//`, `>`, `[]`)

---

## 🎬 Animation Guidelines

### Hover Effects
```css
transition-colors duration-200
hover:border-white
hover:bg-[#E5E5E5]
```

### Loading States
```tsx
<div className="flex items-center gap-2">
  <div className="w-2 h-2 bg-white animate-pulse"></div>
  <span className="font-['JetBrains_Mono',monospace] text-xs">PROCESSING...</span>
</div>
```

### Terminal Cursor (Optional)
```tsx
<span className="inline-block w-2 h-4 ml-1 bg-white animate-pulse"></span>
```

---

## 📚 Resources

- **Orbitron Font:** [Google Fonts](https://fonts.google.com/specimen/Orbitron)
- **JetBrains Mono:** [Google Fonts](https://fonts.google.com/specimen/JetBrains+Mono)
- **Design Reference:** `.agent/designs/opencode-terminal-design.md`

---

**Maintained by:** CHST Development Team  
**Questions?** Contact the design system maintainer
