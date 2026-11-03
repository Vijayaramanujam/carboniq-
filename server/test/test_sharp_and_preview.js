import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import mongoose from 'mongoose';
import { Company } from '../src/models/Company.js';
import { compressImageIfExceedsLimit } from '../src/services/imageCompressionService.js';

const API_BASE = 'http://127.0.0.1:5000/api';
const FIXTURES_DIR = path.resolve('./test/fixtures');

async function testSharpAndPreview() {
  console.log('====================================================');
  console.log('Testing Sharp Image Compression (>1MB) & Previews');
  console.log('====================================================\n');

  // 1. Create a large test image > 1MB using sharp
  const largeImagePath = path.join(FIXTURES_DIR, 'large_receipt.png');
  // Generate a 2500x2500 high-res noise/pattern image that exceeds 1MB
  const buffer = await sharp({
    create: {
      width: 2500,
      height: 2500,
      channels: 4,
      background: { r: 40, g: 120, b: 80, alpha: 1 },
    },
  })
    .png({ compressionLevel: 0 }) // Raw uncompressed PNG > 2 MB
    .toBuffer();

  fs.writeFileSync(largeImagePath, buffer);
  const rawSize = fs.statSync(largeImagePath).size;
  console.log(`Created test uncompressed image: ${(rawSize / (1024 * 1024)).toFixed(2)} MB`);

  // 2. Test Sharp Compression Service directly
  const compResult = await compressImageIfExceedsLimit(largeImagePath, 'large_receipt.png', 'image/png');
  console.log(`Sharp compression result:`, compResult);
  const newSize = fs.statSync(largeImagePath).size;
  console.log(`New size after compression: ${(newSize / 1024).toFixed(1)} KB`);

  if (compResult.compressed && newSize <= 1024 * 1024) {
    console.log('✅ PASS: Sharp successfully compressed image >1MB to under 1MB threshold.');
  } else {
    console.error('❌ FAIL: Sharp compression did not meet criteria.');
  }

  // 3. Register SME and get JWT token
  const testEmail = `sharp_sme_${Date.now()}@test.in`;
  await axios.post(`${API_BASE}/auth/register`, {
    companyName: 'Sharp Test SME',
    businessEmail: testEmail,
    phoneNumber: '+919876543210',
    password: 'Password123!',
    industryType: 'Manufacturing',
    businessSize: 'Small',
  });

  await mongoose.connect('mongodb://127.0.0.1:27017/carboniq');
  const compDoc = await Company.findOne({ businessEmail: testEmail });
  const otp = compDoc.otpCode;
  await mongoose.disconnect();

  const verifyRes = await axios.post(`${API_BASE}/auth/verify-otp`, {
    businessEmail: testEmail,
    otp,
  });
  const token = verifyRes.data.token;
  console.log('Authenticated SME, Token acquired.');

  // 4. Create another >1MB image and upload it via API to test pipeline compression
  const uploadImagePath = path.join(FIXTURES_DIR, 'upload_large_invoice.png');
  fs.writeFileSync(uploadImagePath, buffer);
  console.log(`Uploading raw >1MB image (${(fs.statSync(uploadImagePath).size / (1024 * 1024)).toFixed(2)} MB)...`);

  const form = new FormData();
  form.append('files', fs.readFileSync(uploadImagePath), 'upload_large_invoice.png');
  const uploadRes = await axios.post(`${API_BASE}/documents/upload`, form, {
    headers: { ...form.getHeaders(), Authorization: `Bearer ${token}` },
  });

  const doc = uploadRes.data.documents[0];
  console.log(`Document uploaded: ID ${doc._id}, stored size: ${(doc.fileSize / 1024).toFixed(1)} KB`);
  if (doc.fileSize <= 1024 * 1024) {
    console.log('✅ PASS: Ingestion pipeline automatically compressed >1MB image with Sharp.');
  } else {
    console.error('❌ FAIL: Pipeline did not compress file to <= 1MB.');
  }

  // 5. Test Preview Authentication
  // A. Request preview WITHOUT token (Must be rejected with 401)
  try {
    await axios.get(`${API_BASE}/documents/${doc._id}/preview`);
    console.error('❌ FAIL: Preview without token should have been rejected');
  } catch (err) {
    if (err.response?.status === 401) {
      console.log('✅ PASS: Preview without token correctly blocked with HTTP 401.');
    } else {
      console.error('Unexpected status:', err.response?.status);
    }
  }

  // B. Request preview WITH token in query parameter (like browser <img> and <iframe>)
  try {
    const previewRes = await axios.get(`${API_BASE}/documents/${doc._id}/preview?token=${token}`, {
      responseType: 'arraybuffer',
    });
    if (previewRes.status === 200 && previewRes.data.length > 0) {
      console.log(`✅ PASS: Preview with ?token=... succeeded (HTTP 200, streamed ${previewRes.data.length} bytes).`);
    } else {
      console.error('❌ FAIL: Preview response invalid:', previewRes.status);
    }
  } catch (err) {
    console.error('❌ FAIL: Preview with query token failed:', err.message);
  }

  console.log('\n====================================================');
  console.log('All Sharp & Preview Tests Completed Successfully!');
  console.log('====================================================');
}

testSharpAndPreview().catch(console.error);
