import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { processSingleDocument } from '../src/services/processingPipeline.js';
import { Document } from '../src/models/Document.js';
import { ActivityRecord } from '../src/models/ActivityRecord.js';
import { Company } from '../src/models/Company.js';
import { generateSingleDocumentPDF, aggregateStatutoryData } from '../src/services/statutoryExportService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function runEndToEndTest() {
  console.log('========================================================================');
  console.log('CARBONIQ MULTI-SCOPE 12-MONTH SPREADSHEET (.XLSX) END-TO-END TEST');
  console.log('========================================================================\n');

  console.log('1. Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/carboniq');
  console.log(' Connected to MongoDB.');

  let company = await Company.findOne();
  if (!company) {
    company = await Company.create({
      name: 'Apex Precision Engineering SME Ltd',
      email: 'sustainability@apexprecision.com',
      companyType: 'MANUFACTURING',
      gstin: '27AABCA1234F1Z5',
      annualTurnoverInr: 150000000, // ₹15 Crore
    });
  }

  const excelPath = path.join(__dirname, 'multi_scope_spreadsheet.xlsx');
  if (!fs.existsSync(excelPath)) {
    throw new Error(`Target spreadsheet not found at: ${excelPath}`);
  }

  // Clean up any prior test records of this spreadsheet for idempotent test execution
  await Document.deleteMany({ originalFileName: 'multi_scope_spreadsheet.xlsx', companyId: company._id });

  const fileSize = fs.statSync(excelPath).size;
  console.log(`\n2. Ingesting 12-Month Multi-Scope Spreadsheet (${(fileSize / 1024).toFixed(1)} KB)...`);
  console.log(' File Path:', excelPath);

  const doc = await processSingleDocument({
    companyId: company._id,
    filePath: excelPath,
    originalFileName: 'multi_scope_spreadsheet.xlsx',
    storedFileName: `e2e_multiscope_${Date.now()}.xlsx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    fileSize,
    sourceType: 'UPLOAD',
  });

  console.log('\n--- Ingestion & Extraction Results ---');
  console.log('Document ID:          ', doc._id.toString());
  console.log('Document Type:        ', doc.documentType);
  console.log('Classified Scope:     ', doc.scope);
  console.log('Is Multi-Scope:       ', doc.isMultiScope);
  console.log('Total Line Items:     ', doc.lineItems?.length);
  console.log('Processing Status:    ', doc.processingStatus);

  if (doc.scope !== 'MULTI_SCOPE') {
    throw new Error(`Expected scope MULTI_SCOPE, but got ${doc.scope}`);
  }
  if (!doc.isMultiScope) {
    throw new Error('Expected doc.isMultiScope to be true');
  }
  if (!doc.lineItems || doc.lineItems.length !== 54) {
    throw new Error(`Expected exactly 54 line items, but got ${doc.lineItems?.length}`);
  }

  const summary = doc.multiScopeSummary || {};
  console.log('\n--- Extracted Multi-Scope Baseline Inventory ---');
  console.log('Scope 1 (Direct Diesel):       ', summary.scope1Kg, 'kg CO2e');
  console.log('Scope 2 (Grid Power 0.82):     ', summary.scope2Kg, 'kg CO2e');
  console.log('Scope 3 (Freight & Spend):     ', summary.scope3Kg, 'kg CO2e');
  console.log('Avoided Offsets (Recycling):   ', summary.offsetKg, 'kg CO2e');
  console.log('Net Carbon Footprint:          ', summary.netKg, 'kg CO2e');
  console.log('Distinct Scopes Identified:    ', summary.distinctScopes);

  if (summary.distinctScopes.length !== 3) {
    throw new Error(`Expected 3 distinct scopes, got ${summary.distinctScopes.length}`);
  }
  if (summary.scope1Kg <= 0 || summary.scope2Kg <= 0 || summary.scope3Kg <= 0 || summary.offsetKg <= 0) {
    throw new Error('Expected positive emission values for all scopes and offsets');
  }

  console.log('\n3. Simulating Full SME User Review & Approval (Step 3)...');
  // Clean up any existing activity records for this document
  await ActivityRecord.deleteMany({ documentId: doc._id });

  const includedItems = doc.lineItems.filter(item => item.isIncluded !== false);
  const activityDocs = includedItems.map((item) => ({
    companyId: company._id,
    documentId: doc._id,
    recordSource: 'EXTRACTED',
    category: item.category || 'SUPPLIER_INVOICE',
    scope: item.scope,
    activityDate: item.activityDate || doc.createdAt || new Date(),
    quantity: item.quantity || 0,
    unit: item.unit || 'unit',
    supplierName: item.supplierName || '',
    description: item.description || `Row ${item.rowNumber} from ${doc.originalFileName}`,
    categoryData: {
      ...(item.categoryData || {}),
      currency: 'INR',
      rowIndex: item.rowIndex,
      rowNumber: item.rowNumber,
    },
    carbonEmissions: item.emissions || {},
    verificationStatus: 'APPROVED',
  }));

  const createdActivities = await ActivityRecord.insertMany(activityDocs);
  console.log(` Persisted ${createdActivities.length} verified ActivityRecord rows in MongoDB.`);

  doc.reviewStatus = 'APPROVED';
  doc.processingStatus = 'COMPLETED';
  await doc.save();

  console.log('\n4. Verifying MongoDB ActivityRecord Breakdown by Scope & Category...');
  const dbActivities = await ActivityRecord.find({ documentId: doc._id }).lean();
  if (dbActivities.length !== 54) {
    throw new Error(`Expected 54 activities in DB, found ${dbActivities.length}`);
  }

  const s1 = dbActivities.filter(a => a.scope === 'SCOPE_1');
  const s2 = dbActivities.filter(a => a.scope === 'SCOPE_2');
  const s3 = dbActivities.filter(a => a.scope === 'SCOPE_3');
  const offsets = dbActivities.filter(a => a.carbonEmissions?.isNegativeOffset === true);

  console.log(`- Scope 1 Activities: ${s1.length} (Expected: 12 monthly fuel rows)`);
  console.log(`- Scope 2 Activities: ${s2.length} (Expected: 12 monthly electricity rows)`);
  console.log(`- Scope 3 Activities: ${s3.length} (Expected: 30 freight, spend & recycling rows)`);
  console.log(`- Negative Offsets:   ${offsets.length} (Expected: 6 bi-monthly recycling credit rows)`);

  if (s1.length !== 12 || s2.length !== 12 || s3.length !== 30 || offsets.length !== 6) {
    throw new Error('Database activity breakdown does not match expected 12-month operational pattern!');
  }

  console.log('\n5. Generating Multi-Scope PDF Verification Certificate with Schedule A...');
  const certPath = path.join(__dirname, 'multi_scope_12m_certificate.pdf');
  const pdfStream = fs.createWriteStream(certPath);

  generateSingleDocumentPDF(doc, company, pdfStream);
  await new Promise(resolve => pdfStream.on('finish', resolve));

  const pdfStats = fs.statSync(certPath);
  console.log(` Generated Certificate PDF: ${(pdfStats.size / 1024).toFixed(1)} KB at ${certPath}`);
  if (pdfStats.size < 5000) {
    throw new Error(`PDF size too small (${pdfStats.size} bytes), line-item schedule might be missing.`);
  }

  console.log('\n6. Verifying Statutory BRSR & GHG Rollup Integration...');
  const statutoryData = await aggregateStatutoryData(company._id);
  console.log('Total Approved Activities in Ledger: ', statutoryData.ledger?.length);
  console.log('Statutory Scope 1 Gross Tonnes:      ', statutoryData.brsr.scope1Tonnes, 'tCO2e');
  console.log('Statutory Scope 2 Gross Tonnes:      ', statutoryData.brsr.scope2Tonnes, 'tCO2e');
  console.log('Statutory Scope 3 Gross Tonnes:      ', statutoryData.brsr.scope3GrossTonnes, 'tCO2e');
  console.log('Statutory Avoided Offset Tonnes:     ', statutoryData.brsr.offsetTonnes, 'tCO2e');
  console.log('Statutory Net Corporate Footprint:   ', statutoryData.brsr.netTonnes, 'tCO2e');

  if (statutoryData.brsr.scope1Tonnes <= 0 || statutoryData.brsr.scope2Tonnes <= 0 || statutoryData.brsr.scope3GrossTonnes <= 0) {
    throw new Error('Statutory data aggregation failed to capture all 3 scopes!');
  }

  console.log('\n========================================================================');
  console.log(' ALL STEP 5 & STEP 6 MULTI-SCOPE TESTS COMPLETED SUCCESSFULLY!');
  console.log('========================================================================\n');

  await mongoose.disconnect();
}

runEndToEndTest().catch((err) => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});
