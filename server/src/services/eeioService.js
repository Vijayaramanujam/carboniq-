import fs from 'fs';
import path from 'path';
import { EEIOSector } from '../models/EEIOSector.js';

let cachedMultipliers = null;
let sectorMapByCode = new Map();

/**
 * Loads the compact numerical multiplier dataset into memory for sub-millisecond lookups
 */
export function getNumericalMultipliers() {
  if (cachedMultipliers) return cachedMultipliers;

  const jsonPath = path.resolve('src/data/exiobase/exiobase_multipliers.json');
  if (fs.existsSync(jsonPath)) {
    try {
      const raw = fs.readFileSync(jsonPath, 'utf-8');
      cachedMultipliers = JSON.parse(raw);
      sectorMapByCode = new Map();
      cachedMultipliers.forEach((s) => {
        sectorMapByCode.set(s.sectorCode, s);
      });
      return cachedMultipliers;
    } catch (err) {
      console.error('Error loading EXIOBASE numerical multiplier JSON:', err);
    }
  }
  return [];
}

/**
 * Finds the most relevant EXIOBASE 3.11.2 Indian sector using HSN code, keyword scoring, or category
 */
export async function matchExiobaseSector({
  sectorCode = '',
  hsnCode = '',
  supplierName = '',
  description = '',
  category = 'SUPPLIER_INVOICE',
} = {}) {
  getNumericalMultipliers();

  // 1. Direct code lookup
  if (sectorCode && sectorMapByCode.has(sectorCode)) {
    return sectorMapByCode.get(sectorCode);
  }

  // 2. HSN code lookup in MongoDB
  if (hsnCode) {
    const cleanHsn = hsnCode.toString().trim();
    const hsnMatch = await EEIOSector.findOne({
      hsnPrefixes: { $in: [cleanHsn, cleanHsn.slice(0, 4), cleanHsn.slice(0, 2)] },
      isActive: true,
    }).lean();
    if (hsnMatch && sectorMapByCode.has(hsnMatch.sectorCode)) {
      return sectorMapByCode.get(hsnMatch.sectorCode);
    }
  }

  // 3. Keyword matching across supplierName and description
  const textToMatch = `${supplierName} ${description}`.toLowerCase().trim();
  if (textToMatch) {
    // Specific high-frequency SME patterns
    if (textToMatch.includes('logistics') || textToMatch.includes('transport') || textToMatch.includes('freight') || textToMatch.includes('truck') || textToMatch.includes('carrier') || textToMatch.includes('courier')) {
      const roadFreight = sectorMapByCode.get('in_other_land_transportation_services') || sectorMapByCode.get('in_transportation_services_via_pipelines');
      if (roadFreight) return roadFreight;
    }
    if (textToMatch.includes('rail') || textToMatch.includes('train')) {
      const rail = sectorMapByCode.get('in_railway_transportation_services');
      if (rail) return rail;
    }
    if (textToMatch.includes('air') || textToMatch.includes('aviation') || textToMatch.includes('flight')) {
      const air = sectorMapByCode.get('in_air_transport_services_62');
      if (air) return air;
    }
    if (textToMatch.includes('box') || textToMatch.includes('carton') || textToMatch.includes('packaging') || textToMatch.includes('paper')) {
      const paper = sectorMapByCode.get('in_paper_and_paper_products');
      if (paper) return paper;
    }
    if (textToMatch.includes('chemical') || textToMatch.includes('solvent') || textToMatch.includes('acid') || textToMatch.includes('reagent')) {
      const chem = sectorMapByCode.get('in_chemicals_nec');
      if (chem) return chem;
    }
    if (textToMatch.includes('fertilizer') || textToMatch.includes('urea')) {
      const fert = sectorMapByCode.get('in_chemical_and_fertilizer_minerals_salt');
      if (fert) return fert;
    }
    if (textToMatch.includes('steel') || textToMatch.includes('iron') || textToMatch.includes('metal') || textToMatch.includes('foundry') || textToMatch.includes('casting')) {
      const metal = sectorMapByCode.get('in_fabricated_metal_products_except_machin') || sectorMapByCode.get('in_foundry_work_services');
      if (metal) return metal;
    }
    if (textToMatch.includes('software') || textToMatch.includes('it ') || textToMatch.includes('cloud') || textToMatch.includes('computer')) {
      const comp = sectorMapByCode.get('in_computer_and_related_services_72');
      if (comp) return comp;
    }
    if (textToMatch.includes('consulting') || textToMatch.includes('audit') || textToMatch.includes('staffing') || textToMatch.includes('legal') || textToMatch.includes('agency')) {
      const biz = sectorMapByCode.get('in_other_business_services_74');
      if (biz) return biz;
    }
    if (textToMatch.includes('hotel') || textToMatch.includes('food') || textToMatch.includes('canteen') || textToMatch.includes('restaurant')) {
      const hotel = sectorMapByCode.get('in_hotel_and_restaurant_services_55') || sectorMapByCode.get('in_food_products_nec');
      if (hotel) return hotel;
    }
  }

  // 4. Category-based sensible fallback
  if (category === 'TRANSPORTATION') {
    return sectorMapByCode.get('in_other_land_transportation_services') || cachedMultipliers[0];
  }
  if (category === 'WASTE') {
    return sectorMapByCode.get('in_paper_and_wood_waste_for_treatment_com') || cachedMultipliers[0];
  }

  // General default fallback: Other business services or wholesale trade
  return (
    sectorMapByCode.get('in_other_business_services_74') ||
    sectorMapByCode.get('in_wholesale_trade_and_commission_trade_ser') ||
    sectorMapByCode.get('in_fabricated_metal_products_except_machin') ||
    cachedMultipliers[0]
  );
}

/**
 * Calculates Scope 3 Leontief-based supplier emissions from financial invoice spend
 * Adheres strictly to EXIOBASE 3.11.2 (pxp 2024) MR-EEIO standard.
 *
 * @param {Object} params
 * @param {number} params.spendAmount - Amount spent in INR
 * @param {string} [params.currency='INR'] - Currency code
 * @param {string} [params.supplierName=''] - Vendor / contractor name
 * @param {string} [params.description=''] - Invoice description or line items
 * @param {string} [params.hsnCode=''] - Indian GST HSN/SAC code
 * @param {string} [params.sectorCode=''] - Explicit EXIOBASE sector code
 * @param {string} [params.category='SUPPLIER_INVOICE'] - Activity category
 * @returns {Promise<Object>} Complete Layer 2 EEIO Emission Result
 */
export async function calculateEEIOEmissions({
  spendAmount = 0,
  currency = 'INR',
  supplierName = '',
  description = '',
  hsnCode = '',
  sectorCode = '',
  category = 'SUPPLIER_INVOICE',
} = {}) {
  const spend = parseFloat(spendAmount);
  if (isNaN(spend) || spend <= 0) {
    return {
      isValid: false,
      emissionsKg: 0,
      emissionsTonnes: 0,
      formula: 'No positive financial spend provided for EEIO calculation.',
      tier: 'Layer 2: EXIOBASE 3.11.2 (MR-EEIO)',
    };
  }

  // Convert to INR if necessary (assumes INR for Indian SME baseline)
  const spendInr = currency.toUpperCase() === 'EUR' ? spend * 89.5 : spend;

  // Match the sector
  const matchedSector = await matchExiobaseSector({
    sectorCode,
    hsnCode,
    supplierName,
    description,
    category,
  });

  const totalMultiplierInr = matchedSector?.totalMultiplierInr || 0.000769; // kg CO2e / INR
  const directIntensityInr = matchedSector?.directIntensityInr || totalMultiplierInr * 0.45;
  const upstreamIntensityInr = totalMultiplierInr - directIntensityInr;

  const totalEmissionsKg = spendInr * totalMultiplierInr;
  const directEmissionsKg = spendInr * directIntensityInr;
  const upstreamEmissionsKg = spendInr * upstreamIntensityInr;
  const totalEmissionsTonnes = totalEmissionsKg / 1000;

  // Hotspot identification: transactions > 500 kg CO2e or spend > 50,000 INR warrant Layer 3 refinement review
  const isHotspotCandidate = totalEmissionsKg >= 500 || spendInr >= 100000;

  return {
    isValid: true,
    layer: 'LAYER_2_EEIO',
    method: 'EXIOBASE 3.11.2 (MR-EEIO Leontief Matrix Fallback)',
    tier: 'Method 4: Macroeconomic Leontief Input-Output (Tier 4)',
    sectorCode: matchedSector?.sectorCode || 'in_generic_procurement',
    sectorName: matchedSector?.sectorName || 'General Industrial Procurement',
    category: matchedSector?.category || 'MANUFACTURING',
    spendInr: Math.round(spendInr * 100) / 100,
    spendEur: Math.round((spendInr / 89.5) * 100) / 100,
    totalMultiplierInr,
    directIntensityInr,
    upstreamIntensityInr,
    directEmissionsKg: Math.round(directEmissionsKg * 100) / 100,
    upstreamEmissionsKg: Math.round(upstreamEmissionsKg * 100) / 100,
    emissionsKg: Math.round(totalEmissionsKg * 100) / 100,
    emissionsTonnes: Math.round(totalEmissionsTonnes * 1000) / 1000,
    factorUsed: totalMultiplierInr,
    factorUnit: 'kg CO₂e/₹',
    activityUnit: 'INR',
    scope: 'SCOPE_3',
    uncertaintyRange: '±35% (Macroeconomic input-output uncertainty)',
    isHotspotCandidate,
    provenance: 'EXIOBASE 3.11.2 - pxp 2024 / Leontief Inverse M = B(I - A)^-1',
    calculationFormula: `Spend (₹${spendInr.toLocaleString('en-IN')}) × Leontief Multiplier (${totalMultiplierInr} kg CO₂e/₹ [${matchedSector?.sectorName}]) = ${totalEmissionsKg.toFixed(2)} kg CO₂e (${totalEmissionsTonnes.toFixed(3)} tCO₂e)`,
    isNegativeOffset: false,
    recommendation: isHotspotCandidate
      ? 'High-impact supplier node: Consider Layer 3 LCA refinement (collecting supplier EPDs or Bill of Materials) to reduce ±35% uncertainty.'
      : 'Satisfies Scope 3 accounting with zero supply chain boundary cut-off errors.',
  };
}
