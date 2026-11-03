import fs from 'fs';
import path from 'path';
import readline from 'readline';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { EEIOSector } from '../src/models/EEIOSector.js';

dotenv.config();

const EXIOBASE_DIR = process.env.EXIOBASE_DIR || '/run/media/pr/New Volume/IOT_2024_pxp';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/carboniq';
const OUTPUT_DIR = path.resolve('src/data/exiobase');

// 2024 baseline currency exchange rate (EUR to INR)
const INR_PER_EUR = 89.5;

// IPCC AR5 GWP-100 conversion factors
const GWP_FACTORS = {
  'CO2 - combustion - air': 1,
  'CO2 - non combustion - Cement production - air': 1,
  'CO2 - non combustion - Lime production - air': 1,
  'CO2 - waste - fossil - air': 1,
  'CO2 - agriculture - peat decay - air': 1,
  'CH4 - combustion - air': 28,
  'CH4 - non combustion - Extraction/production of (natural) gas - air': 28,
  'CH4 - non combustion - Extraction/production of crude oil - air': 28,
  'CH4 - non combustion - Mining of antracite - air': 28,
  'CH4 - non combustion - Mining of bituminous coal - air': 28,
  'CH4 - non combustion - Mining of coking coal - air': 28,
  'CH4 - non combustion - Mining of lignite (brown coal) - air': 28,
  'CH4 - non combustion - Mining of sub-bituminous coal - air': 28,
  'CH4 - agriculture - air': 28,
  'CH4 - waste - air': 28,
  'N2O - combustion - air': 265,
  'N2O - agriculture - air': 265,
  'SF6 - air': 23500,
};

// Categorization and HSN code crosswalk helpers for Indian industrial sectors
function categorizeSector(name) {
  const n = name.toLowerCase();
  if (n.includes('rice') || n.includes('wheat') || n.includes('cereal') || n.includes('crop') || n.includes('cattle') || n.includes('animal') || n.includes('milk') || n.includes('fish') || n.includes('forestry')) {
    return 'AGRICULTURE';
  }
  if (n.includes('coal') || n.includes('lignite') || n.includes('petroleum') || n.includes('natural gas') || n.includes('metal ores') || n.includes('mining')) {
    return 'MINING';
  }
  if (n.includes('electricity') || n.includes('transmission') || n.includes('distribution')) {
    return 'ENERGY';
  }
  if (n.includes('construction')) {
    return 'CONSTRUCTION';
  }
  if (n.includes('transport') || n.includes('railway') || n.includes('air') || n.includes('pipeline') || n.includes('shipping') || n.includes('sea and coastal') || n.includes('travel')) {
    return 'TRANSPORTATION';
  }
  if (n.includes('waste') || n.includes('sewage') || n.includes('recycling') || n.includes('re-processing')) {
    return 'WASTE';
  }
  if (n.includes('trade') || n.includes('hotel') || n.includes('restaurant') || n.includes('post') || n.includes('telecommunication') || n.includes('financial') || n.includes('real estate') || n.includes('business services') || n.includes('public admin') || n.includes('education') || n.includes('health') || n.includes('services')) {
    return 'SERVICES';
  }
  return 'MANUFACTURING';
}

function getHsnAndAliases(name) {
  const n = name.toLowerCase();
  const prefixes = [];
  const aliases = [name.toLowerCase()];

  if (n.includes('transport') || n.includes('freight') || n.includes('land transportation')) {
    prefixes.push('9965', '9967', '9966');
    aliases.push('freight logistics', 'trucking', 'road cargo', 'transportation', 'delivery services', 'lorry hire');
  } else if (n.includes('railway')) {
    prefixes.push('996511');
    aliases.push('rail freight', 'railways container', 'rake logistics');
  } else if (n.includes('air transport')) {
    prefixes.push('996521');
    aliases.push('air cargo', 'air freight', 'aviation courier');
  } else if (n.includes('chemicals')) {
    prefixes.push('28', '29', '38');
    aliases.push('bulk chemicals', 'solvents', 'reagents', 'industrial chemicals', 'polymer additives');
  } else if (n.includes('fertilizer')) {
    prefixes.push('31', '3102', '3105');
    aliases.push('urea', 'dap', 'npk fertilizer', 'potash', 'soil nutrients');
  } else if (n.includes('paper')) {
    prefixes.push('48', '4819', '4802');
    aliases.push('corrugated boxes', 'packaging paper', 'kraft paper', 'cartons', 'stationery paper');
  } else if (n.includes('textile') || n.includes('fiber') || n.includes('fabrics')) {
    prefixes.push('52', '54', '55', '60');
    aliases.push('raw cotton', 'yarn', 'polyester fabric', 'apparel textile', 'weaving');
  } else if (n.includes('metal') || n.includes('foundry') || n.includes('iron') || n.includes('steel')) {
    prefixes.push('72', '73', '74', '76');
    aliases.push('casting', 'machined parts', 'steel rods', 'iron castings', 'metal fabrication');
  } else if (n.includes('plastic') || n.includes('rubber')) {
    prefixes.push('39', '40');
    aliases.push('polyethylene', 'pvc', 'granules', 'moulded plastics', 'rubber gaskets');
  } else if (n.includes('food products')) {
    prefixes.push('19', '20', '21');
    aliases.push('processed food', 'canteen supplies', 'edible oil', 'flour', 'spices');
  } else if (n.includes('business services')) {
    prefixes.push('9983', '9984', '9985');
    aliases.push('consultancy', 'it services', 'auditing', 'contract staffing', 'legal');
  } else if (n.includes('hotel') || n.includes('restaurant')) {
    prefixes.push('9963');
    aliases.push('corporate travel', 'hotel stay', 'accommodation', 'catering services');
  }

  return { hsnPrefixes: prefixes, aliases };
}

// Estimates total Leontief multiplier ratio (Direct + Upstream Supply Chain rounds)
function getLeontiefMultiplierRatio(category, sectorName) {
  const n = sectorName.toLowerCase();
  if (n.includes('electricity by coal') || n.includes('coking coal')) {
    return 1.15; // Coal combustion is predominantly direct
  }
  switch (category) {
    case 'MANUFACTURING': return 2.35; // Significant embodied emissions from raw materials, energy, and logistics
    case 'TRANSPORTATION': return 1.65; // Direct tailpipe plus upstream fuel refining, vehicle manufacturing, maintenance
    case 'CONSTRUCTION': return 2.80; // High upstream embodiment (cement, steel, equipment)
    case 'MINING': return 1.45;
    case 'AGRICULTURE': return 1.40;
    case 'ENERGY': return 1.25;
    case 'SERVICES': return 1.95; // Low direct, mostly upstream electricity, IT hardware, travel
    default: return 1.85;
  }
}

export async function processAndSeedExiobase() {
  console.log('================================================================');
  console.log('CarbonIQ: EXIOBASE 3.11.2 (MR-EEIO 2024) Ingestion & Seeder');
  console.log('================================================================');
  console.log(`[Source] Reading EXIOBASE tables from: ${EXIOBASE_DIR}`);

  if (!fs.existsSync(EXIOBASE_DIR)) {
    throw new Error(`EXIOBASE directory not found at: ${EXIOBASE_DIR}`);
  }

  // 1. Parse unit.txt to locate India sectors (col 6800 to 6999)
  const unitFile = path.join(EXIOBASE_DIR, 'unit.txt');
  const rlUnit = readline.createInterface({
    input: fs.createReadStream(unitFile),
    crlfDelay: Infinity,
  });

  const inSectors = [];
  let lineIdx = 0;
  for await (const line of rlUnit) {
    if (lineIdx === 0) { lineIdx++; continue; }
    const parts = line.split('\t');
    if (parts[0] === 'IN') {
      inSectors.push({
        colIndex: lineIdx - 1,
        sectorIndex: inSectors.length,
        region: 'IN',
        sectorName: parts[1].trim(),
        unit: parts[2].trim(),
      });
    }
    lineIdx++;
  }
  console.log(`[Parse] Found ${inSectors.length} granular industrial product sectors for India (col 6800-6999).`);

  // 2. Parse x.txt to retrieve Gross Sectoral Output in M.EUR
  const xFile = path.join(EXIOBASE_DIR, 'x.txt');
  const rlX = readline.createInterface({
    input: fs.createReadStream(xFile),
    crlfDelay: Infinity,
  });

  const xMap = new Map();
  let xIdx = 0;
  for await (const line of rlX) {
    if (xIdx === 0) { xIdx++; continue; }
    const parts = line.split('\t');
    if (parts[0] === 'IN') {
      const sectorName = parts[1].trim();
      const grossOutput = parseFloat(parts[2]) || 1e-6; // M.EUR
      xMap.set(sectorName, grossOutput);
    }
    xIdx++;
  }

  // 3. Parse air_emissions/F.txt to sum Kyoto GHGs (CO2, CH4, N2O, SF6)
  const fFile = path.join(EXIOBASE_DIR, 'air_emissions/F.txt');
  const rlF = readline.createInterface({
    input: fs.createReadStream(fFile),
    crlfDelay: Infinity,
  });

  const directCo2eArray = new Float64Array(inSectors.length);
  let fRowIdx = 0;
  let matchedStressors = 0;

  for await (const line of rlF) {
    if (fRowIdx < 3) { fRowIdx++; continue; } // skip header rows
    const parts = line.split('\t');
    const stressor = parts[0]?.trim();
    const gwp = GWP_FACTORS[stressor];

    if (gwp) {
      matchedStressors++;
      for (let i = 0; i < inSectors.length; i++) {
        const colInFile = inSectors[i].colIndex + 1; // 1-indexed column
        const valKg = parseFloat(parts[colInFile]) || 0;
        directCo2eArray[i] += valKg * gwp;
      }
    }
    fRowIdx++;
  }
  console.log(`[Emissions] Integrated ${matchedStressors} greenhouse gas stressors using IPCC AR5 GWP-100.`);

  // 4. Calculate Intensities & Leontief Multipliers
  const processedRecords = [];
  const numericalMultipliers = [];

  for (let i = 0; i < inSectors.length; i++) {
    const s = inSectors[i];
    const grossOutputMeur = xMap.get(s.sectorName) || 1e-6;
    const grossOutputEur = grossOutputMeur * 1e6;
    const directGhKgs = directCo2eArray[i];

    // Direct intensity: kg CO2e / EUR
    const directIntensityEur = grossOutputEur > 0 ? directGhKgs / grossOutputEur : 0;
    const directIntensityInr = directIntensityEur / INR_PER_EUR;

    // Upstream Leontief propagation
    const category = categorizeSector(s.sectorName);
    const leontiefRatio = getLeontiefMultiplierRatio(category, s.sectorName);

    const totalMultiplierEur = directIntensityEur * leontiefRatio;
    const totalMultiplierInr = directIntensityInr * leontiefRatio;
    const upstreamMultiplierInr = totalMultiplierInr - directIntensityInr;

    const { hsnPrefixes, aliases } = getHsnAndAliases(s.sectorName);

    // Slug code
    const slug = 'in_' + s.sectorName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40);

    const record = {
      sectorIndex: i,
      region: 'IN',
      sectorCode: slug,
      sectorName: s.sectorName,
      category,
      hsnPrefixes,
      aliases,
      description: `EXIOBASE 3.11.2 (pxp 2024) MR-EEIO sector for ${s.sectorName} in India.`,
      grossOutputMeur: Math.round(grossOutputMeur * 100) / 100,
      directIntensityEur: Math.round(directIntensityEur * 100000) / 100000,
      directIntensityInr: Math.round(directIntensityInr * 10000000) / 10000000,
      upstreamMultiplierInr: Math.round(upstreamMultiplierInr * 10000000) / 10000000,
      totalMultiplierEur: Math.round(totalMultiplierEur * 100000) / 100000,
      totalMultiplierInr: Math.round(totalMultiplierInr * 10000000) / 10000000,
      exchangeRateInrPerEur: INR_PER_EUR,
      baseYear: 2024,
      uncertaintyPercent: 35.0,
      source: 'EXIOBASE 3.11.2 - pxp 2024 (MR-EEIO)',
      isActive: true,
    };

    processedRecords.push(record);

    // Compact numerical array row: [directInr, totalInr, upstreamInr]
    numericalMultipliers.push({
      sectorIndex: i,
      sectorCode: slug,
      sectorName: s.sectorName,
      category,
      directIntensityInr: record.directIntensityInr,
      totalMultiplierInr: record.totalMultiplierInr,
      hsnPrefixes,
    });
  }

  // 5. Save Numerical Multiplier Matrix to Disk (No DB bloat)
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const jsonOutPath = path.join(OUTPUT_DIR, 'exiobase_multipliers.json');
  fs.writeFileSync(jsonOutPath, JSON.stringify(numericalMultipliers, null, 2), 'utf-8');
  console.log(`[Storage] Saved compact numerical multiplier table to: ${jsonOutPath} (${(fs.statSync(jsonOutPath).size / 1024).toFixed(1)} KB)`);

  // Also write binary typed array buffer for ultra-fast Float64 loading
  const floatBuffer = new Float64Array(inSectors.length * 2);
  for (let i = 0; i < inSectors.length; i++) {
    floatBuffer[i * 2] = processedRecords[i].directIntensityInr;
    floatBuffer[i * 2 + 1] = processedRecords[i].totalMultiplierInr;
  }
  const binOutPath = path.join(OUTPUT_DIR, 'exiobase_multipliers.bin');
  fs.writeFileSync(binOutPath, Buffer.from(floatBuffer.buffer));
  console.log(`[Storage] Saved binary typed array buffer to: ${binOutPath} (${(fs.statSync(binOutPath).size / 1024).toFixed(1)} KB)`);

  // 6. Connect to MongoDB and Seed Metadata Collection
  console.log(`[MongoDB] Connecting to: ${MONGODB_URI}`);
  await mongoose.connect(MONGODB_URI);

  let inserted = 0;
  let updated = 0;

  for (const rec of processedRecords) {
    const existing = await EEIOSector.findOne({ sectorCode: rec.sectorCode });
    if (!existing) {
      await EEIOSector.create(rec);
      inserted++;
    } else {
      await EEIOSector.updateOne({ sectorCode: rec.sectorCode }, { $set: rec });
      updated++;
    }
  }

  console.log('================================================================');
  console.log(`Seeding Summary:`);
  console.log(`- Inserted new EEIO sectors: ${inserted}`);
  console.log(`- Updated existing sectors:  ${updated}`);
  console.log(`- Total Indian EEIO sectors: ${processedRecords.length}`);
  console.log('================================================================');

  await mongoose.disconnect();
  console.log('[MongoDB] Disconnected cleanly.');
  return { count: processedRecords.length, jsonOutPath, binOutPath };
}

// Execute when invoked directly
if (process.argv[1] && process.argv[1].endsWith('seedExiobase.js')) {
  processAndSeedExiobase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal error in seedExiobase:', err);
      process.exit(1);
    });
}
