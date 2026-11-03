import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { processSingleDocument } from '../src/services/processingPipeline.js';
import { Document } from '../src/models/Document.js';
import { ActivityRecord } from '../src/models/ActivityRecord.js';
import { Company } from '../src/models/Company.js';
import { calculateCarbonEmissions } from '../src/services/carbonCalculationService.js';
import { generateSingleDocumentPDF } from '../src/services/statutoryExportService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function runTest() {
  console.log('--- Connecting to MongoDB ---');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/carboniq');

  let company = await Company.findOne();
  if (!company) {
    company = await Company.create({
      name: 'Test MultiScope Global Ltd',
      email: 'test@multiscope.com',
      companyType: 'MANUFACTURING',
      gstin: '27AABCU9603R1ZM',
    });
  }

  // Use the test CSV ledger created in Step 2
  const csvPath = path.join(__dirname, 'test_multi_scope_ledger.csv');
  if (!fs.existsSync(csvPath)) {
    throw new Error('Test CSV not found at ' + csvPath);
  }

  console.log('\n1. Processing multi-scope document through ingestion pipeline...');
  const doc = await processSingleDocument({
    companyId: company._id,
    filePath: csvPath,
    originalFileName: 'test_multi_scope_ledger.csv',
    storedFileName: `test_${Date.now()}.csv`,
    mimeType: 'text/csv',
    fileSize: fs.statSync(csvPath).size,
    sourceType: 'UPLOAD',
  });

  console.log('Document created with ID:', doc._id.toString());
  console.log('Document Scope:', doc.scope);
  console.log('Line Items Count:', doc.lineItems?.length);
  console.log('Initial Summary:', JSON.stringify(doc.multiScopeSummary, null, 2));

  if (doc.scope !== 'MULTI_SCOPE') {
    throw new Error(`Expected scope MULTI_SCOPE, got ${doc.scope}`);
  }

  console.log('\n2. Simulating Review and Bulk Approval (Step 3)...');
  // Simulate review where all 5 items are approved
  const itemsToProcess = doc.lineItems.map(item => ({
    ...item.toObject ? item.toObject() : item,
    isIncluded: true,
  }));

  // Clean any previous
  await ActivityRecord.deleteMany({ documentId: doc._id });

  // Re-aggregate and save
  let s1 = 0, s2 = 0, s3 = 0, offset = 0, validCount = 0;
  const scopesPresent = new Set();
  const includedValidItems = [];

  for (const item of itemsToProcess) {
    if (item.isIncluded !== false) {
      validCount++;
      if (item.scope) scopesPresent.add(item.scope);
      const e = item.emissions || {};
      const kg = Number(e.emissionsKg || 0);
      if (e.isNegativeOffset || kg < 0) {
        offset += Math.abs(kg);
      } else {
        if (item.scope === 'SCOPE_1') s1 += kg;
        else if (item.scope === 'SCOPE_2') s2 += kg;
        else s3 += kg;
      }
      includedValidItems.push(item);
    }
  }

  const netKg = Number(Math.max(0, (s1 + s2 + s3) - offset).toFixed(2));
  doc.multiScopeSummary = {
    scope1Kg: Number(s1.toFixed(2)),
    scope2Kg: Number(s2.toFixed(2)),
    scope3Kg: Number(s3.toFixed(2)),
    offsetKg: Number(offset.toFixed(2)),
    netKg,
    totalRows: doc.lineItems.length,
    validRows: validCount,
    distinctScopes: Array.from(scopesPresent),
  };

  doc.suggestedEmissions = {
    emissionsKg: netKg,
    emissionsTonnes: Number((netKg / 1000).toFixed(4)),
    totalCo2e: netKg,
    scope1Co2e: Number(s1.toFixed(2)),
    scope2Co2e: Number(s2.toFixed(2)),
    scope3Co2e: Number(s3.toFixed(2)),
    netOffsetCo2e: Number(offset.toFixed(2)),
    methodology: 'GHG Protocol Multi-Scope Consolidated Inventory',
    factorKey: 'MULTI_TIER_CONSOLIDATED',
    factorName: `Consolidated Multi-Scope Ledger (${includedValidItems.length} activities)`,
  };

  doc.reviewStatus = 'APPROVED';
  doc.processingStatus = 'COMPLETED';
  doc.validationErrors = [];
  await doc.save();

  const activityDocs = includedValidItems.map((item) => ({
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
  console.log(`Successfully bulk created ${createdActivities.length} ActivityRecord entries!`);

  console.log('\n3. Verifying persisted ActivityRecords in MongoDB:');
  const storedActivities = await ActivityRecord.find({ documentId: doc._id }).lean();
  for (const act of storedActivities) {
    console.log(`- [${act.scope}] Cat: ${act.category} | Qty: ${act.quantity} ${act.unit} | kg CO2e: ${act.carbonEmissions?.emissionsKg} | Offset: ${act.carbonEmissions?.isNegativeOffset || false}`);
  }

  if (storedActivities.length !== 5) {
    throw new Error(`Expected 5 stored activities, found ${storedActivities.length}`);
  }

  const s1Acts = storedActivities.filter(a => a.scope === 'SCOPE_1');
  const s2Acts = storedActivities.filter(a => a.scope === 'SCOPE_2');
  const s3Acts = storedActivities.filter(a => a.scope === 'SCOPE_3');

  console.log(`Scope Breakdown in DB: Scope 1 = ${s1Acts.length}, Scope 2 = ${s2Acts.length}, Scope 3 = ${s3Acts.length}`);
  if (s1Acts.length !== 1 || s2Acts.length !== 1 || s3Acts.length !== 3) {
    throw new Error('Unexpected scope breakdown in DB activities');
  }

  console.log('\n4. Verifying PDF Certificate generation for MULTI_SCOPE:');
  const outPdf = path.join(__dirname, 'test_multiscope_cert.pdf');
  const writeStream = fs.createWriteStream(outPdf);
  generateSingleDocumentPDF(doc, company, writeStream);

  await new Promise((resolve) => writeStream.on('finish', resolve));
  const pdfStat = fs.statSync(outPdf);
  console.log(`Generated PDF certificate successfully: ${pdfStat.size} bytes at ${outPdf}`);

  console.log('\n ALL STEP 3 & STEP 4 BACKEND AND EXPORT TESTS PASSED SUCCESSFULLY!');
  await mongoose.disconnect();
}

runTest().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
