# Terminal Design - Remaining Admin Pages Update Plan

## Pages to Update:

1. ✅ System Prompt - DONE
2. ✅ Tools Management - DONE  
3. Popular Questions
4. Quick Access
5. Invitation Codes
6. Chat History
7. Versions
8. Model Config (if exists)
9. Settings - Departments
10. Settings - Document Types

## Standard Terminal Header Pattern:

```tsx
<h1 className="text-2xl font-bold text-[#3B82F6] font-['Orbitron',sans-serif] uppercase tracking-[0.1em]">
    [PAGE_TITLE]
</h1>
<p className="text-[#94A3B8] font-['JetBrains_Mono',monospace] text-sm">
    // [DESCRIPTION_IN_TERMINAL_FORMAT]
</p>
```

## Button Pattern:
```tsx
className="bg-[#3B82F6] hover:bg-[#2563EB] font-['Orbitron',sans-serif] uppercase tracking-wide text-sm"
```
