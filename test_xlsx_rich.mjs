import XLSX from 'xlsx';
import { readFileSync } from 'fs';

const buf = readFileSync('/home/ubuntu/upload/ItemwiseDeliverySalesJan2026.xlsx');
const wb = XLSX.read(buf, { type: 'buffer' });
const ws = wb.Sheets[wb.SheetNames[0]];

// Check if cells have rich text (r property)
console.log('Checking cells with rich text:');
for (let r = 1; r <= 15; r++) {
  for (const col of ['A', 'B', 'C']) {
    const cell = ws[`${col}${r}`];
    if (cell) {
      console.log(`${col}${r}: v="${cell.v}" t=${cell.t} w="${cell.w}" r=${cell.r ? JSON.stringify(cell.r).substring(0, 100) : 'none'} h="${cell.h || 'none'}"`);
    }
  }
}

// Try reading with cellHTML
console.log('\n\nReading with cellHTML:');
const wb2 = XLSX.read(buf, { type: 'buffer', cellHTML: true, cellText: true });
const ws2 = wb2.Sheets[wb2.SheetNames[0]];
for (let r = 1; r <= 15; r++) {
  for (const col of ['A', 'B']) {
    const cell = ws2[`${col}${r}`];
    if (cell) {
      console.log(`${col}${r}: v="${cell.v}" h="${cell.h || 'none'}" w="${cell.w || 'none'}"`);
    }
  }
}

// Try reading with cellFormula
console.log('\n\nReading with cellFormula:');
const wb3 = XLSX.read(buf, { type: 'buffer', cellFormula: true });
const ws3 = wb3.Sheets[wb3.SheetNames[0]];
for (let r = 1; r <= 15; r++) {
  for (const col of ['A', 'B']) {
    const cell = ws3[`${col}${r}`];
    if (cell) {
      console.log(`${col}${r}: v="${cell.v}" f="${cell.f || 'none'}" t=${cell.t}`);
    }
  }
}
