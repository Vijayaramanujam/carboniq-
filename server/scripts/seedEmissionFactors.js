import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import { EmissionFactor } from '../src/models/EmissionFactor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure environment variables are loaded from server/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SEED_DATA_PATH = path.resolve(__dirname, '../src/data/emissionFactors.seed.json');

/**
 * Validates a single emission factor object before committing to MongoDB
 */
function validateFactorRecord(factor, index) {
  const errors = [];

  if (!factor.activityKey || typeof factor.activityKey !== 'string') {
    errors.push('Missing or invalid activityKey');
  }
  if (!factor.activityName || typeof factor.activityName !== 'string') {
    errors.push('Missing or invalid activityName');
  }
  if (!['ELECTRICITY', 'FUEL', 'TRANSPORTATION', 'WASTE', 'PURCHASED_GOODS', 'OTHER'].includes(factor.category)) {
    errors.push(`Invalid category: ${factor.category}`);
  }
  if (typeof factor.factorValue !== 'number' || isNaN(factor.factorValue) || factor.factorValue < 0) {
    errors.push(`Invalid factorValue: ${factor.factorValue}`);
  }
  if (!factor.factorUnit || typeof factor.factorUnit !== 'string') {
    errors.push('Missing or invalid factorUnit');
  }
  if (!factor.activityUnit || typeof factor.activityUnit !== 'string') {
    errors.push('Missing or invalid activityUnit');
  }
  if (!['SCOPE_1', 'SCOPE_2', 'SCOPE_3'].includes(factor.scope)) {
    errors.push(`Invalid scope: ${factor.scope}`);
  }
  if (!['CO2', 'CO2e'].includes(factor.gasBasis)) {
    errors.push(`Invalid gasBasis: ${factor.gasBasis}`);
  }
  if (!factor.methodology || typeof factor.methodology !== 'string') {
    errors.push('Missing or invalid methodology');
  }
  if (!factor.countryCode || typeof factor.countryCode !== 'string') {
    errors.push('Missing or invalid countryCode');
  }
  if (typeof factor.reportingYear !== 'number' || factor.reportingYear < 1990 || factor.reportingYear > 2100) {
    errors.push(`Invalid reportingYear: ${factor.reportingYear}`);
  }
  if (!factor.sourceOrganization || typeof factor.sourceOrganization !== 'string') {
    errors.push('Missing or invalid sourceOrganization');
  }
  if (!factor.sourceDataset || typeof factor.sourceDataset !== 'string') {
    errors.push('Missing or invalid sourceDataset');
  }
  if (!factor.sourceUrl || typeof factor.sourceUrl !== 'string') {
    errors.push('Missing or invalid sourceUrl');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Idempotently seeds the EmissionFactor collection in MongoDB
 */
export async function seedEmissionFactors() {
  console.log('================================================================');
  console.log('CarbonIQ: Emission Factor Database Idempotent Seeder');
  console.log('================================================================\n');

  let insertedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let rejectedCount = 0;
  const rejectionDetails = [];

  try {
    if (!fs.existsSync(SEED_DATA_PATH)) {
      throw new Error(`Seed data file not found at: ${SEED_DATA_PATH}`);
    }

    const rawData = fs.readFileSync(SEED_DATA_PATH, 'utf-8');
    const factorEntries = JSON.parse(rawData);

    if (!Array.isArray(factorEntries) || factorEntries.length === 0) {
      throw new Error('Seed file contains no records or is not a valid JSON array.');
    }

    console.log(`[Seed] Loaded ${factorEntries.length} verified factor record(s) from seed JSON.`);

    // Connect to database using existing project infrastructure
    await connectDB();

    for (let i = 0; i < factorEntries.length; i++) {
      const entry = factorEntries[i];
      const validation = validateFactorRecord(entry, i);

      if (!validation.isValid) {
        rejectedCount++;
        rejectionDetails.push({
          index: i,
          activityKey: entry.activityKey || 'UNKNOWN',
          errors: validation.errors,
        });
        console.warn(`⚠️ Record #${i} (${entry.activityKey || 'UNKNOWN'}) rejected: ${validation.errors.join(', ')}`);
        continue;
      }

      // Stable Compound Identity
      const filter = {
        activityKey: entry.activityKey.trim().toLowerCase(),
        countryCode: entry.countryCode.trim().toUpperCase(),
        reportingYear: entry.reportingYear,
        sourceOrganization: entry.sourceOrganization.trim(),
        methodology: entry.methodology.trim(),
      };

      const existingRecord = await EmissionFactor.findOne(filter);

      if (!existingRecord) {
        // Insert new factor
        await EmissionFactor.create({
          ...entry,
          activityKey: entry.activityKey.trim().toLowerCase(),
          countryCode: entry.countryCode.trim().toUpperCase(),
          verifiedAt: new Date(),
        });
        insertedCount++;
        console.log(`+ Inserted: [${entry.scope}] ${entry.activityName} (${entry.reportingYear}, ${entry.countryCode}) -> ${entry.factorValue} ${entry.factorUnit}`);
      } else {
        // Check if numerical value or metadata has updated
        const hasDifferences =
          existingRecord.factorValue !== entry.factorValue ||
          existingRecord.factorUnit !== entry.factorUnit ||
          existingRecord.activityUnit !== entry.activityUnit ||
          existingRecord.gasBasis !== entry.gasBasis ||
          existingRecord.sourceUrl !== entry.sourceUrl ||
          existingRecord.isActive !== (entry.isActive !== undefined ? entry.isActive : true);

        if (hasDifferences) {
          existingRecord.factorValue = entry.factorValue;
          existingRecord.factorUnit = entry.factorUnit;
          existingRecord.activityUnit = entry.activityUnit;
          existingRecord.gasBasis = entry.gasBasis;
          existingRecord.sourceUrl = entry.sourceUrl;
          existingRecord.sourceReference = entry.sourceReference || existingRecord.sourceReference;
          existingRecord.limitations = entry.limitations || existingRecord.limitations;
          existingRecord.aliases = entry.aliases || existingRecord.aliases;
          existingRecord.isActive = entry.isActive !== undefined ? entry.isActive : existingRecord.isActive;
          existingRecord.verifiedAt = new Date();
          await existingRecord.save();
          updatedCount++;
          console.log(`~ Updated: [${entry.scope}] ${entry.activityName} (${entry.reportingYear}, ${entry.countryCode})`);
        } else {
          skippedCount++;
        }
      }
    }

    const totalInCollection = await EmissionFactor.countDocuments();

    console.log('\n================================================================');
    console.log('Seeding Summary Report:');
    console.log(`- Inserted new factors:     ${insertedCount}`);
    console.log(`- Updated existing factors: ${updatedCount}`);
    console.log(`- Unmodified / Skipped:     ${skippedCount}`);
    console.log(`- Rejected invalid:         ${rejectedCount}`);
    console.log(`- Total factors in DB:      ${totalInCollection}`);
    console.log('================================================================\n');

    if (rejectionDetails.length > 0) {
      console.warn('Rejection Details:', JSON.stringify(rejectionDetails, null, 2));
    }

    return {
      success: true,
      insertedCount,
      updatedCount,
      skippedCount,
      rejectedCount,
      totalInCollection,
    };
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    throw error;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('[MongoDB] Disconnected cleanly.');
    }
  }
}

// Allow direct execution via CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedEmissionFactors()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
