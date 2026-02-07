import XLSX from 'xlsx';
import { readFileSync } from 'fs';

const buf = readFileSync('/home/ubuntu/upload/ItemwiseDeliverySalesJan2026.xlsx');
const wb = XLSX.read(buf, { type: 'buffer' });
const ws = wb.Sheets[wb.SheetNames[0]];

// Check raw cells
console.log('Sheet range:', ws['!ref']);
console.log('\nRaw cells A1-F6:');
for (let r = 1; r <= 15; r++) {
  const cells = [];
  for (const col of ['A', 'B', 'C', 'D', 'E', 'F']) {
    const cell = ws[`${col}${r}`];
    cells.push(cell ? `${col}${r}=${JSON.stringify(cell.v)}(${cell.t})` : `${col}${r}=null`);
  }
  console.log(`Row ${r}: ${cells.join(' | ')}`);
}

// Try sheet_to_json with different options
console.log('\n\nWith defval option:');
const rows2 = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false });
console.log('Total rows:', rows2.length);
for (let i = 0; i < Math.min(15, rows2.length); i++) {
  console.log(`Row ${i}: ${JSON.stringify(rows2[i])}`);
}

// Try with raw option
console.log('\n\nWith raw:true:');
const rows3 = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
console.log('Total rows:', rows3.length);
for (let i = 0; i < Math.min(15, rows3.length); i++) {
  console.log(`Row ${i}: ${JSON.stringify(rows3[i])}`);
}
