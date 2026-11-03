import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const months = [
  { name: 'Apr 2025', date: '2025-04-15' },
  { name: 'May 2025', date: '2025-05-15' },
  { name: 'Jun 2025', date: '2025-06-15' },
  { name: 'Jul 2025', date: '2025-07-15' },
  { name: 'Aug 2025', date: '2025-08-15' },
  { name: 'Sep 2025', date: '2025-09-15' },
  { name: 'Oct 2025', date: '2025-10-15' },
  { name: 'Nov 2025', date: '2025-11-15' },
  { name: 'Dec 2025', date: '2025-12-15' },
  { name: 'Jan 2026', date: '2026-01-15' },
  { name: 'Feb 2026', date: '2026-02-15' },
  { name: 'Mar 2026', date: '2026-03-15' },
];

const rows = [];

months.forEach((m, idx) => {
  const monthNum = idx + 1;

  // 1. Scope 1: Diesel Fuel for Generator / Utility Vehicle
  rows.push({
    Date: m.date,
    Month: m.name,
    Scope: 'Scope 1',
    Category: 'Fuel',
    Supplier: 'Bharat Petroleum Corp Ltd',
    Description: `Monthly DG Genset Backup Diesel Fuel - ${m.name}`,
    Quantity: 120 + (idx * 8),
    Unit: 'Liters',
    Amount: (120 + (idx * 8)) * 92,
  });

  // 2. Scope 2: Grid Electricity
  rows.push({
    Date: m.date,
    Month: m.name,
    Scope: 'Scope 2',
    Category: 'Electricity',
    Supplier: 'Maharashtra State Electricity Board (MSEDCL)',
    Description: `Factory Grid Power Commercial Tariff - ${m.name}`,
    Quantity: 1500 + (idx * 65),
    Unit: 'kWh',
    Amount: (1500 + (idx * 65)) * 9.5,
  });

  // 3. Scope 3: Logistics Freight Trucking
  rows.push({
    Date: m.date,
    Month: m.name,
    Scope: 'Scope 3',
    Category: 'Transportation',
    Supplier: 'VRL Logistics Freight Services',
    Description: `Regional Finished Goods Transport Trucking - ${m.name}`,
    Quantity: 350 + (idx * 25),
    Unit: 'km',
    Amount: (350 + (idx * 25)) * 32,
  });

  // 4. Scope 3: Waste & Recycling (Every second month - circular offset)
  if (idx % 2 === 0) {
    rows.push({
      Date: m.date,
      Month: m.name,
      Scope: 'Scope 3',
      Category: 'Waste',
      Supplier: 'GreenRecycle Material Recovery Ltd',
      Description: `Corrugated packaging & steel scrap closed-loop recycling offset - ${m.name}`,
      Quantity: 150 + (idx * 15),
      Unit: 'kg',
      Amount: (150 + (idx * 15)) * 14,
    });
  }

  // 5. Scope 3: Supplier Operational Spend
  rows.push({
    Date: m.date,
    Month: m.name,
    Scope: 'Scope 3',
    Category: 'Supplier Spend',
    Supplier: 'Godrej Tooling & Industrial Equipment',
    Description: `Maintenance supplies & industrial consumables procurement - ${m.name}`,
    Quantity: 35000 + (idx * 2200),
    Unit: 'INR',
    Amount: 35000 + (idx * 2200),
  });
});

console.log(`Generated ${rows.length} rows across 12 consecutive operational months.`);

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(rows);
XLSX.utils.book_append_sheet(wb, ws, 'Operational_Carbon_Log');

// Save in server/test/multi_scope_spreadsheet.xlsx and server/test/fixtures/multi_scope_spreadsheet.xlsx
const target1 = path.join(__dirname, 'multi_scope_spreadsheet.xlsx');
const target2 = path.join(__dirname, 'fixtures', 'multi_scope_spreadsheet.xlsx');

XLSX.writeFile(wb, target1);
XLSX.writeFile(wb, target2);

console.log('Saved 12-month multi-scope spreadsheet to:');
console.log('  1.', target1);
console.log('  2.', target2);
