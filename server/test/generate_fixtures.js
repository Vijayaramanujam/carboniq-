import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import AdmZip from 'adm-zip';

const FIXTURES_DIR = path.resolve('./test/fixtures');
if (!fs.existsSync(FIXTURES_DIR)) {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
}

// 1. Generate a genuine minimal valid PDF with exact byte offsets
function createSamplePdf(outputPath, textContent) {
  const contentStream = `BT /F1 12 Tf 50 700 Td (${textContent.replace(/\(/g, '\\(').replace(/\)/g, '\\)')}) Tj ET\n`;
  const streamLength = Buffer.byteLength(contentStream, 'utf8');

  let body = `%PDF-1.4\n`;
  const offsets = [];

  offsets.push(Buffer.byteLength(body, 'utf8'));
  body += `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;

  offsets.push(Buffer.byteLength(body, 'utf8'));
  body += `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`;

  offsets.push(Buffer.byteLength(body, 'utf8'));
  body += `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n`;

  offsets.push(Buffer.byteLength(body, 'utf8'));
  body += `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${contentStream}endstream\nendobj\n`;

  offsets.push(Buffer.byteLength(body, 'utf8'));
  body += `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`;

  const xrefOffset = Buffer.byteLength(body, 'utf8');
  body += `xref\n0 6\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    body += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  body += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  fs.writeFileSync(outputPath, body, 'utf8');
}

// 1. Valid Electricity PDF
createSamplePdf(
  path.join(FIXTURES_DIR, 'electricity_bill.pdf'),
  'PACIFIC ELECTRIC UTILITY - Commercial Invoice Date: 2024-06-15. Total Electricity Consumption: 4850 kWh. Supplier: Pacific Power Corp.'
);

// 2. Irrelevant Salary Slip CSV
fs.writeFileSync(
  path.join(FIXTURES_DIR, 'employee_salary_slip.csv'),
  `Employee,Employee ID,Payslip Month,Basic Salary,Net Pay,Gross Pay,Provident Fund
John Doe,EMP-1029,June 2024,4500,3800,4500,350
Jane Smith,EMP-1030,June 2024,5200,4300,5200,420`
);

// 3. Valid Transportation CSV
fs.writeFileSync(
  path.join(FIXTURES_DIR, 'logistics_freight.csv'),
  `Date,Shipment ID,Transport Mode,Quantity,Unit,Supplier,Description
2024-05-18,SHP-8821,Road / Truck,1420,tonne-km,Global Freight Express,Inter-facility parts delivery
2024-05-19,SHP-8822,Road / Truck,980,tonne-km,Global Freight Express,Warehouse restocking`
);

// 4. Valid Fuel XLSX spreadsheet
const wb = XLSX.utils.book_new();
const wsData = [
  ['Date', 'Fuel Type', 'Quantity', 'Unit', 'Supplier', 'Description'],
  ['2024-04-10', 'Diesel', 3500, 'Liters', 'Apex Petroleum Ltd', 'Fleet generator fuel delivery'],
  ['2024-04-22', 'Diesel', 2200, 'Liters', 'Apex Petroleum Ltd', 'Depot auxiliary fuel'],
];
const ws = XLSX.utils.aoa_to_sheet(wsData);
XLSX.utils.book_append_sheet(wb, ws, 'FuelLog');
XLSX.writeFile(wb, path.join(FIXTURES_DIR, 'fuel_audit.xlsx'));

// 5. Sample image file
const minimalPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
fs.writeFileSync(path.join(FIXTURES_DIR, 'audit_photo.png'), minimalPng);

// 6. Unclear / noisy handwritten sample (unique bytes)
const handwrittenPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
fs.writeFileSync(path.join(FIXTURES_DIR, 'unclear_handwritten.png'), handwrittenPng);

// 7. Clearer replacement image (unique bytes)
const clearerPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mNk+M9QzwAEjAw/AQAbgQX9b7B7nAAAAABJRU5ErkJggg==', 'base64');
fs.writeFileSync(path.join(FIXTURES_DIR, 'clearer_replacement.png'), clearerPng);

// 8. ZIP archive containing supported documents
const validZip = new AdmZip();
validZip.addLocalFile(path.join(FIXTURES_DIR, 'electricity_bill.pdf'));
validZip.addLocalFile(path.join(FIXTURES_DIR, 'logistics_freight.csv'));
validZip.writeZip(path.join(FIXTURES_DIR, 'batch_documents.zip'));

// 9. Unsupported file format
fs.writeFileSync(path.join(FIXTURES_DIR, 'unsupported_script.exe'), 'MZ Dummy Executable content');

// 10. Malformed ZIP archive
fs.writeFileSync(path.join(FIXTURES_DIR, 'corrupted_archive.zip'), 'PK This is not a real zip file header');

console.log('Test fixtures generated successfully in:', FIXTURES_DIR);
