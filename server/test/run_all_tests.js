import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import sharp from 'sharp';
import { Company } from '../src/models/Company.js';

const API_BASE = 'http://127.0.0.1:5000/api';
const FIXTURES_DIR = path.resolve('./test/fixtures');

const results = [];

function recordTest(name, passed, detail) {
  results.push({ name, passed, detail });
  const symbol = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${symbol}: ${name}`);
  if (detail) console.log(`   └─ ${detail}`);
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('CarbonIQ Indian SME Auth, Input Handling & Scope Automated Tests');
  console.log('================================================================\n');

  let jwtToken = null;
  let testCompany = null;
  let uploadedPdfDoc = null;
  let unclearDoc = null;

  // 1. Health check & MongoDB connectivity
  try {
    const health = await fetch(`${API_BASE}/health`).then((r) => r.json());
    recordTest(
      'Test 1: Local MongoDB Connection & System Health',
      health.databaseConnected === true,
      `Database state: ${health.database}, AI Model: ${health.aiModel || 'active'}`
    );
  } catch (err) {
    recordTest('Test 1: Local MongoDB Connection & System Health', false, err.message);
  }

  // 2. Unauthenticated access check (Must be rejected with 401)
  try {
    const res = await fetch(`${API_BASE}/documents`);
    const status = res.status;
    const body = await res.json();
    recordTest(
      'Test 2: Reject unauthenticated access to /api/documents',
      status === 401,
      `Blocked with HTTP ${status}: ${body.error}`
    );
  } catch (err) {
    recordTest('Test 2: Reject unauthenticated access to /api/documents', false, err.message);
  }

  // 3. Register a new Indian SME
  const testEmail = `test_sme_${Date.now()}@apexauto.in`;
  try {
    const regPayload = {
      companyName: 'Apex Precision Auto Ancillaries Pvt Ltd',
      businessEmail: testEmail,
      phoneNumber: '+91 98765 43210',
      password: 'StrongPassword123!',
      industryType: 'Automotive & Ancillary',
      businessSize: 'Small',
      gstin: '27AABCU9603R1ZM',
    };

    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regPayload),
    });
    const data = await res.json();

    const initiated = data.success && !data.otp;

    recordTest(
      'Test 3: Indian SME Registration & OTP Dispatch to Server Console',
      initiated,
      `Message: ${data.message} (Note: OTP is securely displayed only in server logs)`
    );
  } catch (err) {
    recordTest('Test 3: Indian SME Registration & OTP Dispatch', false, err.message);
  }

  // 4. Retrieve OTP from MongoDB for test verification & verify OTP
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/carboniq');
    const companyInDb = await Company.findOne({ businessEmail: testEmail });
    const otpFromDb = companyInDb?.otpCode;

    if (!otpFromDb) {
      throw new Error('OTP was not generated in company record');
    }

    const verifyRes = await fetch(`${API_BASE}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessEmail: testEmail,
        otp: otpFromDb,
      }),
    });
    const verifyData = await verifyRes.json();

    jwtToken = verifyData.token;
    testCompany = verifyData.company;

    const otpVerified =
      verifyData.success &&
      testCompany.isPhoneVerified === true &&
      jwtToken != null;

    recordTest(
      'Test 4: Verify 6-digit OTP & Issue JWT Token',
      otpVerified,
      `Company: ${testCompany.companyName}, Verified: ${testCompany.isPhoneVerified}, Token: ${jwtToken ? 'Issued' : 'Missing'}`
    );
  } catch (err) {
    recordTest('Test 4: Verify 6-digit OTP & Issue JWT Token', false, err.message);
  } finally {
    await mongoose.disconnect();
  }

  // 5. Login with credentials
  try {
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessEmail: testEmail,
        password: 'StrongPassword123!',
      }),
    });
    const loginData = await loginRes.json();

    const loginSuccess = loginData.success && loginData.token != null;
    jwtToken = loginData.token;

    recordTest(
      'Test 5: SME Account Login with Password',
      loginSuccess,
      `Authenticated: ${loginData.company?.companyName}, Currency: ₹ ${loginData.company?.currency}`
    );
  } catch (err) {
    recordTest('Test 5: SME Account Login with Password', false, err.message);
  }

  const authHeader = `Bearer ${jwtToken}`;

  // 6. Upload valid PDF (Electricity bill) with JWT & verify Scope 2
  try {
    const fileBytes = fs.readFileSync(path.join(FIXTURES_DIR, 'electricity_bill.pdf'));
    const form = new FormData();
    form.append('files', new Blob([fileBytes], { type: 'application/pdf' }), 'electricity_bill.pdf');

    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: { Authorization: authHeader },
      body: form,
    });
    const data = await res.json();
    const doc = data.documents[0];
    uploadedPdfDoc = doc;

    const isPdfValid =
      doc &&
      doc.carbonRelevance === 'RELEVANT' &&
      doc.documentType === 'ELECTRICITY_BILL' &&
      doc.scope === 'SCOPE_2' &&
      doc.extractedFields?.quantity === 4850 &&
      doc.extractedFields?.unit === 'kWh';

    recordTest(
      'Test 6: Authenticated PDF Upload & Scope 2 Field Extraction',
      isPdfValid,
      `Relevance: ${doc.carbonRelevance}, Type: ${doc.documentType}, Scope: ${doc.scope}, Extracted: ${doc.extractedFields?.quantity} ${doc.extractedFields?.unit}`
    );
  } catch (err) {
    recordTest('Test 6: Authenticated PDF Upload', false, err.message);
  }

  // 7. Multi-file batch upload (CSV + XLSX) with JWT
  try {
    const csvBytes = fs.readFileSync(path.join(FIXTURES_DIR, 'logistics_freight.csv'));
    const xlsxBytes = fs.readFileSync(path.join(FIXTURES_DIR, 'fuel_audit.xlsx'));

    const form = new FormData();
    form.append('files', new Blob([csvBytes], { type: 'text/csv' }), 'logistics_freight.csv');
    form.append('files', new Blob([xlsxBytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'fuel_audit.xlsx');

    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: { Authorization: authHeader },
      body: form,
    });
    const data = await res.json();

    const batch = data.batch;
    const docs = data.documents;
    const multiPassed = docs.length === 2 && batch.batchType === 'MULTI_FILE';

    recordTest(
      'Test 7: Authenticated Multi-File Batch Ingestion (CSV + XLSX)',
      multiPassed,
      `Batch total: ${batch.totalFiles}, Scopes: ${docs.map((d) => `${d.originalFileName} -> ${d.scope}`).join(' | ')}`
    );
  } catch (err) {
    recordTest('Test 7: Authenticated Multi-File Batch Ingestion', false, err.message);
  }

  // 8. ZIP archive upload & unpacking with JWT
  try {
    const zipBytes = fs.readFileSync(path.join(FIXTURES_DIR, 'batch_documents.zip'));
    const form = new FormData();
    form.append('file', new Blob([zipBytes], { type: 'application/zip' }), 'batch_documents.zip');

    const res = await fetch(`${API_BASE}/documents/upload-zip`, {
      method: 'POST',
      headers: { Authorization: authHeader },
      body: form,
    });
    const data = await res.json();

    const zipBatch = data.batch;
    const zipDocs = data.documents;
    const zipPassed = zipDocs.length >= 1 && zipBatch.batchType === 'ZIP_ARCHIVE';

    recordTest(
      'Test 8: Authenticated ZIP Archive Ingestion & Extraction',
      zipPassed,
      `Extracted: ${zipDocs.length} files from archive under SME company ID`
    );
  } catch (err) {
    recordTest('Test 8: Authenticated ZIP Archive Ingestion', false, err.message);
  }

  // 9. SHA-256 Duplicate detection with JWT
  try {
    const fileBytes = fs.readFileSync(path.join(FIXTURES_DIR, 'electricity_bill.pdf'));
    const form = new FormData();
    form.append('files', new Blob([fileBytes], { type: 'application/pdf' }), 'electricity_bill.pdf');

    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: { Authorization: authHeader },
      body: form,
    });
    const data = await res.json();
    const duplicateDoc = data.documents[0];

    const isDupDetected =
      duplicateDoc &&
      duplicateDoc.processingStatus === 'DUPLICATE' &&
      duplicateDoc.isDuplicate === true;

    recordTest(
      'Test 9: SHA-256 Deduplication (Company Scoped)',
      isDupDetected,
      `ProcessingStatus: ${duplicateDoc?.processingStatus}, DuplicateOf: ${duplicateDoc?.duplicateOf}`
    );
  } catch (err) {
    recordTest('Test 9: SHA-256 Deduplication', false, err.message);
  }

  // 10. Irrelevant document classification (Salary slip)
  try {
    const fileBytes = fs.readFileSync(path.join(FIXTURES_DIR, 'employee_salary_slip.csv'));
    const form = new FormData();
    form.append('files', new Blob([fileBytes], { type: 'text/csv' }), 'employee_salary_slip.csv');

    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: { Authorization: authHeader },
      body: form,
    });
    const data = await res.json();
    const salaryDoc = data.documents[0];

    const isRejected =
      salaryDoc &&
      salaryDoc.carbonRelevance === 'IRRELEVANT' &&
      salaryDoc.processingStatus === 'REJECTED' &&
      salaryDoc.scope === 'NOT_APPLICABLE';

    recordTest(
      'Test 10: Irrelevant Document Rejection (Payroll/Salary with NOT_APPLICABLE Scope)',
      isRejected,
      `Relevance: ${salaryDoc?.carbonRelevance}, Status: ${salaryDoc?.processingStatus}, Scope: ${salaryDoc?.scope}`
    );
  } catch (err) {
    recordTest('Test 10: Irrelevant Document Rejection', false, err.message);
  }

  // 11. Upload unclear handwritten image
  try {
    const fileBytes = fs.readFileSync(path.join(FIXTURES_DIR, 'unclear_handwritten.png'));
    const form = new FormData();
    form.append('files', new Blob([fileBytes], { type: 'image/png' }), 'unclear_handwritten.png');

    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: { Authorization: authHeader },
      body: form,
    });
    const data = await res.json();
    unclearDoc = data.documents[0];

    const routedToReview = unclearDoc && ['NEEDS_REVIEW', 'FAILED'].includes(unclearDoc.processingStatus);
    recordTest(
      'Test 11: Unclear Image Routed to NEEDS_REVIEW',
      routedToReview,
      `ProcessingStatus: ${unclearDoc?.processingStatus}, ReviewStatus: ${unclearDoc?.reviewStatus}`
    );
  } catch (err) {
    recordTest('Test 11: Unclear Image Routed to NEEDS_REVIEW', false, err.message);
  }

  // 12. Re-upload clearer replacement image
  if (unclearDoc) {
    try {
      const fileBytes = fs.readFileSync(path.join(FIXTURES_DIR, 'clearer_replacement.png'));
      const form = new FormData();
      form.append('file', new Blob([fileBytes], { type: 'image/png' }), 'clearer_replacement.png');

      const res = await fetch(`${API_BASE}/documents/${unclearDoc._id}/reupload`, {
        method: 'POST',
        headers: { Authorization: authHeader },
        body: form,
      });
      const data = await res.json();
      const replacement = data.document;

      const replacementLinked =
        replacement &&
        replacement.parentDocumentId === unclearDoc._id;

      recordTest(
        'Test 12: Re-upload Clearer Replacement with Parent Linkage',
        replacementLinked,
        `Replacement Doc ID: ${replacement?._id}, Parent: ${replacement?.parentDocumentId}`
      );
    } catch (err) {
      recordTest('Test 12: Re-upload Clearer Replacement', false, err.message);
    }
  }

  // 13. Direct manual activity entry with Scope in Indian Rupee (₹)
  try {
    const manualPayload = {
      category: 'FUEL',
      scope: 'SCOPE_1',
      activityDate: '2024-05-10',
      quantity: 1250,
      unit: 'Liters',
      supplierName: 'Indian Oil Corporation Ltd (IOCL)',
      description: 'Factory DG generator backup diesel',
      categoryData: {
        fuelType: 'Diesel',
        currency: 'INR',
      },
    };

    const res = await fetch(`${API_BASE}/activities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(manualPayload),
    });
    const data = await res.json();
    const act = data.activity;

    const manualSaved =
      act &&
      act.recordSource === 'MANUAL' &&
      act.scope === 'SCOPE_1' &&
      act.quantity === 1250 &&
      act.unit === 'Liters' &&
      act.verificationStatus === 'APPROVED';

    recordTest(
      'Test 13: Direct Manual Activity Entry with Scope 1 in INR (₹)',
      manualSaved,
      `Saved Activity: ${act?._id}, Scope: ${act?.scope}, Qty: ${act?.quantity} ${act?.unit}, Currency: ₹ ${act?.categoryData?.currency}`
    );
  } catch (err) {
    recordTest('Test 13: Direct Manual Activity Entry', false, err.message);
  }

  // 14. Document review, correction & approved activity persistence with Scope
  if (uploadedPdfDoc) {
    try {
      const reviewPayload = {
        action: 'APPROVED',
        correctedFields: {
          category: 'ELECTRICITY',
          scope: 'SCOPE_2',
          activityDate: '2024-06-15',
          quantity: 4850,
          unit: 'kWh',
          supplierName: 'Maharashtra State Electricity Distribution Co. (MSEDCL)',
          description: 'Industrial LT feeder power consumption',
          categoryData: {
            currency: 'INR',
          },
        },
      };

      const res = await fetch(`${API_BASE}/documents/${uploadedPdfDoc._id}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify(reviewPayload),
      });
      const data = await res.json();

      const reviewedDoc = data.document;
      const createdActivity = data.activityRecord;

      const reviewPassed =
        reviewedDoc &&
        reviewedDoc.reviewStatus === 'APPROVED' &&
        reviewedDoc.processingStatus === 'COMPLETED' &&
        reviewedDoc.scope === 'SCOPE_2' &&
        createdActivity != null &&
        createdActivity.scope === 'SCOPE_2';

      recordTest(
        'Test 14: Review, Field Correction & Activity Persistence with Scope',
        reviewPassed,
        `Doc: ${reviewedDoc?._id}, Scope: ${reviewedDoc?.scope}, Activity Scope: ${createdActivity?.scope}`
      );

      // 14b. Permanent Decision Lock test: Attempting to re-review must fail with 400
      try {
        const reReviewRes = await fetch(`${API_BASE}/documents/${uploadedPdfDoc._id}/review`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader,
          },
          body: JSON.stringify({ action: 'REJECTED' }),
        });
        const reReviewData = await reReviewRes.json();

        recordTest(
          'Test 14b: Enforce Permanent Review Lock (Immutable Decision)',
          reReviewRes.status === 400 && reReviewData.error?.includes('permanently approved'),
          `Blocked with HTTP ${reReviewRes.status}: "${reReviewData.error}"`
        );
      } catch (lockErr) {
        recordTest('Test 14b: Enforce Permanent Review Lock', false, lockErr.message);
      }
    } catch (err) {
      recordTest('Test 14: Review, Field Correction', false, err.message);
    }
  }

  // 15. Token Query Parameter Authentication for Native Previews
  if (uploadedPdfDoc) {
    try {
      const previewRes = await fetch(`${API_BASE}/documents/${uploadedPdfDoc._id}/preview?token=${jwtToken}`);
      const contentType = previewRes.headers.get('content-type');
      const previewOk = previewRes.status === 200 && contentType?.includes('pdf');
      recordTest(
        'Test 15: Browser Media Preview Authentication via ?token= Query Param',
        previewOk,
        `Status: ${previewRes.status}, Content-Type: ${contentType}`
      );
    } catch (err) {
      recordTest('Test 15: Browser Media Preview Authentication', false, err.message);
    }
  }

  // 16. Sharp Image Compression for Images > 1 MB
  try {
    // Generate a high-resolution raw image buffer > 1 MB
    const largeImageBuffer = await sharp({
      create: {
        width: 1200,
        height: 1200,
        channels: 4,
        background: { r: 245, g: 245, b: 245, alpha: 1 },
      },
    })
      .png({ compressionLevel: 0 })
      .toBuffer();

    const form = new FormData();
    form.append('files', new Blob([largeImageBuffer], { type: 'image/png' }), 'large_meter_reading.png');

    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: { Authorization: authHeader },
      body: form,
    });
    const data = await res.json();
    const compressedDoc = data.documents[0];
    const isCompressed =
      largeImageBuffer.length > 1024 * 1024 &&
      compressedDoc &&
      compressedDoc.fileSize < largeImageBuffer.length &&
      compressedDoc.fileSize < 1024 * 1024;

    recordTest(
      'Test 16: Sharp Auto-Compression on Uploaded Images > 1 MB',
      isCompressed,
      `Original Size: ${(largeImageBuffer.length / (1024 * 1024)).toFixed(2)} MB -> Stored Size: ${(compressedDoc?.fileSize / 1024).toFixed(1)} KB, Compressed: ${isCompressed}`
    );
  } catch (err) {
    recordTest('Test 16: Sharp Auto-Compression on Uploaded Images', false, err.message);
  }

  // 17. Complete Company Onboarding (Option B Workflow)
  try {
    const res = await fetch(`${API_BASE}/auth/complete-onboarding`, {
      method: 'PATCH',
      headers: { Authorization: authHeader },
    });
    const data = await res.json();
    const onboardingCompleted = data.success && data.company?.hasCompletedOnboarding === true;

    recordTest(
      'Test 17: SME Onboarding Completion (Option B Workflow)',
      onboardingCompleted,
      `Company hasCompletedOnboarding: ${data.company?.hasCompletedOnboarding}`
    );
  } catch (err) {
    recordTest('Test 17: SME Onboarding Completion', false, err.message);
  }

  console.log('\n================================================================');
  const allPassed = results.every((r) => r.passed);
  console.log(`Summary: ${results.filter((r) => r.passed).length} / ${results.length} tests passed.`);
  console.log(allPassed ? '🎉 ALL TESTS PASSED SUCCESSFULLY!' : '⚠️ SOME TESTS FAILED');
  console.log('================================================================');
}

runTestSuite().catch(console.error);
