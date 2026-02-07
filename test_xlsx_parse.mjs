import XLSX from 'xlsx';
import { readFileSync } from 'fs';

const buf = readFileSync('/home/ubuntu/upload/ItemwiseDeliverySalesJan2026.xlsx');
const wb = XLSX.read(buf, { type: 'buffer' });
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

console.log('Total rows:', rows.length);
console.log('\nFirst 15 rows:');
for (let i = 0; i < Math.min(15, rows.length); i++) {
  console.log(`Row ${i}: ${JSON.stringify(rows[i])}`);
}

// Test the parsing logic
let headerIdx = 0;
for (let i = 0; i < Math.min(rows.length, 10); i++) {
  if (rows[i]?.some((c) => {
    const s = String(c || '').toLowerCase();
    return s === 'category' || s === 'item' || s.includes('item name') || s.includes('qty');
  })) {
    headerIdx = i;
    break;
  }
}
console.log('\nHeader row index:', headerIdx);
console.log('Header row:', JSON.stringify(rows[headerIdx]));

// Parse items
let items = [];
let currentCategory = '';
for (let i = headerIdx + 1; i < rows.length; i++) {
  const row = rows[i];
  if (!row) continue;
  
  const colA = row[0] != null ? String(row[0]).trim() : '';
  const colB = row[1] != null ? String(row[1]).trim() : '';
  const colC = row[2] != null ? String(row[2]).trim() : '';
  const qty = parseFloat(row[4]) || 0;
  const amt = parseFloat(row[5]) || 0;
  
  // Skip metadata rows
  if (['total', 'min.', 'max.', 'avg.', 'sub total', 'grand total'].includes(colA.toLowerCase())) continue;
  
  if (colA && colB && qty > 0) {
    currentCategory = colA;
    items.push({ category: currentCategory, itemName: colB, qty, amt });
  } else if (!colA && colB && qty > 0) {
    items.push({ category: currentCategory, itemName: colB, qty, amt });
  }
}

console.log('\nParsed items:', items.length);
console.log('\nFirst 10 items:');
items.slice(0, 10).forEach((item, i) => {
  console.log(`  ${i + 1}. [${item.category}] ${item.itemName}: qty=${item.qty}, amt=${item.amt}`);
});

console.log('\nLast 5 items:');
items.slice(-5).forEach((item, i) => {
  console.log(`  ${items.length - 4 + i}. [${item.category}] ${item.itemName}: qty=${item.qty}, amt=${item.amt}`);
});
