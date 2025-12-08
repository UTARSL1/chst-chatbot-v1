import re

# Read the file
with open('app/chat/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Define color replacements for IPSR section only
# We need to be careful to only replace within the IPSR section
color_mappings = {
    'bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-600/20': 'bg-slate-600/10 hover:bg-slate-600/20 border border-slate-600/20',
    'text-emerald-400 group-hover:text-emerald-300': 'text-slate-400 group-hover:text-slate-300',
    'bg-cyan-600/10 hover:bg-cyan-600/20 border border-cyan-600/20': 'bg-slate-600/10 hover:bg-slate-600/20 border border-slate-600/20',
    'text-cyan-400 group-hover:text-cyan-300': 'text-slate-400 group-hover:text-slate-300',
    'bg-amber-600/10 hover:bg-amber-600/20 border border-amber-600/20': 'bg-slate-600/10 hover:bg-slate-600/20 border border-slate-600/20',
    'text-amber-400 group-hover:text-amber-300': 'text-slate-400 group-hover:text-slate-300',
    'bg-rose-600/10 hover:bg-rose-600/20 border border-rose-600/20': 'bg-slate-600/10 hover:bg-slate-600/20 border border-slate-600/20',
    'text-rose-400 group-hover:text-rose-300': 'text-slate-400 group-hover:text-slate-300',
    'bg-green-600/10 hover:bg-green-600/20 border border-green-600/20': 'bg-slate-600/10 hover:bg-slate-600/20 border border-slate-600/20',
    'text-green-400 group-hover:text-green-300': 'text-slate-400 group-hover:text-slate-300',
    'bg-sky-600/10 hover:bg-sky-600/20 border border-sky-600/20': 'bg-slate-600/10 hover:bg-slate-600/20 border border-slate-600/20',
    'text-sky-400 group-hover:text-sky-300': 'text-slate-400 group-hover:text-slate-300',
    'bg-violet-600/10 hover:bg-violet-600/20 border border-violet-600/20': 'bg-slate-600/10 hover:bg-slate-600/20 border border-slate-600/20',
    'text-violet-400 group-hover:text-violet-300': 'text-slate-400 group-hover:text-slate-300',
    'bg-orange-600/10 hover:bg-orange-600/20 border border-orange-600/20': 'bg-slate-600/10 hover:bg-slate-600/20 border border-slate-600/20',
    'text-orange-400 group-hover:text-orange-300': 'text-slate-400 group-hover:text-slate-300',
    'bg-pink-600/10 hover:bg-pink-600/20 border border-pink-600/20': 'bg-slate-600/10 hover:bg-slate-600/20 border border-slate-600/20',
    'text-pink-400 group-hover:text-pink-300': 'text-slate-400 group-hover:text-slate-300',
    'bg-fuchsia-600/10 hover:bg-fuchsia-600/20 border border-fuchsia-600/20': 'bg-slate-600/10 hover:bg-slate-600/20 border border-slate-600/20',
    'text-fuchsia-400 group-hover:text-fuchsia-300': 'text-slate-400 group-hover:text-slate-300',
}

# Apply replacements
for old, new in color_mappings.items():
    content = content.replace(old, new)

# Write back
with open('app/chat/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Color replacements completed successfully!")
