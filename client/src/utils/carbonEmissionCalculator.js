/**
 * Carbon Emission Calculation Engine (Client-Side)
 * Strictly adheres to CARBON_EMISSION_CALCULATION_METHODS.md
 * 
 * Standard Methodologies:
 * - Scope 1 Fuels: Tier 1 (Volume × Emission Factor)
 * - Scope 1 / Scope 3 Transport: Tier 3 (Distance-based km × EF)
 * - Scope 2 Electricity: Activity (kWh) × Indian Grid EF (CEA 2024 Benchmark: 0.82 kg CO2/kWh)
 * - Scope 3 Waste & Recycling: Net CO2 = Processing Emissions - Displaced Material Savings (Offsets)
 * - Method 4 Spend-Based: Spend (INR) × Carbon Multiplier (when physical data is unavailable)
 */

export const EMISSION_BENCHMARKS = {
  // CEA India National Grid Benchmark (CEA Baseline Database 2024 updated from MD)
  ELECTRICITY_CEA_2024: 0.82, // 0.82 kg CO2/kWh
  ELECTRICITY_CEA_2023: 0.727, // 0.727 kg CO2/kWh

  // Fuel Factors (India BEE / MoEFCC / IPCC Tier 1) in kg CO2 per unit
  FUELS: {
    'Diesel': { factor: 2.68, unit: 'kg CO₂/liter', label: 'Diesel (HSD)', defaultUnit: 'Liters' },
    'Petrol / Gasoline': { factor: 2.31, unit: 'kg CO₂/liter', label: 'Petrol (Gasoline)', defaultUnit: 'Liters' },
    'Natural Gas (CNG)': { factor: 2.04, unit: 'kg CO₂/kg', label: 'Compressed Natural Gas (CNG)', defaultUnit: 'kg' },
    'LPG': { factor: 1.51, massFactor: 2.983, unit: 'kg CO₂/liter', label: 'Liquefied Petroleum Gas (LPG)', defaultUnit: 'Liters' },
    'Heavy Fuel Oil': { factor: 2.958, unit: 'kg CO₂/liter', label: 'Heavy Fuel Oil / Furnace Oil', defaultUnit: 'Liters' },
  },

  // Waste Disposal Methods (IPCC Scope 3 / Demirtaş et al. 2021)
  WASTE: {
    'Recycled': {
      processingEmission: 0.043, // 43 kg CO2e/tonne
      displacementSavings: 1.0, // saves ~1000 kg CO2e/tonne virgin pulp/material
      netFactor: -0.957, // Net = -0.957 kg CO2e/kg (Negative Emission / Offset)
      isOffset: true,
      unit: 'kg CO₂e/kg',
      label: 'Closed-Loop Material Recycling',
    },
    'Landfill': {
      factor: 0.520, // 520 kg CO2e/tonne
      unit: 'kg CO₂e/kg',
      isOffset: false,
      label: 'Managed Sanitary Landfill',
    },
    'Composted': {
      factor: 0.048, // 48 kg CO2e/tonne
      unit: 'kg CO₂e/kg',
      isOffset: false,
      label: 'Aerobic Composting',
    },
    'Incineration': {
      factor: 1.074, // 1074 kg CO2e/tonne
      unit: 'kg CO₂e/kg',
      isOffset: false,
      label: 'Thermal Oxidation / Incineration',
    },
  },

  // Transport Modes (IPCC Tier 3 / India GHG Program)
  TRANSPORT: {
    'Road / Truck': { factor: 0.21, unit: 'kg CO₂e/km', label: 'Road Transport / Commercial Vehicle' },
    'Air Freight': { factor: 0.602, unit: 'kg CO₂e/t-km', label: 'Dedicated Air Cargo' },
    'Sea Freight': { factor: 0.016, unit: 'kg CO₂e/t-km', label: 'Container Ocean Freight' },
    'Rail': { factor: 0.028, unit: 'kg CO₂e/t-km', label: 'Rail Cargo / Freight Logistics' },
  },

  // Spend-Based Multipliers (Method 4 MRIO)
  SPEND: {
    INR_DEFAULT: 0.00025, // 0.25 kg CO2e per 1000 INR
    FUEL_INR: 0.023, // ~0.023 kg CO2 per INR
    ELECTRICITY_INR: 0.1025, // ~0.1025 kg CO2 per INR
  },
};

/**
 * Calculates emissions in real-time according to CARBON_EMISSION_CALCULATION_METHODS.md
 */
export function calculateLocalEmissions({
  category = 'ELECTRICITY',
  scope = 'SCOPE_2',
  quantity = 0,
  unit = '',
  fuelType = '',
  transportMode = '',
  wasteType = '',
  disposalMethod = '',
  supplierName = '',
  description = '',
}) {

  const numQty = parseFloat(quantity);
  const cleanUnit = (unit || '').trim().toLowerCase();
  const isCurrency = ['inr', 'rs', 'rs.', '₹', 'rupees'].includes(cleanUnit);

  if ((isNaN(numQty) || numQty <= 0) && !isCurrency) {
    return {
      isValid: false,
      emissionsKg: 0,
      emissionsTonnes: 0,
      formula: 'Enter positive consumption quantity to calculate emissions.',
      factorUsed: null,
      factorUnit: '',
      isNegativeOffset: false,
      tier: 'N/A',
      standard: 'GHG Protocol / IPCC / CEA',
    };
  }

  // 1. ELECTRICITY (Scope 2)
  if (category === 'ELECTRICITY') {
    if (isCurrency) {
      const factor = EMISSION_BENCHMARKS.SPEND.ELECTRICITY_INR;
      const emKg = numQty * factor;
      return {
        isValid: true,
        emissionsKg: Math.round(emKg * 100) / 100,
        emissionsTonnes: Math.round((emKg / 1000) * 1000) / 1000,
        formula: `Spend (₹${numQty.toLocaleString('en-IN')}) × Multiplier (${factor} kg CO₂/₹) = ${emKg.toFixed(2)} kg CO₂e`,
        factorUsed: factor,
        factorUnit: 'kg CO₂/₹',
        tier: 'Method 4: Spend-Based',
        standard: 'CARBON_EMISSION_CALCULATION_METHODS.md (Method 4 Commercial Tariff)',
        scope: 'SCOPE_2',
        sourceName: 'CEA Commercial Tariff MRIO Benchmark',
        isNegativeOffset: false,
        insights: 'Physical consumption in kWh yields Tier 1 precision.',
      };
    }

    let kwh = numQty;
    if (cleanUnit === 'mwh') kwh = numQty * 1000;

    const factor = EMISSION_BENCHMARKS.ELECTRICITY_CEA_2024; // 0.82 kg CO2/kWh
    const emKg = kwh * factor;
    const emTonnes = emKg / 1000;

    return {
      isValid: true,
      emissionsKg: Math.round(emKg * 100) / 100,
      emissionsTonnes: Math.round(emTonnes * 1000) / 1000,
      formula: `${kwh.toLocaleString()} kWh × ${factor} kg CO₂/kWh (CEA Grid 2024) = ${emKg.toFixed(2)} kg CO₂e`,
      factorUsed: factor,
      factorUnit: 'kg CO₂/kWh',
      tier: 'IPCC Tier 1 (Activity-Based)',
      standard: 'Central Electricity Authority (CEA) CO₂ Baseline v20.0',
      scope: 'SCOPE_2',
      sourceName: 'Central Electricity Authority (CEA) / India National Grid 2024',
      isNegativeOffset: false,
      insights: 'Switching to rooftop solar PV or Green Power Open Access yields 0.00 kg CO₂/kWh Scope 2 emissions.',
    };
  }

  // 2. FUEL (Scope 1)
  if (category === 'FUEL') {
    if (isCurrency) {
      const factor = EMISSION_BENCHMARKS.SPEND.FUEL_INR;
      const emKg = numQty * factor;
      return {
        isValid: true,
        emissionsKg: Math.round(emKg * 100) / 100,
        emissionsTonnes: Math.round((emKg / 1000) * 1000) / 1000,
        formula: `Spend (₹${numQty.toLocaleString('en-IN')}) × Multiplier (${factor} kg CO₂/₹) = ${emKg.toFixed(2)} kg CO₂e`,
        factorUsed: factor,
        factorUnit: 'kg CO₂/₹',
        tier: 'Method 4: Spend-Based',
        standard: 'CARBON_EMISSION_CALCULATION_METHODS.md (Fuel Spend Fallback)',
        scope: 'SCOPE_1',
        sourceName: 'BEE / MoEFCC Spend Multiplier',
        isNegativeOffset: false,
        insights: 'Verify fuel volume in liters from receipt for Tier 1 standard reporting.',
      };
    }

    const matchedFuel = EMISSION_BENCHMARKS.FUELS[fuelType] || EMISSION_BENCHMARKS.FUELS['Diesel'];
    let vol = numQty;
    if (cleanUnit === 'gal' || cleanUnit === 'gallon' || cleanUnit === 'gallons') {
      vol = numQty * 3.78541;
    }

    let factor = matchedFuel.factor;
    let factorUnit = matchedFuel.unit;

    if (fuelType === 'LPG' && (cleanUnit === 'kg' || cleanUnit === 'kgs')) {
      factor = matchedFuel.massFactor;
      factorUnit = 'kg CO₂/kg';
    }

    const emKg = vol * factor;
    const emTonnes = emKg / 1000;

    return {
      isValid: true,
      emissionsKg: Math.round(emKg * 100) / 100,
      emissionsTonnes: Math.round(emTonnes * 1000) / 1000,
      formula: `${vol.toLocaleString()} ${unit || matchedFuel.defaultUnit} × ${factor} ${factorUnit} = ${emKg.toFixed(2)} kg CO₂e`,
      factorUsed: factor,
      factorUnit,
      tier: 'IPCC Tier 1 (Volume × Factor)',
      standard: 'India BEE / MoEFCC / IPCC Guidelines',
      scope: 'SCOPE_1',
      sourceName: `${matchedFuel.label} Combustion Baseline`,
      isNegativeOffset: false,
      insights: 'Electrification of fleet or blending with biodiesel/E20 reduces direct Scope 1 tailpipe footprint.',
    };
  }

  // 3. WASTE & RECYCLING (Scope 3)
  if (category === 'WASTE') {
    let massKg = numQty;
    if (['ton', 'tons', 'tonne', 'tonnes', 'mt'].includes(cleanUnit)) massKg = numQty * 1000;
    if (['lbs', 'pound', 'pounds'].includes(cleanUnit)) massKg = numQty * 0.453592;

    const matchedWaste = EMISSION_BENCHMARKS.WASTE[disposalMethod] || EMISSION_BENCHMARKS.WASTE['Landfill'];

    if (disposalMethod === 'Recycled') {
      const netFactor = matchedWaste.netFactor; // -0.957 kg CO2e/kg
      const netEmKg = massKg * netFactor;
      const avoidedKg = Math.abs(netEmKg);
      const avoidedTonnes = avoidedKg / 1000;

      return {
        isValid: true,
        emissionsKg: Math.round(netEmKg * 100) / 100, // Negative!
        emissionsTonnes: Math.round((netEmKg / 1000) * 1000) / 1000,
        formula: `${massKg.toLocaleString()} kg recycled × ${netFactor} kg CO₂e/kg = ${netEmKg.toFixed(2)} kg CO₂e (Avoids ${avoidedKg.toFixed(2)} kg CO₂e)`,
        factorUsed: netFactor,
        factorUnit: 'kg CO₂e/kg',
        tier: 'Scope 3 Avoided Emissions Offset',
        standard: 'CARBON_EMISSION_CALCULATION_METHODS.md (Displacement Offset Formula)',
        scope: 'SCOPE_3',
        sourceName: `${wasteType || 'Material'} Closed-Loop Recycling`,
        isNegativeOffset: true,
        avoidedKg: Math.round(avoidedKg * 100) / 100,
        avoidedTonnes: Math.round(avoidedTonnes * 1000) / 1000,
        insights: 'Recycling creates negative emissions by displacing virgin raw material extraction and production!',
      };
    }

    const factor = matchedWaste.factor;
    const emKg = massKg * factor;
    const emTonnes = emKg / 1000;

    return {
      isValid: true,
      emissionsKg: Math.round(emKg * 100) / 100,
      emissionsTonnes: Math.round(emTonnes * 1000) / 1000,
      formula: `${massKg.toLocaleString()} kg × ${factor} kg CO₂e/kg = ${emKg.toFixed(2)} kg CO₂e`,
      factorUsed: factor,
      factorUnit: 'kg CO₂e/kg',
      tier: 'IPCC Tier 1 Waste',
      standard: 'IPCC Guidelines for National Greenhouse Gas Inventories',
      scope: 'SCOPE_3',
      sourceName: matchedWaste.label,
      isNegativeOffset: false,
      insights: 'Diverting waste away from landfill to certified recycling turns positive emissions into negative carbon offsets.',
    };
  }

  // 4. TRANSPORTATION (Scope 1 / Scope 3)
  if (category === 'TRANSPORTATION') {
    let km = numQty;
    if (cleanUnit === 'miles' || cleanUnit === 'mi') km = numQty * 1.60934;

    const matchedMode = EMISSION_BENCHMARKS.TRANSPORT[transportMode] || EMISSION_BENCHMARKS.TRANSPORT['Road / Truck'];
    const factor = matchedMode.factor;
    const emKg = km * factor;
    const emTonnes = emKg / 1000;

    return {
      isValid: true,
      emissionsKg: Math.round(emKg * 100) / 100,
      emissionsTonnes: Math.round(emTonnes * 1000) / 1000,
      formula: `${km.toLocaleString()} ${unit || 'km'} × ${factor} ${matchedMode.unit} = ${emKg.toFixed(2)} kg CO₂e`,
      factorUsed: factor,
      factorUnit: matchedMode.unit,
      tier: 'IPCC Tier 3 (Distance-Based)',
      standard: 'India GHG Program / IPCC Logistics Guidance',
      scope: scope || 'SCOPE_3',
      sourceName: matchedMode.label,
      isNegativeOffset: false,
      insights: 'Optimizing vehicle load factors and adopting EV commercial vehicles cuts distribution emissions by >70%.',
    };
  }

  // 5. SUPPLIER INVOICE / SPEND (Scope 3 - EXIOBASE 3.11.2 EEIO Engine)
  // Multipliers extracted from EXIOBASE 3.11.2 (2024 pxp table for India)
  const EXIOBASE_SECTOR_LOOKUP = [
    { keywords: ['logistics', 'freight', 'transport', 'shipping', 'courier', 'delivery'], name: 'Transport via road (60.2)', multiplier: 0.002257, direct: 0.001614, upstream: 0.000643 },
    { keywords: ['chemical', 'reagent', 'solvent', 'polymer', 'acid', 'fertilizer'], name: 'Chemicals nec (24.1)', multiplier: 0.007223, direct: 0.005120, upstream: 0.002103 },
    { keywords: ['paper', 'carton', 'packaging', 'box', 'corrugated'], name: 'Pulp, paper and paper products (21)', multiplier: 0.002591, direct: 0.001850, upstream: 0.000741 },
    { keywords: ['plastic', 'rubber', 'pvc'], name: 'Rubber and plastic products (25)', multiplier: 0.003150, direct: 0.002200, upstream: 0.000950 },
    { keywords: ['software', 'cloud', 'it', 'consulting', 'digital', 'tech', 'saas'], name: 'Computer and related services (72)', multiplier: 0.000600, direct: 0.000420, upstream: 0.000180 },
    { keywords: ['metal', 'steel', 'iron', 'fabricat', 'aluminum'], name: 'Fabricated metal products (28)', multiplier: 0.001807, direct: 0.001290, upstream: 0.000517 },
    { keywords: ['textile', 'fabric', 'yarn', 'cloth', 'garment'], name: 'Textiles (17)', multiplier: 0.002410, direct: 0.001720, upstream: 0.000690 },
    { keywords: ['machinery', 'equipment', 'hardware', 'tool'], name: 'Machinery and equipment nec (29)', multiplier: 0.001450, direct: 0.001030, upstream: 0.000420 },
  ];

  const searchText = `${supplierName || ''} ${description || ''}`.toLowerCase();
  const matchedSector = EXIOBASE_SECTOR_LOOKUP.find(s => s.keywords.some(k => searchText.includes(k))) || {
    name: 'Indian Economy General Procurement Average',
    multiplier: 0.001948,
    direct: 0.001390,
    upstream: 0.000558,
  };

  const factor = matchedSector.multiplier;
  const emKg = numQty * factor;
  const emTonnes = emKg / 1000;
  const directKg = numQty * matchedSector.direct;
  const upstreamKg = numQty * matchedSector.upstream;
  const isHotspotCandidate = emKg > 500 || numQty > 100000;

  return {
    isValid: true,
    emissionsKg: Math.round(emKg * 100) / 100,
    emissionsTonnes: Math.round(emTonnes * 1000) / 1000,
    directKg: Math.round(directKg * 100) / 100,
    upstreamKg: Math.round(upstreamKg * 100) / 100,
    formula: `Spend (₹${numQty.toLocaleString('en-IN')}) × Multiplier (${factor} kg CO₂e/₹) = ${emKg.toFixed(2)} kg CO₂e`,
    factorUsed: factor,
    factorUnit: 'kg CO₂e/₹',
    tier: 'Layer 2: Spend-Based EEIO (EXIOBASE 3.11.2)',
    standard: 'EXIOBASE 3.11.2 pxp (Leontief Inverse Multiplier M = B(I - A)⁻¹)',
    scope: 'SCOPE_3',
    sourceName: `EXIOBASE Sector: ${matchedSector.name}`,
    sectorName: matchedSector.name,
    isHotspotCandidate,
    isNegativeOffset: false,
    insights: isHotspotCandidate
      ? ' Significant Scope 3 hotspot candidate (>500 kg CO₂e). Flagged for Layer 3 Primary Supplier LCA Refinement.'
      : 'Calculated via EXIOBASE 3.11.2 Leontief multiplier. Physical consumption logs can refine to Layer 1.',
  };
}

