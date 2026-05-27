#!/usr/bin/env python3
"""Resolve the merge conflict in server/_core/index.ts"""

with open('server/_core/index.ts', 'r') as f:
    lines = f.readlines()

# Find conflict markers (skip lines with ============)
start_idx = None
mid_idx = None
end_idx = None

for i, line in enumerate(lines):
    if '<<<<<<< HEAD' in line and '============' not in line:
        start_idx = i
    elif start_idx is not None and mid_idx is None and line.strip() == '=======' :
        mid_idx = i
    elif '>>>>>>> user_github/main' in line:
        end_idx = i
        break

print(f"Conflict markers at lines: {start_idx+1}, {mid_idx+1}, {end_idx+1}")

# Resolved block: keep GitHub version (live COGS) with annanagar added
resolved_lines = [
    "          lines.push(`\\ud83d\\udcca *GROSS MARGIN (Drinks)*`);\n",
    "          const gmOutletOrder = ['palladium', 'tnagar', 'annanagar'];\n",
    "          let gmCombinedRevenue = 0, gmCombinedCogs = 0;\n",
    "          let gmHasData = false;\n",
    "          for (const outlet of gmOutletOrder) {\n",
    "            const o = gmByOutlet[outlet];\n",
    "            if (!o || o.revenue === 0) continue;\n",
    "            gmHasData = true;\n",
    "            const gm = ((o.revenue - o.cogs) / o.revenue * 100).toFixed(1);\n",
    "            const gmRs = Math.round(o.revenue - o.cogs);\n",
    "            const coverage = o.total.size > 0 ? Math.round(o.covered.size / o.total.size * 100) : 0;\n",
    "            const outletName = outlet === 'tnagar' ? 'T.Nagar' : outlet === 'annanagar' ? 'Anna Nagar' : 'Palladium';\n",
    "            lines.push(`${outletName}: \\u20b9${gmRs.toLocaleString('en-IN')} | ${gm}% (${coverage}% recipe coverage)`);\n",
    "            gmCombinedRevenue += o.revenue;\n",
    "            gmCombinedCogs += o.cogs;\n",
    "          }\n",
    "          if (!gmHasData) {\n",
    "            lines.push(`_(no drinks sales data for ${dateStr})_`);\n",
]

# Replace: remove from start_idx through end_idx inclusive
new_lines = lines[:start_idx] + resolved_lines + lines[end_idx+1:]

with open('server/_core/index.ts', 'w') as f:
    f.writelines(new_lines)

print("Conflict resolved!")

# Verify no more conflict markers
with open('server/_core/index.ts', 'r') as f:
    content = f.read()
remaining = [l for l in content.split('\n') if ('<<<<<<' in l or '>>>>>>>' in l) and '============' not in l]
if remaining:
    print(f"WARNING: Still have conflict markers: {remaining}")
else:
    print("No conflict markers remaining - clean!")
