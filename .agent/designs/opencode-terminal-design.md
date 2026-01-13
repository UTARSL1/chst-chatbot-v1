# OpenCode Terminal Design System
## University Research Centre Chatbot - Developer Aesthetic

**Generated using UI/UX Pro Max Design Intelligence**  
**Date:** 2026-01-12  
**Inspiration:** OpenCode, Terminal UIs, Developer Tools  
**Style:** Brutalism, Monochrome, Geometric, Modular

---

## 🎯 Design Philosophy

**Core Principles:**
- **Brutalist Minimalism** - Function over decoration
- **Terminal Aesthetic** - Command-line inspired interface
- **Monochrome Palette** - Black, white, gray dominance
- **Geometric Typography** - Square, modular, techno fonts
- **Sharp Edges** - No rounded corners (or minimal `rounded-sm` only)
- **Grid-Based Layout** - Modular, panel-based structure
- **High Contrast** - Maximum readability
- **Developer-First** - IDE/Terminal familiarity

---

## 🎨 Three Design Variants

### Option 1: Pure Terminal 💻
**Theme:** Classic terminal/command-line interface

**Inspiration:** Unix terminals, SSH sessions, system monitors

### Option 2: Matrix Cyberpunk 🟢
**Theme:** Hacker aesthetic with green accents

**Inspiration:** The Matrix, cyberpunk terminals, data streams

### Option 3: IDE Slate 🔵
**Theme:** Modern code editor interface

**Inspiration:** VS Code, JetBrains IDEs, developer tools

---

## 📐 Option 1: Pure Terminal

### Color Palette
```css
/* Background */
--bg-primary: #0B0B10;        /* Deep Space Black */
--bg-secondary: #1A1A1F;      /* Card Background */
--bg-tertiary: #2A2A2F;       /* Hover State */

/* Text */
--text-primary: #F8FAFC;      /* Star White */
--text-secondary: #94A3B8;    /* Metallic Gray */
--text-muted: #64748B;        /* Dim Gray */

/* Accents */
--accent-primary: #FFFFFF;    /* Pure White */
--accent-secondary: #475569;  /* Steel Gray */

/* Borders */
--border-primary: #1E293B;    /* Subtle Border */
--border-accent: #334155;     /* Visible Border */

/* Status Colors */
--success: #10B981;           /* Terminal Green */
--warning: #F59E0B;           /* Terminal Yellow */
--error: #EF4444;             /* Terminal Red */
--info: #3B82F6;              /* Terminal Blue */
```

### Typography
```css
/* Primary Font: Orbitron (Geometric, Squared) */
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap');

/* Monospace Font: JetBrains Mono */
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');

/* Headings & UI */
font-family: 'Orbitron', sans-serif;
font-weight: 700;
letter-spacing: 0.05em;
text-transform: uppercase;

/* Body Text */
font-family: 'Orbitron', sans-serif;
font-weight: 400;
letter-spacing: 0.02em;

/* Code & Data */
font-family: 'JetBrains Mono', monospace;
font-weight: 500;
```

### Component Styles

#### Card
```tsx
<div className="bg-[#1A1A1F] border border-[#1E293B] p-6">
  {/* Content */}
</div>
```

#### Button
```tsx
<button className="bg-white text-black px-6 py-2 font-['Orbitron'] font-bold uppercase tracking-wider hover:bg-gray-200 transition-colors">
  EXECUTE
</button>
```

#### Input
```tsx
<input className="bg-[#0B0B10] border border-[#334155] text-white font-['JetBrains_Mono'] px-4 py-2 focus:border-white focus:outline-none" />
```

#### Terminal Panel
```tsx
<div className="bg-[#0B0B10] border border-[#1E293B] p-4 font-['JetBrains_Mono'] text-sm">
  <div className="text-[#10B981]">$ user@research-bot:~#</div>
  <div className="text-white">QUERY: 'Impact of AI on urban planning'</div>
  <div className="text-[#94A3B8]">SEARCHING DATABASE... [SUCCESS]</div>
</div>
```

---

## 🟢 Option 2: Matrix Cyberpunk

### Color Palette
```css
/* Background */
--bg-primary: #000000;        /* Pure Black */
--bg-secondary: #0A0A0A;      /* Near Black */
--bg-tertiary: #141414;       /* Subtle Lift */

/* Text */
--text-primary: #FFFFFF;      /* Pure White */
--text-secondary: #00FF41;    /* Matrix Green */
--text-muted: #008F11;        /* Dim Green */

/* Accents */
--accent-primary: #00FF41;    /* Matrix Green */
--accent-glow: #00FF4180;     /* Green Glow (50% opacity) */

/* Borders */
--border-primary: #00FF41;    /* Green Border */
--border-dim: #008F11;        /* Dim Green Border */

/* Status Colors */
--success: #00FF41;           /* Matrix Green */
--warning: #FFFF00;           /* Yellow */
--error: #FF0000;             /* Red */
--info: #00FFFF;              /* Cyan */
```

### Typography
```css
/* Primary Font: Oxanium (Sci-fi Gaming) */
@import url('https://fonts.googleapis.com/css2?family=Oxanium:wght@400;500;600;700;800&display=swap');

/* Monospace Font: Share Tech Mono */
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');

/* Headings & UI */
font-family: 'Oxanium', sans-serif;
font-weight: 700;
letter-spacing: 0.1em;
text-transform: uppercase;

/* Code & Terminal */
font-family: 'Share Tech Mono', monospace;
font-weight: 400;
```

### Component Styles

#### Glowing Card
```tsx
<div className="bg-black border-2 border-[#00FF41] p-6 shadow-[0_0_20px_rgba(0,255,65,0.3)]">
  {/* Content */}
</div>
```

#### Matrix Button
```tsx
<button className="bg-[#00FF41] text-black px-6 py-2 font-['Oxanium'] font-bold uppercase tracking-widest hover:shadow-[0_0_20px_rgba(0,255,65,0.6)] transition-all">
  INITIATE
</button>
```

#### Data Stream
```tsx
<div className="bg-black border border-[#00FF41] p-4">
  <div className="text-[#00FF41] font-['Share_Tech_Mono'] text-xs leading-relaxed">
    01001101 01000001 01010100 01010010 01001001 01011000
    <br />
    ENCRYPTION: ACTIVE...
    <br />
    MATRIX DATA STREAM: CONNECTING...
  </div>
</div>
```

---

## 🔵 Option 3: IDE Slate

### Color Palette
```css
/* Background (VS Code Dark+ inspired) */
--bg-primary: #0F172A;        /* Slate 900 */
--bg-secondary: #1E293B;      /* Slate 800 */
--bg-tertiary: #334155;       /* Slate 700 */

/* Text */
--text-primary: #E2E8F0;      /* Slate 200 */
--text-secondary: #94A3B8;    /* Slate 400 */
--text-muted: #64748B;        /* Slate 500 */

/* Accents */
--accent-primary: #3B82F6;    /* Blue 500 */
--accent-secondary: #60A5FA;  /* Blue 400 */

/* Borders */
--border-primary: #1E293B;    /* Slate 800 */
--border-accent: #334155;     /* Slate 700 */

/* Syntax Highlighting */
--syntax-keyword: #C792EA;    /* Purple */
--syntax-string: #C3E88D;     /* Green */
--syntax-function: #82AAFF;   /* Blue */
--syntax-variable: #EEFFFF;   /* White */
--syntax-comment: #546E7A;    /* Gray */
```

### Typography
```css
/* Primary Font: Rajdhani (Narrow Geometric) */
@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&display=swap');

/* Monospace Font: Fira Code */
@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&display=swap');

/* Headings */
font-family: 'Rajdhani', sans-serif;
font-weight: 600;
letter-spacing: 0.05em;
text-transform: uppercase;

/* Body */
font-family: 'Rajdhani', sans-serif;
font-weight: 400;

/* Code */
font-family: 'Fira Code', monospace;
font-weight: 500;
font-feature-settings: 'liga' 1, 'calt' 1; /* Enable ligatures */
```

### Component Styles

#### Panel
```tsx
<div className="bg-[#1E293B] border-l-2 border-[#3B82F6] p-6">
  {/* Content */}
</div>
```

#### IDE Button
```tsx
<button className="bg-[#3B82F6] text-white px-4 py-1.5 text-sm font-['Rajdhani'] font-semibold uppercase tracking-wide hover:bg-[#60A5FA] transition-colors">
  Run Query
</button>
```

#### Code Block
```tsx
<div className="bg-[#0F172A] border border-[#334155] p-4 font-['Fira_Code'] text-sm">
  <div className="text-[#C792EA]">class</div>
  <div className="text-[#EEFFFF]">UniversityChatbot</div>
  <div className="text-[#546E7A]">// Research assistant</div>
</div>
```

#### Data Table
```tsx
<table className="w-full font-['Fira_Code'] text-sm">
  <thead className="bg-[#1E293B] border-b border-[#334155]">
    <tr className="text-[#94A3B8] uppercase text-xs tracking-wider">
      <th className="px-4 py-2 text-left">USER_ID</th>
      <th className="px-4 py-2 text-left">QUERY_TYPE</th>
      <th className="px-4 py-2 text-right">RESPONSE_TIME</th>
    </tr>
  </thead>
  <tbody className="text-[#E2E8F0]">
    <tr className="border-b border-[#1E293B] hover:bg-[#1E293B]">
      <td className="px-4 py-2">U-1024</td>
      <td className="px-4 py-2">ADMISSION</td>
      <td className="px-4 py-2 text-right">45</td>
    </tr>
  </tbody>
</table>
```

---

## 🔤 Font Comparison & Selection

### Recommended Font Pairings

| Option | Headings/UI | Body/Code | Character |
|--------|-------------|-----------|-----------|
| **1: Pure Terminal** | Orbitron | JetBrains Mono | Squared, geometric, sci-fi |
| **2: Matrix** | Oxanium | Share Tech Mono | Gaming, cyberpunk, edgy |
| **3: IDE Slate** | Rajdhani | Fira Code | Narrow, professional, modern |

### Alternative Fonts (if needed)

**For Headings:**
- **Eurostile Extended** - Classic techno (not on Google Fonts, needs custom)
- **Square 721** - Similar to Eurostile (commercial)
- **Audiowide** - Retro tech, free on Google Fonts
- **Michroma** - Squared, geometric, free

**For Code/Mono:**
- **IBM Plex Mono** - Professional, clean
- **Source Code Pro** - Adobe's coding font
- **Roboto Mono** - Google's monospace
- **Courier Prime** - Classic terminal feel

---

## 🎨 Design System Tokens

### Tailwind Config (Option 1: Pure Terminal)

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: {
            primary: '#0B0B10',
            secondary: '#1A1A1F',
            tertiary: '#2A2A2F',
          },
          text: {
            primary: '#F8FAFC',
            secondary: '#94A3B8',
            muted: '#64748B',
          },
          border: {
            primary: '#1E293B',
            accent: '#334155',
          },
          accent: {
            white: '#FFFFFF',
            gray: '#475569',
          },
          status: {
            success: '#10B981',
            warning: '#F59E0B',
            error: '#EF4444',
            info: '#3B82F6',
          },
        },
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        jetbrains: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        none: '0px',
        sm: '2px', // Maximum for this aesthetic
      },
      letterSpacing: {
        terminal: '0.05em',
        wide: '0.1em',
      },
    },
  },
}
```

---

## 🧩 Component Library

### Terminal Header
```tsx
export function TerminalHeader() {
  return (
    <div className="bg-terminal-bg-secondary border-b border-terminal-border-accent px-6 py-3">
      <div className="flex items-center justify-between font-orbitron text-xs uppercase tracking-terminal">
        <div className="flex items-center gap-6">
          <span className="text-terminal-text-primary font-bold">
            UNIVERSITY RESEARCH TERMINAL v1.4.2
          </span>
          <span className="text-terminal-text-secondary">
            STATUS: ONLINE
          </span>
        </div>
        <div className="flex items-center gap-4 font-jetbrains">
          <span className="text-terminal-text-muted">CPU: 12%</span>
          <span className="text-terminal-text-muted">MEM: 4.5GB</span>
          <span className="text-terminal-text-muted">NET: 1.2Gbps</span>
        </div>
      </div>
    </div>
  );
}
```

### System Status Panel
```tsx
export function SystemStatus() {
  return (
    <div className="bg-terminal-bg-secondary border border-terminal-border-primary p-4">
      <div className="font-orbitron text-sm uppercase tracking-wide text-terminal-text-primary mb-3">
        SYSTEM STATUS
      </div>
      <div className="space-y-2 font-jetbrains text-xs">
        <div className="flex justify-between">
          <span className="text-terminal-text-secondary">DATABASE:</span>
          <span className="text-terminal-status-success">CONNECTED</span>
        </div>
        <div className="flex justify-between">
          <span className="text-terminal-text-secondary">AI MODEL:</span>
          <span className="text-terminal-status-success">ACTIVE</span>
        </div>
        <div className="flex justify-between">
          <span className="text-terminal-text-secondary">LATENCY:</span>
          <span className="text-terminal-text-primary">12ms</span>
        </div>
      </div>
    </div>
  );
}
```

### Command Input
```tsx
export function CommandInput() {
  return (
    <div className="bg-terminal-bg-primary border border-terminal-border-accent p-4">
      <div className="flex items-center gap-2 font-jetbrains text-sm">
        <span className="text-terminal-status-success">{'>'}</span>
        <input
          type="text"
          placeholder="ENTER QUERY..."
          className="flex-1 bg-transparent text-terminal-text-primary placeholder:text-terminal-text-muted focus:outline-none"
        />
        <button className="bg-white text-black px-4 py-1 font-orbitron text-xs font-bold uppercase tracking-wide hover:bg-gray-200">
          SEND
        </button>
      </div>
    </div>
  );
}
```

### Data Table
```tsx
export function DataTable({ data }: { data: any[] }) {
  return (
    <div className="bg-terminal-bg-secondary border border-terminal-border-primary overflow-hidden">
      <div className="bg-terminal-bg-tertiary px-4 py-2 border-b border-terminal-border-accent">
        <h3 className="font-orbitron text-xs uppercase tracking-wide text-terminal-text-primary">
          RECENT FINDINGS (LAST 24H)
        </h3>
      </div>
      <table className="w-full font-jetbrains text-xs">
        <thead className="bg-terminal-bg-primary border-b border-terminal-border-accent">
          <tr className="text-terminal-text-secondary uppercase">
            <th className="px-4 py-2 text-left">TIMESTAMP</th>
            <th className="px-4 py-2 text-left">TYPE</th>
            <th className="px-4 py-2 text-left">TITLE</th>
            <th className="px-4 py-2 text-right">STATUS</th>
          </tr>
        </thead>
        <tbody className="text-terminal-text-primary">
          {data.map((row, i) => (
            <tr key={i} className="border-b border-terminal-border-primary hover:bg-terminal-bg-tertiary">
              <td className="px-4 py-2">{row.timestamp}</td>
              <td className="px-4 py-2">{row.type}</td>
              <td className="px-4 py-2">{row.title}</td>
              <td className="px-4 py-2 text-right">
                <span className="text-terminal-status-success">{row.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 📊 Chart Styling

### Chart Color Palette (Terminal Theme)
```javascript
const chartColors = {
  primary: '#FFFFFF',
  secondary: '#94A3B8',
  tertiary: '#64748B',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
};

// Recharts example
<LineChart data={data}>
  <Line 
    type="monotone" 
    dataKey="value" 
    stroke="#FFFFFF" 
    strokeWidth={2}
    dot={{ fill: '#FFFFFF', r: 4 }}
  />
  <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
  <XAxis 
    stroke="#94A3B8" 
    style={{ fontFamily: 'JetBrains Mono', fontSize: '10px' }}
  />
  <YAxis 
    stroke="#94A3B8"
    style={{ fontFamily: 'JetBrains Mono', fontSize: '10px' }}
  />
</LineChart>
```

---

## 🎯 Layout Patterns

### Grid-Based Dashboard
```tsx
<div className="grid grid-cols-12 gap-4 p-6 bg-terminal-bg-primary min-h-screen">
  {/* Header - Full Width */}
  <div className="col-span-12">
    <TerminalHeader />
  </div>
  
  {/* Sidebar - 3 columns */}
  <div className="col-span-3 space-y-4">
    <SystemStatus />
    <RecentActivity />
  </div>
  
  {/* Main Content - 6 columns */}
  <div className="col-span-6 space-y-4">
    <CommandInput />
    <ChatMessages />
  </div>
  
  {/* Right Panel - 3 columns */}
  <div className="col-span-3 space-y-4">
    <Visualization />
    <SystemLog />
  </div>
</div>
```

---

## ✅ Design Rules

### DO ✓
- Use **uppercase** for headings and labels
- Use **monospace fonts** for data, numbers, timestamps
- Keep **sharp corners** (no rounding or max `rounded-sm`)
- Use **thin borders** (`border` or `border-2` max)
- Maintain **high contrast** (white on black, or light gray on dark)
- Use **grid layouts** for modular panels
- Add **subtle hover states** (slight background change)
- Use **terminal-style prefixes** (`>`, `$`, `//`, `[INFO]`)
- Keep **letter-spacing wide** for headings (`tracking-wide`, `tracking-wider`)

### DON'T ✗
- No rounded corners (`rounded-lg`, `rounded-xl`, `rounded-full`)
- No gradients (unless subtle for Matrix option)
- No shadows (except for Matrix glow effect)
- No colorful accents (stick to monochrome + 1 accent max)
- No decorative elements
- No emoji icons
- No soft/pastel colors
- No script or handwritten fonts

---

## 🌗 Dark Mode

**Note:** These designs are **dark-mode only** by default. Light mode would break the terminal aesthetic.

If light mode is absolutely required, use inverted colors:
```css
.light {
  --bg-primary: #FFFFFF;
  --bg-secondary: #F8FAFC;
  --text-primary: #0B0B10;
  --text-secondary: #475569;
  --border-primary: #E2E8F0;
}
```

**Recommendation:** Keep dark mode only for authenticity.

---

## 📱 Responsive Considerations

### Mobile Adaptations
```tsx
// Stack panels vertically on mobile
<div className="grid grid-cols-1 md:grid-cols-12 gap-4">
  {/* Panels */}
</div>

// Reduce font sizes
<h1 className="text-sm md:text-base lg:text-lg font-orbitron">
  TERMINAL
</h1>

// Hide non-essential panels on mobile
<div className="hidden md:block">
  <SystemStatus />
</div>
```

---

## 🚀 Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Install fonts (Orbitron, JetBrains Mono, Oxanium, Rajdhani, Fira Code)
- [ ] Update Tailwind config with terminal color tokens
- [ ] Create base layout with grid system
- [ ] Build TerminalHeader component
- [ ] Test typography hierarchy

### Phase 2: Core Components (Week 2)
- [ ] Build CommandInput component
- [ ] Create DataTable component
- [ ] Build SystemStatus panel
- [ ] Create card/panel variants
- [ ] Build button variants

### Phase 3: Pages (Week 3)
- [ ] Redesign login page (terminal style)
- [ ] Redesign chat interface
- [ ] Redesign admin dashboard
- [ ] Redesign Scopus Publications page
- [ ] Redesign Knowledge Base

### Phase 4: Polish (Week 4)
- [ ] Add terminal-style loading states
- [ ] Add system log animations
- [ ] Optimize monospace number alignment
- [ ] Add keyboard shortcuts (Ctrl+K, etc.)
- [ ] Performance testing

---

## 🎨 Mockup Comparison

### Current vs. Proposed

| Aspect | Current (Purple-Blue) | Proposed (Terminal) |
|--------|----------------------|---------------------|
| **Background** | Purple gradient | Pure black |
| **Typography** | Rounded sans-serif | Geometric squared |
| **Corners** | Rounded | Sharp/none |
| **Colors** | Purple, blue, gradient | Black, white, gray |
| **Aesthetic** | Consumer SaaS | Developer tool |
| **Uniqueness** | Low (common) | Very high |
| **Credibility** | Medium | High (tech-focused) |

---

## 💡 Recommended Choice

### **Option 1: Pure Terminal** (Recommended)
**Why:**
- Most professional and credible
- Best for data-heavy research dashboards
- Familiar to academic/technical users
- Timeless aesthetic
- Easy to maintain
- Excellent accessibility (high contrast)

### **Option 3: IDE Slate** (Alternative)
**Why:**
- More approachable than pure terminal
- Familiar to developers (VS Code aesthetic)
- Blue accent adds visual interest
- Still maintains professional feel

### **Option 2: Matrix** (Special Use)
**Why:**
- Most unique and eye-catching
- Great for demos/presentations
- May be too edgy for formal academic use
- Best for tech/CS research centres

---

## 📚 Resources

### Font Downloads
- [Orbitron](https://fonts.google.com/specimen/Orbitron)
- [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono)
- [Oxanium](https://fonts.google.com/specimen/Oxanium)
- [Rajdhani](https://fonts.google.com/specimen/Rajdhani)
- [Fira Code](https://fonts.google.com/specimen/Fira+Code)
- [Share Tech Mono](https://fonts.google.com/specimen/Share+Tech+Mono)

### Inspiration
- OpenCode terminal interface
- VS Code dark theme
- GitHub CLI
- Vercel CLI
- Linear app (dark mode)
- Raindrop.io (developer mode)

---

**Next Steps:** Choose your preferred option and I'll implement it across your application! 🚀
