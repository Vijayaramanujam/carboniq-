import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import { EmissionFactor } from '../src/models/EmissionFactor.js';
import { seedEmissionFactors } from '../scripts/seedEmissionFactors.js';
import { getEmissionFactors, getEmissionFactorSummary } from '../src/controllers/emissionFactorController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const testResults = [];

function recordTest(name, passed, detail) {
  testResults.push({ name, passed, detail });
  const symbol = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${symbol}: ${name}`);
  if (detail) console.log(`   └─ ${detail}`);
}

function mockReqRes(query = {}) {
  let statusCode = 200;
  let responseData = null;
  const req = { query };
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    },
  };
  return { req, res, getData: () => responseData, getStatus: () => statusCode };
}

async function runEmissionFactorTests() {
  console.log('================================================================');
  console.log('CarbonIQ: Emission Factor Database Test Suite');
  console.log('================================================================\n');

  try {
    await connectDB();

    // 1. Model Validation: Valid Record Creation
    try {
      const validDoc = new EmissionFactor({
        activityKey: 'test-diesel-boiler',
        activityName: 'Test Industrial Diesel Boiler',
        category: 'FUEL',
        factorValue: 2.68,
        factorUnit: 'kg CO2e/liter',
        activityUnit: 'liter',
        scope: 'SCOPE_1',
        gasBasis: 'CO2e',
        methodology: 'Test Direct Combustion',
        countryCode: 'IN',
        reportingYear: 2024,
        sourcePublicationYear: 2024,
        sourceOrganization: 'Test Authority',
        sourceDataset: 'Test Fuel Dataset 2024',
        sourceUrl: 'https://example.com/source',
      });

      let validationErr = null;
      try {
        await validDoc.validate();
      } catch (err) {
        validationErr = err;
      }

      recordTest(
        'Test 1: Mongoose EmissionFactor model accepts valid record',
        !validationErr,
        `Activity: ${validDoc.activityName}, Validated without schema errors`
      );
    } catch (err) {
      recordTest('Test 1: Mongoose EmissionFactor model accepts valid record', false, err.message);
    }

    // 2. Model Validation: Reject Invalid Records (Negative value, invalid scope, missing fields)
    try {
      const invalidDoc = new EmissionFactor({
        activityKey: '',
        category: 'INVALID_CATEGORY',
        factorValue: -5.2,
        scope: 'SCOPE_INVALID',
        gasBasis: 'INVALID_GAS',
      });

      let validationErr = null;
      try {
        await invalidDoc.validate();
      } catch (err) {
        validationErr = err;
      }

      const hasErrors =
        validationErr &&
        validationErr.errors['activityKey'] &&
        validationErr.errors['factorValue'] &&
        validationErr.errors['category'] &&
        validationErr.errors['scope'] &&
        validationErr.errors['gasBasis'];

      recordTest(
        'Test 2: Schema rejects invalid categories, negative factors, and unknown scopes',
        Boolean(hasErrors),
        `Rejected with validation errors: ${Object.keys(validationErr?.errors || {}).join(', ')}`
      );
    } catch (err) {
      recordTest('Test 2: Schema rejects invalid categories', false, err.message);
    }

    // 3. Execution of Idempotent Seed Script
    let firstSeedResult = null;
    try {
      // Disconnect so seedEmissionFactors manages its own connection cleanly
      await mongoose.disconnect();
      firstSeedResult = await seedEmissionFactors();
      await connectDB();

      const passed =
        firstSeedResult.success &&
        firstSeedResult.totalInCollection >= 14 &&
        firstSeedResult.rejectedCount === 0;

      recordTest(
        'Test 3: Seed script parses, validates, and ensures verified factor dataset in MongoDB',
        passed,
        `Total in DB: ${firstSeedResult.totalInCollection}, Inserted: ${firstSeedResult.insertedCount}, Skipped: ${firstSeedResult.skippedCount}, Rejected: ${firstSeedResult.rejectedCount}`
      );
    } catch (err) {
      recordTest('Test 3: Seed script initial run', false, err.message);
    }

    // 4. Idempotency Check (Run Seed Script Second Time)
    try {
      await mongoose.disconnect();
      const secondSeedResult = await seedEmissionFactors();
      await connectDB();

      const isIdempotent =
        secondSeedResult.success &&
        secondSeedResult.insertedCount === 0 &&
        secondSeedResult.skippedCount >= 14 &&
        secondSeedResult.totalInCollection === firstSeedResult.totalInCollection;

      recordTest(
        'Test 4: Idempotency: Repeated seed execution produces 0 duplicates (100% skipped)',
        isIdempotent,
        `Inserted: ${secondSeedResult.insertedCount}, Skipped: ${secondSeedResult.skippedCount}, Total in DB: ${secondSeedResult.totalInCollection}`
      );
    } catch (err) {
      recordTest('Test 4: Idempotency second seed run', false, err.message);
    }

    // 5. Historical Coexistence Check (Verify multiple years for same activityKey)
    try {
      const historicalElectricity = await EmissionFactor.find({
        activityKey: 'electricity-grid-in',
        countryCode: 'IN',
      }).sort({ reportingYear: 1 });

      const hasMultipleYears =
        historicalElectricity.length >= 2 &&
        historicalElectricity.some((f) => f.reportingYear === 2023 && f.factorValue === 0.716) &&
        historicalElectricity.some((f) => f.reportingYear === 2024 && f.factorValue === 0.727);

      recordTest(
        'Test 5: Historical Coexistence: Multiple reporting years (2023 & 2024) coexist for electricity-grid-in',
        hasMultipleYears,
        `Found ${historicalElectricity.length} historical versions: ${historicalElectricity.map((f) => `FY${f.reportingYear}: ${f.factorValue} ${f.factorUnit}`).join(' | ')}`
      );
    } catch (err) {
      recordTest('Test 5: Historical Coexistence', false, err.message);
    }

    // 6. Preservation of Existing / User-Created Custom Records
    try {
      const customKey = `custom-solar-ppa-${Date.now()}`;
      await EmissionFactor.create({
        activityKey: customKey,
        activityName: 'Onsite Solar PPA (Zero Direct Scope 2)',
        category: 'ELECTRICITY',
        factorValue: 0.0,
        factorUnit: 'kg CO2/kWh',
        activityUnit: 'kWh',
        scope: 'SCOPE_2',
        gasBasis: 'CO2',
        methodology: 'Market-based Contractual PPA',
        countryCode: 'IN',
        reportingYear: 2024,
        sourcePublicationYear: 2024,
        sourceOrganization: 'Custom User Contract',
        sourceDataset: 'Onsite Solar PPA Verification',
        sourceUrl: 'https://internal.carboniq.local/ppa',
      });

      // Run seeder again
      await mongoose.disconnect();
      await seedEmissionFactors();
      await connectDB();

      const customRetained = await EmissionFactor.findOne({ activityKey: customKey });

      recordTest(
        'Test 6: Safety: Seed script preserves user-created and custom records without deleting them',
        Boolean(customRetained),
        `Custom Record '${customRetained?.activityName}' remained intact in MongoDB.`
      );

      // Clean up test custom record
      if (customRetained) {
        await EmissionFactor.deleteOne({ _id: customRetained._id });
      }
    } catch (err) {
      recordTest('Test 6: Safety of non-seed records', false, err.message);
    }

    // 7. Multi-parameter Querying (Activity, Country, Year, Scope)
    try {
      const dieselScope1 = await EmissionFactor.findOne({
        activityKey: 'fuel-diesel-combustion-in',
        category: 'FUEL',
        countryCode: 'IN',
        scope: 'SCOPE_1',
      });

      const wasteScope3 = await EmissionFactor.findOne({
        category: 'WASTE',
        scope: 'SCOPE_3',
        reportingYear: 2024,
      });

      const queryPassed =
        dieselScope1 &&
        dieselScope1.factorValue === 2.6444 &&
        dieselScope1.factorUnit === 'kg CO2/liter' &&
        wasteScope3 &&
        wasteScope3.factorValue > 0;

      recordTest(
        'Test 7: Collection queries by category, countryCode, scope, and reportingYear return expected verified factors',
        Boolean(queryPassed),
        `Fuel [${dieselScope1?.countryCode}]: ${dieselScope1?.activityName} (${dieselScope1?.factorValue} ${dieselScope1?.factorUnit}), Waste [${wasteScope3?.scope}]: ${wasteScope3?.activityName}`
      );
    } catch (err) {
      recordTest('Test 7: Multi-parameter Querying', false, err.message);
    }

    // 8. Compound Uniqueness Constraint Enforcement
    try {
      // Attempting to manually create a duplicate of an existing factor with same compound key
      const duplicateRecord = new EmissionFactor({
        activityKey: 'electricity-grid-in',
        activityName: 'Duplicate Entry Attempt',
        category: 'ELECTRICITY',
        factorValue: 0.999,
        factorUnit: 'kg CO2/kWh',
        activityUnit: 'kWh',
        scope: 'SCOPE_2',
        gasBasis: 'CO2',
        methodology: 'National Grid Weighted Average Emission Rate (incl. RES)',
        countryCode: 'IN',
        reportingYear: 2024,
        sourcePublicationYear: 2024,
        sourceOrganization: 'Central Electricity Authority of India (CEA)',
        sourceDataset: 'CO2 Baseline Database for the Indian Power Sector, Version 20.0',
        sourceUrl: 'https://cea.nic.in/cdm-co2-baseline-database/?lang=en',
      });

      let duplicateBlocked = false;
      try {
        await duplicateRecord.save();
      } catch (dupErr) {
        duplicateBlocked = dupErr.code === 11000;
      }

      recordTest(
        'Test 8: Compound unique index prevents accidental duplicate insertion (E11000)',
        duplicateBlocked,
        `Duplicate insertion successfully blocked by MongoDB compound index`
      );
    } catch (err) {
      recordTest('Test 8: Compound unique index enforcement', false, err.message);
    }

    // 9. Server-Side Pagination & Non-Overlapping Slices
    try {
      const mockP1 = mockReqRes({ page: '1', limit: '5' });
      await getEmissionFactors(mockP1.req, mockP1.res);
      const resP1 = mockP1.getData();

      const mockP2 = mockReqRes({ page: '2', limit: '5' });
      await getEmissionFactors(mockP2.req, mockP2.res);
      const resP2 = mockP2.getData();

      const p1Ids = new Set(resP1.factors.map((f) => f._id.toString()));
      const hasOverlap = resP2.factors.some((f) => p1Ids.has(f._id.toString()));

      const paginationValid =
        resP1.success &&
        resP1.factors.length === 5 &&
        resP1.pagination.currentPage === 1 &&
        resP1.pagination.pageSize === 5 &&
        resP1.pagination.totalRecords >= 14 &&
        resP1.pagination.totalPages === Math.ceil(resP1.pagination.totalRecords / 5) &&
        resP1.pagination.hasNextPage === true &&
        resP1.pagination.hasPrevPage === false &&
        resP2.factors.length === 5 &&
        resP2.pagination.currentPage === 2 &&
        resP2.pagination.hasPrevPage === true &&
        !hasOverlap;

      recordTest(
        'Test 9: Server-side pagination returns correct slice, non-overlapping IDs, and metadata',
        Boolean(paginationValid),
        `Page 1: ${resP1.factors.length} records, Page 2: ${resP2.factors.length} records, Total: ${resP1.pagination.totalRecords}, Overlap: ${hasOverlap}`
      );
    } catch (err) {
      recordTest('Test 9: Server-side pagination', false, err.message);
    }

    // 10. Multi-Field Search Across activityName, activityKey, aliases, description, organization
    try {
      const mockDiesel = mockReqRes({ search: 'diesel' });
      await getEmissionFactors(mockDiesel.req, mockDiesel.res);
      const dieselRes = mockDiesel.getData();

      const allDieselMatch =
        dieselRes.factors.length > 0 &&
        dieselRes.factors.every((f) =>
          (f.activityName + f.activityKey + (f.description || '') + (f.aliases || []).join(' '))
            .toLowerCase()
            .includes('diesel')
        );

      const mockCEA = mockReqRes({ search: 'Central Electricity Authority' });
      await getEmissionFactors(mockCEA.req, mockCEA.res);
      const ceaRes = mockCEA.getData();
      const ceaMatch =
        ceaRes.factors.length > 0 &&
        ceaRes.factors.every((f) => f.sourceOrganization.includes('Central Electricity Authority'));

      // Test regex safety (special characters should not throw)
      const mockSafeRegex = mockReqRes({ search: 'Diesel (HSD)' });
      await getEmissionFactors(mockSafeRegex.req, mockSafeRegex.res);
      const regexSafe = mockSafeRegex.getStatus() === 200 && mockSafeRegex.getData().success;

      recordTest(
        'Test 10: Multi-field search finds keywords across names, keys, aliases, and orgs safely',
        allDieselMatch && ceaMatch && regexSafe,
        `Matched 'diesel': ${dieselRes.factors.length} records, Matched 'Central Electricity Authority': ${ceaRes.factors.length} records, Regex safe: ${regexSafe}`
      );
    } catch (err) {
      recordTest('Test 10: Multi-field search', false, err.message);
    }

    // 11. Multi-Field Combined Filtering (Category + Scope + Country)
    try {
      const mockCombined = mockReqRes({ category: 'FUEL', scope: 'SCOPE_1', countryCode: 'IN' });
      await getEmissionFactors(mockCombined.req, mockCombined.res);
      const combinedRes = mockCombined.getData();

      const allMatchFilter =
        combinedRes.factors.length > 0 &&
        combinedRes.factors.every(
          (f) => f.category === 'FUEL' && f.scope === 'SCOPE_1' && f.countryCode === 'IN'
        );

      recordTest(
        'Test 11: Multi-field combined filtering enforces simultaneous category, scope, and country constraints',
        allMatchFilter,
        `Found ${combinedRes.factors.length} Indian Scope 1 fuel factors (e.g. ${combinedRes.factors.map((f) => f.activityKey).join(', ')})`
      );
    } catch (err) {
      recordTest('Test 11: Multi-field combined filtering', false, err.message);
    }

    // 12. Multi-Field Sorting Verification
    try {
      // Sort by reportingYear descending
      const mockSortYear = mockReqRes({ sortBy: 'year', sortOrder: 'desc', limit: '20' });
      await getEmissionFactors(mockSortYear.req, mockSortYear.res);
      const yearFactors = mockSortYear.getData().factors;
      const isYearDesc = yearFactors.every(
        (f, i) => i === 0 || f.reportingYear <= yearFactors[i - 1].reportingYear
      );

      // Sort by factorValue ascending
      const mockSortFactor = mockReqRes({ sortBy: 'factor', sortOrder: 'asc', limit: '20' });
      await getEmissionFactors(mockSortFactor.req, mockSortFactor.res);
      const factorList = mockSortFactor.getData().factors;
      const isFactorAsc = factorList.every(
        (f, i) => i === 0 || f.factorValue >= factorList[i - 1].factorValue
      );

      // Sort by activityName ascending
      const mockSortName = mockReqRes({ sortBy: 'name', sortOrder: 'asc', limit: '20' });
      await getEmissionFactors(mockSortName.req, mockSortName.res);
      const nameList = mockSortName.getData().factors;
      const isNameAsc = nameList.every(
        (f, i) => i === 0 || f.activityName.localeCompare(nameList[i - 1].activityName) >= 0
      );

      recordTest(
        'Test 12: Server-side multi-field sorting correctly orders by year (desc), factor (asc), and name (asc)',
        isYearDesc && isFactorAsc && isNameAsc,
        `Year desc: ${isYearDesc}, Factor asc: ${isFactorAsc}, Name asc: ${isNameAsc}`
      );
    } catch (err) {
      recordTest('Test 12: Multi-field sorting verification', false, err.message);
    }

    // 13. Pagination Boundaries, Beyond-Last-Page, and Input Clamping
    try {
      // Beyond last page
      const mockBeyond = mockReqRes({ page: '999', limit: '10' });
      await getEmissionFactors(mockBeyond.req, mockBeyond.res);
      const beyondRes = mockBeyond.getData();
      const beyondHandled =
        beyondRes.success &&
        beyondRes.factors.length === 0 &&
        beyondRes.pagination.currentPage === 999 &&
        beyondRes.pagination.hasNextPage === false &&
        beyondRes.pagination.hasPrevPage === true;

      // Negative values
      const mockNeg = mockReqRes({ page: '-5', limit: '-20' });
      await getEmissionFactors(mockNeg.req, mockNeg.res);
      const negRes = mockNeg.getData();
      const negClamped =
        negRes.pagination.currentPage === 1 && negRes.pagination.pageSize === 12;

      // Non-numeric values
      const mockNaN = mockReqRes({ page: 'foo', limit: 'bar' });
      await getEmissionFactors(mockNaN.req, mockNaN.res);
      const nanClamped =
        mockNaN.getData().pagination.currentPage === 1 && mockNaN.getData().pagination.pageSize === 12;

      // Upper boundary limit capping
      const mockMax = mockReqRes({ limit: '500' });
      await getEmissionFactors(mockMax.req, mockMax.res);
      const maxCapped = mockMax.getData().pagination.pageSize === 100;

      recordTest(
        'Test 13: Pagination boundaries gracefully handle beyond-last-page, negative, NaN, and max limit capping',
        beyondHandled && negClamped && nanClamped && maxCapped,
        `Beyond last page empty array: ${beyondHandled}, Negative clamped: ${negClamped}, NaN clamped: ${nanClamped}, Max limit 500 capped to 100: ${maxCapped}`
      );
    } catch (err) {
      recordTest('Test 13: Pagination boundaries and input clamping', false, err.message);
    }

    // 14. Dynamic Aggregate Summary Statistics & Distinct Filter Options
    try {
      const mockSummary = mockReqRes();
      await getEmissionFactorSummary(mockSummary.req, mockSummary.res);
      const summaryRes = mockSummary.getData();
      const summary = summaryRes.summary;

      const summaryValid =
        summaryRes.success &&
        summary.totalCount >= 14 &&
        summary.activeCount >= 14 &&
        summary.indiaCount >= 4 &&
        summary.scope1Count > 0 &&
        summary.scope2Count > 0 &&
        summary.scope3Count > 0 &&
        Array.isArray(summary.categories) &&
        summary.categories.includes('ELECTRICITY') &&
        summary.categories.includes('FUEL') &&
        Array.isArray(summary.countries) &&
        summary.countries.includes('IN') &&
        Array.isArray(summary.years) &&
        summary.years[0] >= summary.years[summary.years.length - 1];

      recordTest(
        'Test 14: Dynamic aggregate summary endpoint accurately calculates collection-wide KPIs and distinct options',
        Boolean(summaryValid),
        `Total: ${summary?.totalCount}, India: ${summary?.indiaCount}, Scope1: ${summary?.scope1Count}, Scope2: ${summary?.scope2Count}, Scope3: ${summary?.scope3Count}, Years: [${summary?.years?.join(', ')}]`
      );
    } catch (err) {
      recordTest('Test 14: Dynamic aggregate summary statistics', false, err.message);
    }

    // 15. Compound Indexes Verification on MongoDB Collection
    try {
      const indexes = await EmissionFactor.collection.indexes();
      const indexNames = indexes.map((idx) => Object.keys(idx.key).join('_'));

      const hasCompoundUnique = indexes.some(
        (idx) =>
          idx.unique &&
          idx.key.activityKey === 1 &&
          idx.key.countryCode === 1 &&
          idx.key.reportingYear === 1 &&
          idx.key.sourceOrganization === 1 &&
          idx.key.methodology === 1
      );

      const hasCompoundQuery = indexes.some(
        (idx) =>
          idx.key.category === 1 &&
          idx.key.countryCode === 1 &&
          idx.key.reportingYear === -1 &&
          idx.key.activityName === 1
      );

      recordTest(
        'Test 15: MongoDB indexes verified for compound uniqueness and multi-field query performance',
        hasCompoundUnique && hasCompoundQuery,
        `Verified compound unique index and compound query index. Total indexes: ${indexes.length}`
      );
    } catch (err) {
      recordTest('Test 15: Compound indexes verification', false, err.message);
    }

    console.log('\n================================================================');
    const allPassed = testResults.every((t) => t.passed);
    console.log(`Summary: ${testResults.filter((t) => t.passed).length} / ${testResults.length} tests passed.`);
    console.log(allPassed ? '🎉 ALL EMISSION FACTOR TESTS PASSED!' : '⚠️ SOME TESTS FAILED');
    console.log('================================================================');
  } catch (error) {
    console.error('Fatal test error:', error);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

runEmissionFactorTests().catch(console.error);
