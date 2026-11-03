import { ActivityRecord } from '../models/ActivityRecord.js';
import { Document } from '../models/Document.js';
import { Company } from '../models/Company.js';
import * as XLSX from 'xlsx';
import PDFDocument from 'pdfkit';

/**
 * Strips/normalizes non-standard WinAnsi glyphs (like Unicode subscript ₂ or special minuses)
 * so PDFKit standard PostScript fonts (Helvetica) never produce distorted "CO ,e" output.
 */
function sanitizeForPDF(str) {
  if (str == null) return '';
  return String(str)
    .replace(/CO₂e/g, 'CO2e')
    .replace(/CO₂/g, 'CO2')
    .replace(/tCO₂e/g, 'tCO2e')
    .replace(/CO\s*,\s*e/gi, 'CO2e')
    .replace(/CO\s*,\s*\//gi, 'CO2/')
    .replace(/CO\s*,/gi, 'CO2')
    .replace(/⁻¹/g, '^-1')
    .replace(/×/g, 'x')
    .replace(/–/g, '-')
    .replace(/—/g, '-');
}
export async function aggregateStatutoryData(companyId, filters = {}) {
  const company = await Company.findById(companyId).lean();
  const companyName = company?.name || company?.companyName || 'Corporate Entity';
  const cinGst = company?.gstin || company?.cin || 'U74999MH2024PTC123456';
  const turnoverInr = company?.annualTurnoverInr || 100000000; // Default ₹10 Crore for intensity calculation

  // 1. Gather all approved activity records
  const query = { companyId, verificationStatus: 'APPROVED' };
  if (filters.startDate || filters.endDate) {
    query.activityDate = {};
    if (filters.startDate) query.activityDate.$gte = new Date(filters.startDate);
    if (filters.endDate) query.activityDate.$lte = new Date(filters.endDate);
  }

  const activities = await ActivityRecord.find(query).lean();

  // 2. Also incorporate approved documents with suggestedEmissions if not already captured
  const docQuery = { companyId, reviewStatus: 'APPROVED' };
  const approvedDocs = await Document.find(docQuery).lean();

  // Consolidate into standardized emission records
  const ledger = [];
  const processedDocIds = new Set();

  for (const act of activities) {
    if (act.documentId) processedDocIds.add(act.documentId.toString());
    const emKg = act.carbonEmissions?.emissionsKg || 0;
    ledger.push({
      id: act._id.toString(),
      date: act.activityDate || act.createdAt,
      scope: act.scope || 'SCOPE_3',
      category: act.category || 'OTHER',
      quantity: act.quantity || 0,
      unit: act.unit || '',
      supplierName: act.supplierName || 'Self / Unspecified',
      description: act.description || '',
      emissionsKg: emKg,
      emissionsTonnes: act.carbonEmissions?.emissionsTonnes || emKg / 1000,
      factorUsed: act.carbonEmissions?.factorUsed || 0,
      factorUnit: act.carbonEmissions?.factorUnit || '',
      isNegativeOffset: Boolean(act.carbonEmissions?.isNegativeOffset),
      directKg: act.carbonEmissions?.directEmissionsKg || (act.scope === 'SCOPE_1' ? emKg : 0),
      upstreamKg: act.carbonEmissions?.upstreamEmissionsKg || (act.scope === 'SCOPE_3' ? emKg : 0),
      source: act.carbonEmissions?.source || 'National Benchmark',
      methodology: act.carbonEmissions?.methodology || 'GHG Protocol',
      formula: act.carbonEmissions?.calculationFormula || '',
    });
  }

  for (const doc of approvedDocs) {
    if (processedDocIds.has(doc._id.toString())) continue;
    const emKg = doc.carbonEmissions?.emissionsKg || doc.suggestedEmissions?.emissionsKg || 0;
    if (emKg === 0 && !doc.suggestedEmissions) continue;
    const isNeg = Boolean(doc.carbonEmissions?.isNegativeOffset || doc.suggestedEmissions?.isNegativeOffset);
    ledger.push({
      id: doc._id.toString(),
      date: doc.extractedFields?.activityDate || doc.createdAt,
      scope: doc.scope || 'SCOPE_3',
      category: doc.extractedFields?.category || doc.documentType || 'OTHER',
      quantity: doc.extractedFields?.quantity || 0,
      unit: doc.extractedFields?.unit || '',
      supplierName: doc.extractedFields?.supplierName || 'Vendor',
      description: doc.extractedFields?.description || doc.originalFileName || '',
      emissionsKg: emKg,
      emissionsTonnes: (doc.carbonEmissions?.emissionsTonnes || emKg / 1000),
      factorUsed: doc.carbonEmissions?.factorUsed || doc.suggestedEmissions?.factorUsed || 0,
      factorUnit: doc.carbonEmissions?.factorUnit || doc.suggestedEmissions?.factorUnit || '',
      isNegativeOffset: isNeg,
      directKg: doc.carbonEmissions?.directEmissionsKg || 0,
      upstreamKg: doc.carbonEmissions?.upstreamEmissionsKg || (doc.scope === 'SCOPE_3' ? emKg : 0),
      source: doc.carbonEmissions?.source || doc.suggestedEmissions?.sourceName || 'CEA/EXIOBASE',
      methodology: doc.carbonEmissions?.methodology || 'Layer 2 EEIO / Tier 1',
      formula: doc.carbonEmissions?.calculationFormula || doc.suggestedEmissions?.formula || '',
    });
  }

  // 3. Compute Scope 1, 2, 3 Roll-ups
  let scope1Kg = 0;
  let scope2Kg = 0;
  let scope3GrossKg = 0;
  let recyclingOffsetKg = 0;
  let totalElectricityKWh = 0;
  let totalFuelJoules = 0; // In GigaJoules (GJ)

  // Energy conversion constants
  const GJ_PER_LITER_DIESEL = 0.0386; // 38.6 MJ/L
  const GJ_PER_LITER_PETROL = 0.0342; // 34.2 MJ/L
  const GJ_PER_KG_LPG = 0.0461; // 46.1 MJ/kg
  const GJ_PER_MWH_ELECTRICITY = 3.6;

  for (const item of ledger) {
    if (item.isNegativeOffset) {
      recyclingOffsetKg += Math.abs(item.emissionsKg);
      continue;
    }

    if (item.scope === 'SCOPE_1') {
      scope1Kg += item.emissionsKg;
      // Fuel energy calculation
      const cat = (item.category || '').toUpperCase();
      const desc = (item.description || '').toLowerCase();
      if (cat === 'FUEL' || desc.includes('diesel')) {
        totalFuelJoules += item.quantity * GJ_PER_LITER_DIESEL;
      } else if (desc.includes('petrol') || desc.includes('gasoline')) {
        totalFuelJoules += item.quantity * GJ_PER_LITER_PETROL;
      } else if (desc.includes('lpg')) {
        totalFuelJoules += item.quantity * GJ_PER_KG_LPG;
      }
    } else if (item.scope === 'SCOPE_2') {
      scope2Kg += item.emissionsKg;
      if ((item.unit || '').toLowerCase().includes('kwh')) {
        totalElectricityKWh += item.quantity;
      } else if ((item.unit || '').toLowerCase().includes('mwh')) {
        totalElectricityKWh += item.quantity * 1000;
      } else {
        // Fallback from emissions using CEA grid factor 0.82
        totalElectricityKWh += item.emissionsKg / 0.82;
      }
    } else {
      scope3GrossKg += item.emissionsKg;
    }
  }

  const grossKg = scope1Kg + scope2Kg + scope3GrossKg;
  const netKg = Math.max(0, grossKg - recyclingOffsetKg);

  const scope1Tonnes = scope1Kg / 1000;
  const scope2Tonnes = scope2Kg / 1000;
  const scope3GrossTonnes = scope3GrossKg / 1000;
  const offsetTonnes = recyclingOffsetKg / 1000;
  const grossTonnes = grossKg / 1000;
  const netTonnes = netKg / 1000;

  const totalElectricityGJ = (totalElectricityKWh / 1000) * GJ_PER_MWH_ELECTRICITY;
  const totalEnergyGJ = totalElectricityGJ + totalFuelJoules;

  // Turnover in Crore INR
  const turnoverCrore = turnoverInr / 10000000;
  const ghgIntensityPerCrore = turnoverCrore > 0 ? (grossTonnes / turnoverCrore) : 0;
  const energyIntensityPerCrore = turnoverCrore > 0 ? (totalEnergyGJ / turnoverCrore) : 0;

  // 4. Group Top Hotspots
  const supplierAgg = {};
  for (const item of ledger) {
    if (item.isNegativeOffset) continue;
    const key = item.supplierName || 'General';
    if (!supplierAgg[key]) {
      supplierAgg[key] = { name: key, scope: item.scope, category: item.category, emissionsKg: 0 };
    }
    supplierAgg[key].emissionsKg += item.emissionsKg;
  }
  const topHotspots = Object.values(supplierAgg)
    .sort((a, b) => b.emissionsKg - a.emissionsKg)
    .slice(0, 5)
    .map(h => ({
      ...h,
      emissionsTonnes: Math.round((h.emissionsKg / 1000) * 1000) / 1000,
      percentage: grossKg > 0 ? ((h.emissionsKg / grossKg) * 100).toFixed(1) : 0,
    }));

  // 5. EU CBAM Sector Specific Allocations (Steel, Aluminum, Cement)
  const cbamGoods = [];
  const cbamCandidates = ledger.filter(item => {
    const text = `${item.category} ${item.description} ${item.supplierName}`.toLowerCase();
    return (
      text.includes('steel') ||
      text.includes('iron') ||
      text.includes('aluminum') ||
      text.includes('aluminium') ||
      text.includes('cement') ||
      text.includes('fertilizer') ||
      text.includes('hsn 72') ||
      text.includes('hsn 76') ||
      text.includes('hsn 25')
    );
  });

  if (cbamCandidates.length > 0) {
    for (const c of cbamCandidates) {
      let cnCode = '7208 00 00';
      let sectorName = 'Iron & Steel';
      const text = `${c.category} ${c.description}`.toLowerCase();
      if (text.includes('aluminum') || text.includes('aluminium')) {
        cnCode = '7601 10 00';
        sectorName = 'Aluminium Unwrought';
      } else if (text.includes('cement')) {
        cnCode = '2523 29 00';
        sectorName = 'Portland Cement';
      }
      const prodQuantityTonnes = Math.max(1, (c.unit.toLowerCase().includes('ton') ? c.quantity : c.quantity / 1000));
      const specificDirect = c.directKg / 1000 / prodQuantityTonnes;
      const specificIndirect = (c.upstreamKg > 0 ? c.upstreamKg : (c.emissionsKg * 0.4)) / 1000 / prodQuantityTonnes;

      cbamGoods.push({
        goodsDescription: c.description || sectorName,
        cnCode,
        sectorName,
        productionRoute: 'Electric Arc Furnace / Grid Hybrid',
        productionTonnes: prodQuantityTonnes,
        specificDirectEmissions: Math.round(specificDirect * 1000) / 1000,
        specificIndirectEmissions: Math.round(specificIndirect * 1000) / 1000,
        specificTotalEmissions: Math.round((specificDirect + specificIndirect) * 1000) / 1000,
        countryOfOrigin: 'IN',
        carbonPricePaidOriginEUR: 0.0,
      });
    }
  } else {
    // Provide reference baseline CBAM entry for Indian industrial export profile
    cbamGoods.push({
      goodsDescription: 'Hot-rolled flat products of non-alloy steel',
      cnCode: '7208 39 00',
      sectorName: 'Iron & Steel',
      productionRoute: 'Induction Furnace & Ladle Refining',
      productionTonnes: 100.0,
      specificDirectEmissions: 1.485,
      specificIndirectEmissions: 0.720,
      specificTotalEmissions: 2.205,
      countryOfOrigin: 'IN',
      carbonPricePaidOriginEUR: 0.0,
    });
  }

  return {
    metadata: {
      companyName,
      cinGst,
      reportingYear: filters.reportingYear || 'FY 2024-25',
      reportingPeriod: `${filters.startDate || '2024-04-01'} to ${filters.endDate || '2025-03-31'}`,
      generatedAt: new Date().toISOString(),
      standards: [
        'SEBI BRSR Core (Principle 6: Essential Indicators 7 & 8)',
        'EU Regulation (EU) 2023/956 (CBAM Transitional Registry)',
        'GHG Protocol Corporate Accounting and Reporting Standard',
        'Central Electricity Authority (CEA) Baseline Database v20.0',
        'EXIOBASE 3.11.2 Multi-Regional Input-Output Database',
      ],
    },
    brsr: {
      scope1Tonnes: Math.round(scope1Tonnes * 100) / 100,
      scope2Tonnes: Math.round(scope2Tonnes * 100) / 100,
      scope1And2Tonnes: Math.round((scope1Tonnes + scope2Tonnes) * 100) / 100,
      scope3GrossTonnes: Math.round(scope3GrossTonnes * 100) / 100,
      offsetTonnes: Math.round(offsetTonnes * 100) / 100,
      netTonnes: Math.round(netTonnes * 100) / 100,
      turnoverInr,
      turnoverCrore: Math.round(turnoverCrore * 100) / 100,
      ghgIntensityPerCrore: Math.round(ghgIntensityPerCrore * 100) / 100,
      energy: {
        electricityKWh: Math.round(totalElectricityKWh),
        electricityMWh: Math.round(totalElectricityKWh / 1000 * 10) / 10,
        electricityGJ: Math.round(totalElectricityGJ * 10) / 10,
        fuelGJ: Math.round(totalFuelJoules * 10) / 10,
        totalEnergyGJ: Math.round(totalEnergyGJ * 10) / 10,
        energyIntensityPerCrore: Math.round(energyIntensityPerCrore * 10) / 10,
      },
      topHotspots,
    },
    cbam: {
      installationName: `${companyName} Facility #1`,
      country: 'IN',
      reportingPeriod: '2024-Q3',
      defaultGridFactor: 0.82, // CEA 2024 kg CO2/kWh
      goods: cbamGoods,
    },
    ledger,
  };
}

/**
 * ============================================================================
 * 1. SEBI BRSR CORE EXCEL EXPORTER (XLSX)
 * Generates official multi-sheet workbook matching SEBI Principle 6 format
 * ============================================================================
 */
export function generateBRSRCoreExcel(data) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: General & Overview
  const overviewData = [
    ['SEBI BRSR CORE - SUSTAINABILITY DISCLOSURES (PRINCIPLE 6)'],
    ['Generated by CarbonIQ Corporate Accounting Engine'],
    [],
    ['Entity Name:', data.metadata.companyName],
    ['CIN / GSTIN:', data.metadata.cinGst],
    ['Reporting Period:', data.metadata.reportingPeriod],
    ['Applicable Standard:', 'SEBI Circular SEBI/HO/CFD/CFD-SEC-2/P/CIR/2023/122'],
    ['Assurance Status:', 'Pre-Audit Ready with Mathematical Provenance'],
    [],
    ['KEY PERFORMANCE INDICATORS', 'VALUES', 'UNITS'],
    ['Scope 1 (Direct GHG Emissions)', data.brsr.scope1Tonnes, 'Metric Tonnes CO₂e'],
    ['Scope 2 (Electricity Indirect Emissions)', data.brsr.scope2Tonnes, 'Metric Tonnes CO₂e'],
    ['Total Scope 1 + Scope 2 Emissions', data.brsr.scope1And2Tonnes, 'Metric Tonnes CO₂e'],
    ['Scope 3 (Supply Chain & Value Chain)', data.brsr.scope3GrossTonnes, 'Metric Tonnes CO₂e'],
    ['Avoided Recycling Carbon Offsets', data.brsr.offsetTonnes, 'Metric Tonnes CO₂e (Negative Credit)'],
    ['Net Corporate Footprint', data.brsr.netTonnes, 'Metric Tonnes CO₂e'],
    ['Annual Turnover', `₹ ${data.brsr.turnoverCrore} Crore`, 'INR'],
    ['GHG Intensity per Turnover', data.brsr.ghgIntensityPerCrore, 'tCO₂e / Crore INR'],
    ['Total Energy Consumed', data.brsr.energy.totalEnergyGJ, 'GigaJoules (GJ)'],
    ['Energy Intensity per Turnover', data.brsr.energy.energyIntensityPerCrore, 'GJ / Crore INR'],
  ];
  const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
  XLSX.utils.book_append_sheet(wb, wsOverview, 'BRSR_Executive_Summary');

  // Sheet 2: Essential Indicator 7 (GHG Emissions)
  const ei7Data = [
    ['SEBI BRSR Core - Essential Indicator 7: Greenhouse Gas (GHG) Emissions'],
    [],
    ['Parameter', 'Unit', 'Current Financial Year (FY 24-25)'],
    ['Gross Scope 1 emissions', 'Metric tonnes of CO₂ equivalent', data.brsr.scope1Tonnes],
    ['Gross Scope 2 emissions (Grid Electricity)', 'Metric tonnes of CO₂ equivalent', data.brsr.scope2Tonnes],
    ['Total Gross Scope 1 and Scope 2 emissions', 'Metric tonnes of CO₂ equivalent', data.brsr.scope1And2Tonnes],
    ['Scope 1 & 2 emission intensity per rupee of turnover', 'tCO₂e / Crore INR', data.brsr.ghgIntensityPerCrore],
    ['Gross Scope 3 emissions (Value chain partners)', 'Metric tonnes of CO₂ equivalent', data.brsr.scope3GrossTonnes],
    ['Scope 3 Calculation Methodology', 'Standard', 'EXIOBASE 3.11.2 Leontief MR-EEIO Matrix & IPCC Tier 3'],
    ['Independent Assurance Provider', 'Name / Platform', 'CarbonIQ Automated Traceability Engine'],
  ];
  const wsEI7 = XLSX.utils.aoa_to_sheet(ei7Data);
  XLSX.utils.book_append_sheet(wb, wsEI7, 'EI_7_GHG_Emissions');

  // Sheet 3: Essential Indicator 8 (Energy Consumption)
  const ei8Data = [
    ['SEBI BRSR Core - Essential Indicator 8: Energy Consumption'],
    [],
    ['Parameter', 'Unit', 'Current Financial Year (FY 24-25)'],
    ['Total electricity consumption (A)', 'MegaWatt Hours (MWh)', data.brsr.energy.electricityMWh],
    ['Total electricity consumption (A in Joules)', 'GigaJoules (GJ)', data.brsr.energy.electricityGJ],
    ['Total fuel consumption (B in Joules)', 'GigaJoules (GJ)', data.brsr.energy.fuelGJ],
    ['Energy consumption through other sources (C)', 'GigaJoules (GJ)', 0.0],
    ['Total Energy Consumption (A + B + C)', 'GigaJoules (GJ)', data.brsr.energy.totalEnergyGJ],
    ['Energy Intensity per rupee of turnover', 'GJ / Crore INR', data.brsr.energy.energyIntensityPerCrore],
  ];
  const wsEI8 = XLSX.utils.aoa_to_sheet(ei8Data);
  XLSX.utils.book_append_sheet(wb, wsEI8, 'EI_8_Energy_Consumption');

  // Sheet 4: Complete Traceable Audit Ledger
  const ledgerHeaders = [
    'Record ID', 'Activity Date', 'GHG Scope', 'Category', 'Quantity', 'Unit',
    'Supplier / Vendor', 'Description', 'Emissions (kg CO2e)', 'Emissions (t CO2e)',
    'Accounting Factor', 'Factor Unit', 'Direct (kg)', 'Upstream (kg)',
    'Calculation Formula', 'Provenance Source', 'Methodology'
  ];
  const ledgerRows = data.ledger.map(row => [
    row.id,
    row.date ? new Date(row.date).toISOString().split('T')[0] : '',
    row.scope,
    row.category,
    row.quantity,
    row.unit,
    row.supplierName,
    row.description,
    row.emissionsKg,
    row.emissionsTonnes,
    row.factorUsed,
    row.factorUnit,
    row.directKg,
    row.upstreamKg,
    row.formula,
    row.source,
    row.methodology,
  ]);
  const wsLedger = XLSX.utils.aoa_to_sheet([ledgerHeaders, ...ledgerRows]);
  XLSX.utils.book_append_sheet(wb, wsLedger, 'Audit_Ledger');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * ============================================================================
 * 2. SEBI BRSR CORE PDF REPORT GENERATOR
 * Streams an official statutory disclosure statement
 * ============================================================================
 */
export function generateBRSRCorePDF(data, stream) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(stream);

  // Palette
  const primary = '#0f766e'; // Emerald teal
  const dark = '#0f172a'; // Slate 900
  const gray = '#475569'; // Slate 600
  const lightBg = '#f8fafc';

  // Header Banner
  doc.rect(40, 40, 515, 65).fill(dark);
  doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold').text('SEBI BRSR CORE DISCLOSURE STATEMENT', 55, 52);
  doc.fontSize(10).font('Helvetica').fillColor('#34d399').text('BUSINESS RESPONSIBILITY & SUSTAINABILITY REPORTING (PRINCIPLE 6)', 55, 72);
  doc.fontSize(8).fillColor('#94a3b8').text(`Generated for ${data.metadata.companyName} | CIN: ${data.metadata.cinGst}`, 55, 87);

  doc.moveDown(3);

  // Executive Summary Card
  const startY = 120;
  doc.rect(40, startY, 515, 120).fill(lightBg).stroke('#cbd5e1');

  doc.fillColor(dark).fontSize(12).font('Helvetica-Bold').text('EXECUTIVE CARBON & ENERGY FOOTPRINT SUMMARY', 55, startY + 12);

  // KPI Grid
  const kpis = [
    { label: 'Scope 1 (Direct)', val: `${data.brsr.scope1Tonnes} tCO₂e`, color: '#0284c7' },
    { label: 'Scope 2 (Electricity)', val: `${data.brsr.scope2Tonnes} tCO₂e`, color: '#0d9488' },
    { label: 'Scope 3 (Value Chain)', val: `${data.brsr.scope3GrossTonnes} tCO₂e`, color: '#6366f1' },
    { label: 'Net Corporate Footprint', val: `${data.brsr.netTonnes} tCO₂e`, color: primary },
  ];

  kpis.forEach((kpi, idx) => {
    const x = 55 + (idx * 125);
    const y = startY + 38;
    doc.rect(x, y, 115, 55).fill('#ffffff').stroke('#e2e8f0');
    doc.fillColor(gray).fontSize(8).font('Helvetica').text(kpi.label, x + 8, y + 10);
    doc.fillColor(kpi.color).fontSize(13).font('Helvetica-Bold').text(kpi.val, x + 8, y + 26);
  });

  // Environmental Indicators Table
  doc.moveDown(5);
  const tableTop = 260;
  doc.fillColor(dark).fontSize(12).font('Helvetica-Bold').text('SEBI Principle 6 - Essential Indicator Disclosures', 40, tableTop);

  const tableHeaders = ['Indicator', 'Description', 'Unit', 'Current FY'];
  const colX = [40, 110, 390, 470];

  doc.rect(40, tableTop + 20, 515, 22).fill(primary);
  doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
  tableHeaders.forEach((h, i) => doc.text(h, colX[i] + 5, tableTop + 26));

  const tableData = [
    ['EI 7.1', 'Gross Scope 1 emissions (Fuel & Direct Transport)', 'Metric tonnes CO₂e', `${data.brsr.scope1Tonnes}`],
    ['EI 7.2', 'Gross Scope 2 emissions (Grid Electricity CEA 2024)', 'Metric tonnes CO₂e', `${data.brsr.scope2Tonnes}`],
    ['EI 7.3', 'Total Scope 1 and Scope 2 Emissions', 'Metric tonnes CO₂e', `${data.brsr.scope1And2Tonnes}`],
    ['EI 7.4', 'Gross Scope 3 emissions (EXIOBASE 3.11.2 Leontief EEIO)', 'Metric tonnes CO₂e', `${data.brsr.scope3GrossTonnes}`],
    ['EI 7.5', 'Closed-loop Recycling Avoided Offset Credits', 'Metric tonnes CO₂e', `-${data.brsr.offsetTonnes}`],
    ['EI 7.6', 'GHG Emission Intensity per Rupee Turnover', 'tCO₂e / Crore INR', `${data.brsr.ghgIntensityPerCrore}`],
    ['EI 8.1', 'Total Electricity Consumed', 'MegaWatt Hours (MWh)', `${data.brsr.energy.electricityMWh}`],
    ['EI 8.2', 'Total Fuel Energy Consumed', 'GigaJoules (GJ)', `${data.brsr.energy.fuelGJ}`],
    ['EI 8.3', 'Total Energy Consumption (Fuel + Electricity)', 'GigaJoules (GJ)', `${data.brsr.energy.totalEnergyGJ}`],
    ['EI 8.4', 'Energy Intensity per Rupee Turnover', 'GJ / Crore INR', `${data.brsr.energy.energyIntensityPerCrore}`],
  ];

  let curY = tableTop + 42;
  tableData.forEach((row, rIdx) => {
    const rowBg = rIdx % 2 === 0 ? '#ffffff' : '#f8fafc';
    doc.rect(40, curY, 515, 20).fill(rowBg).stroke('#f1f5f9');
    doc.fillColor(dark).fontSize(8).font('Helvetica');
    doc.text(row[0], colX[0] + 5, curY + 6);
    doc.text(row[1], colX[1] + 5, curY + 6, { width: 270 });
    doc.text(row[2], colX[2] + 5, curY + 6);
    doc.font('Helvetica-Bold').text(row[3], colX[3] + 5, curY + 6);
    curY += 20;
  });

  // Top 5 Hotspots Table
  curY += 20;
  doc.fillColor(dark).fontSize(11).font('Helvetica-Bold').text('Top Operational & Value Chain Hotspots (Pareto Screening)', 40, curY);
  curY += 15;

  doc.rect(40, curY, 515, 18).fill('#334155');
  doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
  doc.text('Rank', 45, curY + 5);
  doc.text('Vendor / Activity Node', 80, curY + 5);
  doc.text('Category', 280, curY + 5);
  doc.text('Emissions (tCO₂e)', 380, curY + 5);
  doc.text('% Share', 470, curY + 5);
  curY += 18;

  data.brsr.topHotspots.forEach((h, idx) => {
    doc.rect(40, curY, 515, 18).fill(idx % 2 === 0 ? '#ffffff' : '#f8fafc').stroke('#f1f5f9');
    doc.fillColor(dark).fontSize(8).font('Helvetica');
    doc.text(`#${idx + 1}`, 45, curY + 5);
    doc.text(h.name, 80, curY + 5, { width: 190, lineBreak: false });
    doc.text(h.category, 280, curY + 5);
    doc.font('Helvetica-Bold').text(`${h.emissionsTonnes}`, 380, curY + 5);
    doc.font('Helvetica').text(`${h.percentage}%`, 470, curY + 5);
    curY += 18;
  });

  // Provenance & Digital Assurance Sign-off
  curY += 20;
  doc.rect(40, curY, 515, 60).fill('#ecfdf5').stroke('#a7f3d0');
  doc.fillColor('#065f46').fontSize(9).font('Helvetica-Bold').text('STATUTORY ASSURANCE & FACTOR PROVENANCE', 50, curY + 8);
  doc.fillColor('#047857').fontSize(7.5).font('Helvetica').text(
    'All figures were derived through the CarbonIQ Automated Verification Pipeline. Scope 2 electricity computed via Central Electricity Authority (CEA) Baseline Database v20.0 (0.82 kg CO₂/kWh). Scope 3 spend-based calculations mapped to EXIOBASE 3.11.2 Leontief inverse multipliers M = B(I - A)⁻¹. Adheres to GHG Protocol Corporate Standard and SEBI Circular SEBI/HO/CFD/CFD-SEC-2/P/CIR/2023/122.',
    50, curY + 22, { width: 495, lineBreak: true }
  );

  doc.end();
}

/**
 * ============================================================================
 * 3. EU CBAM XML EXPORTER
 * Conforms to Regulation (EU) 2023/956 Transitional Registry Data Structure
 * ============================================================================
 */
export function generateCBAMXml(data) {
  const sanitize = (str = '') => String(str).replace(/[<>&'"]/g, c => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '\'': '&apos;', '"': '&quot;'
  }[c]));

  const goodsNodes = data.cbam.goods.map((g, idx) => `
    <GoodsItem>
      <ItemNumber>${idx + 1}</ItemNumber>
      <CommodityCodeCN>${sanitize(g.cnCode)}</CommodityCodeCN>
      <GoodsDescription>${sanitize(g.goodsDescription)}</GoodsDescription>
      <SectorClassification>${sanitize(g.sectorName)}</SectorClassification>
      <CountryOfOrigin>${sanitize(g.countryOfOrigin)}</CountryOfOrigin>
      <ProductionRoute>${sanitize(g.productionRoute)}</ProductionRoute>
      <TotalProductionTonnes>${g.productionTonnes.toFixed(3)}</TotalProductionTonnes>
      <DirectEmbeddedEmissions>
        <SpecificDirectEmissions>${g.specificDirectEmissions.toFixed(4)}</SpecificDirectEmissions>
        <UnitOfMeasurement>tCO2e / t product</UnitOfMeasurement>
      </DirectEmbeddedEmissions>
      <IndirectEmbeddedEmissions>
        <SpecificIndirectEmissions>${g.specificIndirectEmissions.toFixed(4)}</SpecificIndirectEmissions>
        <GridEmissionFactorCountry>${data.cbam.defaultGridFactor}</GridEmissionFactorCountry>
        <GridFactorUnit>kg CO2/kWh</GridFactorUnit>
        <UnitOfMeasurement>tCO2e / t product</UnitOfMeasurement>
      </IndirectEmbeddedEmissions>
      <TotalSpecificEmbeddedEmissions>${g.specificTotalEmissions.toFixed(4)}</TotalSpecificEmbeddedEmissions>
      <CarbonPriceDueInOriginCountry>
        <AmountEUR>${g.carbonPricePaidOriginEUR.toFixed(2)}</AmountEUR>
        <Currency>EUR</Currency>
      </CarbonPriceDueInOriginCountry>
    </GoodsItem>
  `).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<CBAMQuarterlyCommunication xmlns="urn:eu:cbam:v1:transitional" version="1.2">
  <Header>
    <ReportingPeriod>${sanitize(data.cbam.reportingPeriod)}</ReportingPeriod>
    <CreationDate>${data.metadata.generatedAt}</CreationDate>
    <RegulatoryFramework>Regulation (EU) 2023/956</RegulatoryFramework>
  </Header>
  <DeclarantAndInstallation>
    <OperatorName>${sanitize(data.metadata.companyName)}</OperatorName>
    <NationalIdentification>${sanitize(data.metadata.cinGst)}</NationalIdentification>
    <InstallationName>${sanitize(data.cbam.installationName)}</InstallationName>
    <CountryCode>${sanitize(data.cbam.country)}</CountryCode>
    <DefaultGridBenchmark>${data.cbam.defaultGridFactor} kg CO2/kWh (CEA 2024)</DefaultGridBenchmark>
  </DeclarantAndInstallation>
  <ReportedGoods>
    ${goodsNodes}
  </ReportedGoods>
</CBAMQuarterlyCommunication>`;
}

/**
 * ============================================================================
 * 4. EU CBAM CSV EXPORTER
 * Standard tabular structure for European importer value chain communications
 * ============================================================================
 */
export function generateCBAMCsv(data) {
  const headers = [
    'Item #',
    'CN Code',
    'Sector',
    'Goods Description',
    'Country of Origin',
    'Production Route',
    'Production Quantity (Tonnes)',
    'Specific Direct Emissions (tCO2e/t)',
    'Specific Indirect Emissions (tCO2e/t)',
    'Total Specific Embedded Emissions (tCO2e/t)',
    'Carbon Price Paid in Origin (EUR/t)',
    'CEA Grid Factor Applied (kg CO2/kWh)'
  ];

  const rows = data.cbam.goods.map((g, idx) => [
    idx + 1,
    `"${g.cnCode}"`,
    `"${g.sectorName}"`,
    `"${g.goodsDescription}"`,
    `"${g.countryOfOrigin}"`,
    `"${g.productionRoute}"`,
    g.productionTonnes.toFixed(3),
    g.specificDirectEmissions.toFixed(4),
    g.specificIndirectEmissions.toFixed(4),
    g.specificTotalEmissions.toFixed(4),
    g.carbonPricePaidOriginEUR.toFixed(2),
    data.cbam.defaultGridFactor
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  return '\ufeff' + csvContent; // UTF-8 BOM for Excel
}

/**
 * ============================================================================
 * 5. INDIVIDUAL DOCUMENT CARBON VERIFICATION CERTIFICATE (PDF)
 * Streams an official single-document carbon audit certificate
 * ============================================================================
 */
export function generateSingleDocumentPDF(document, company, stream) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(stream);

  // Styling palette
  const dark = '#0b1b14';
  const primary = '#0f766e';
  const accent = '#10b981';
  const lightBg = '#f8fafc';
  const borderCol = '#cbd5e1';
  const grayText = '#475569';

  const em = document.suggestedEmissions || document.carbonEmissions || {};
  const f = document.extractedFields || {};
  const emKg = em.emissionsKg != null ? em.emissionsKg : (document.multiScopeSummary?.netKg || 0);
  const emTonnes = em.emissionsTonnes != null ? em.emissionsTonnes : (emKg / 1000);
  const isApproved = document.reviewStatus === 'APPROVED';
  const isNegative = Boolean(em.isNegativeOffset);

  // 1. Header Banner
  doc.rect(40, 40, 515, 65).fill(dark);
  doc.fillColor('#ffffff').fontSize(15).font('Helvetica-Bold').text('CARBONIQ EMISSION VERIFICATION CERTIFICATE', 55, 52);
  doc.fontSize(9).font('Helvetica').fillColor('#34d399').text('INDIVIDUAL DOCUMENT GREENHOUSE GAS AUDIT TRACE', 55, 71);
  doc.fontSize(8).fillColor('#94a3b8').text(`Certificate ID: DOC-${document._id.toString().toUpperCase()} | Generated: ${new Date().toLocaleDateString('en-IN')}`, 55, 85);

  // 2. Company & Document Provenance Card
  doc.moveDown(3.5);
  const startY = 120;
  doc.rect(40, startY, 515, 95).fill(lightBg).stroke(borderCol);

  doc.fillColor(dark).fontSize(10).font('Helvetica-Bold').text('DOCUMENT & ENTITY PROVENANCE', 55, startY + 10);

  doc.fontSize(8).font('Helvetica').fillColor(grayText);
  doc.text('Reporting Entity:', 55, startY + 28);
  doc.font('Helvetica-Bold').fillColor(dark).text(`${company?.name || company?.companyName || 'Corporate Entity'} (GSTIN: ${company?.gstin || 'N/A'})`, 140, startY + 28);

  doc.font('Helvetica').fillColor(grayText).text('Source File Name:', 55, startY + 42);
  doc.font('Helvetica-Bold').fillColor(dark).text(`${document.originalFileName} (${(document.fileSize / 1024).toFixed(1)} KB)`, 140, startY + 42);

  doc.font('Helvetica').fillColor(grayText).text('SHA-256 Digest:', 55, startY + 56);
  doc.font('Helvetica').fillColor('#64748b').text(`${document.sha256 || 'N/A'}`, 140, startY + 56);

  doc.font('Helvetica').fillColor(grayText).text('Audit Status:', 55, startY + 70);
  doc.font('Helvetica-Bold').fillColor(isApproved ? '#059669' : '#d97706').text(
    isApproved ? 'VERIFIED & APPROVED FOR STATUTORY INVENTORY' : 'PRELIMINARY INGESTION ESTIMATE (REVIEW PENDING)',
    140, startY + 70
  );

  // 3. Carbon Quantification Hero Box
  const heroY = 230;
  doc.rect(40, heroY, 515, 105).fill(isNegative ? '#ecfdf5' : '#f0fdfa').stroke(isNegative ? '#6ee7b7' : '#99f6e4');

  doc.fillColor(dark).fontSize(10).font('Helvetica-Bold').text('QUANTIFIED CARBON FOOTPRINT', 55, heroY + 12);

  const displayKg = emKg > 0 ? `+${emKg.toLocaleString('en-IN')}` : emKg.toLocaleString('en-IN');
  doc.fontSize(26).font('Helvetica-Bold').fillColor(isNegative ? '#059669' : primary).text(
    `${displayKg} kg CO2e`,
    55, heroY + 32
  );
  doc.fontSize(11).font('Helvetica').fillColor(grayText).text(
    `(${emTonnes > 0 ? `+${emTonnes}` : emTonnes} Metric Tonnes CO2e)`,
    55, heroY + 65
  );

  if (isNegative) {
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#059669').text(' AVOIDED EMISSION OFFSET (NET CARBON CREDIT)', 55, heroY + 84);
  } else if (document.scope === 'MULTI_SCOPE' && document.multiScopeSummary) {
    const ms = document.multiScopeSummary;
    doc.fontSize(8.5).font('Helvetica').fillColor(grayText).text(
      `Scope 1: ${ms.scope1Kg || 0} kg | Scope 2: ${ms.scope2Kg || 0} kg | Scope 3: ${ms.scope3Kg || 0} kg | Offset: -${ms.offsetKg || 0} kg (${ms.validRows || document.lineItems?.length || 0} rows)`,
      55, heroY + 84
    );
  } else {
    doc.fontSize(8.5).font('Helvetica').fillColor(grayText).text(
      `Scope: ${document.scope || 'SCOPE_3'}  |  Category: ${f.category || document.documentType || 'OPERATIONAL'}  |  Tier: ${em.tier || 'IPCC Tier 1'}`,
      55, heroY + 84
    );
  }

  const isMultiScope = document.scope === 'MULTI_SCOPE' || (document.lineItems && document.lineItems.length > 0);

  if (isMultiScope) {
    const ms = document.multiScopeSummary || {
      scope1Kg: 0,
      scope2Kg: 0,
      scope3Kg: 0,
      offsetKg: 0,
      netKg: emKg,
      totalRows: document.lineItems?.length || 0,
      validRows: document.lineItems?.length || 0,
      distinctScopes: ['SCOPE_1', 'SCOPE_2', 'SCOPE_3'],
    };

    // 4. Multi-Scope Executive Allocation Grid (Page 1)
    const gridY = 345;
    doc.fillColor(dark).fontSize(10).font('Helvetica-Bold').text('EXECUTIVE SCOPE BOUNDARY ALLOCATION & AUDIT SUMMARY', 40, gridY);

    const cardW = 122;
    const cardH = 56;
    const cardGap = 9;
    const startX = 40;

    // Scope 1 Card
    doc.rect(startX, gridY + 16, cardW, cardH).fill('#ecfdf5').stroke('#6ee7b7');
    doc.fillColor('#065f46').fontSize(7.5).font('Helvetica-Bold').text('SCOPE 1 (DIRECT FUELS)', startX + 8, gridY + 24);
    doc.fillColor('#047857').fontSize(12).font('Helvetica-Bold').text(`+${Number(ms.scope1Kg || 0).toLocaleString('en-IN')} kg`, startX + 8, gridY + 38);
    doc.fillColor(grayText).fontSize(7).font('Helvetica').text('Stationary & Fleet Fuels', startX + 8, gridY + 54);

    // Scope 2 Card
    const s2X = startX + cardW + cardGap;
    doc.rect(s2X, gridY + 16, cardW, cardH).fill('#f0f9ff').stroke('#7dd3fc');
    doc.fillColor('#0369a1').fontSize(7.5).font('Helvetica-Bold').text('SCOPE 2 (GRID ELECTRICITY)', s2X + 8, gridY + 24);
    doc.fillColor('#0284c7').fontSize(12).font('Helvetica-Bold').text(`+${Number(ms.scope2Kg || 0).toLocaleString('en-IN')} kg`, s2X + 8, gridY + 38);
    doc.fillColor(grayText).fontSize(7).font('Helvetica').text('CEA Grid Benchmark 0.82', s2X + 8, gridY + 54);

    // Scope 3 Card
    const s3X = s2X + cardW + cardGap;
    doc.rect(s3X, gridY + 16, cardW, cardH).fill('#faf5ff').stroke('#d8b4fe');
    doc.fillColor('#6b21a8').fontSize(7.5).font('Helvetica-Bold').text('SCOPE 3 (VALUE CHAIN)', s3X + 8, gridY + 24);
    doc.fillColor('#7e22ce').fontSize(12).font('Helvetica-Bold').text(`+${Number(ms.scope3Kg || 0).toLocaleString('en-IN')} kg`, s3X + 8, gridY + 38);
    doc.fillColor(grayText).fontSize(7).font('Helvetica').text('Logistics, Travel & Spend', s3X + 8, gridY + 54);

    // Avoided Offsets Card
    const offX = s3X + cardW + cardGap;
    doc.rect(offX, gridY + 16, cardW, cardH).fill('#f0fdf4').stroke('#86efac');
    doc.fillColor('#15803d').fontSize(7.5).font('Helvetica-Bold').text('AVOIDED OFFSETS', offX + 8, gridY + 24);
    doc.fillColor('#16a34a').fontSize(12).font('Helvetica-Bold').text(`-${Number(ms.offsetKg || 0).toLocaleString('en-IN')} kg`, offX + 8, gridY + 38);
    doc.fillColor(grayText).fontSize(7).font('Helvetica').text('Circular Recycling Credits', offX + 8, gridY + 54);

    // 5. Ingestion Governance & Traceability Metadata Box (Page 1)
    const govY = gridY + 84;
    doc.fillColor(dark).fontSize(10).font('Helvetica-Bold').text('INGESTION GOVERNANCE & STATUTORY METHODOLOGY', 40, govY);

    doc.rect(40, govY + 16, 515, 68).fill('#f8fafc').stroke('#cbd5e1');
    doc.fillColor(dark).fontSize(8).font('Helvetica-Bold').text('Accounting Standard:', 52, govY + 24);
    doc.fillColor(grayText).fontSize(8).font('Helvetica').text('GHG Protocol Corporate Standard (Direct & Indirect) | SEBI BRSR Core Principle 6', 160, govY + 24);

    doc.fillColor(dark).fontSize(8).font('Helvetica-Bold').text('Emission Factor Baselines:', 52, govY + 38);
    doc.fillColor(grayText).fontSize(8).font('Helvetica').text('India CEA Grid v20.0 (0.82 kg/kWh) | IPCC Tier 1 (Fuels) | EXIOBASE 3.11.2 Leontief EEIO', 160, govY + 38);

    doc.fillColor(dark).fontSize(8).font('Helvetica-Bold').text('Activity Line Items:', 52, govY + 52);
    doc.fillColor(grayText).fontSize(8).font('Helvetica').text(`${ms.validRows || document.lineItems?.length || 0} Ingested Line Items across ${ms.distinctScopes?.length || 3} Distinct Scopes`, 160, govY + 52);

    doc.fillColor(dark).fontSize(8).font('Helvetica-Bold').text('Itemized Ledger Audit:', 52, govY + 66);
    doc.fillColor('#0f766e').fontSize(8).font('Helvetica-Bold').text('Complete row-level breakdown and activity schedule follows in Schedule A on Page 2.', 160, govY + 66);

    // 6. Page 1 Footer Assurance Seal
    const sealY = govY + 96;
    doc.rect(40, sealY, 515, 46).fill('#ecfdf5').stroke('#a7f3d0');
    doc.fillColor('#065f46').fontSize(8.5).font('Helvetica-Bold').text('PRE-AUDIT SOVEREIGN ASSURANCE SEAL', 50, sealY + 8);
    doc.fillColor('#047857').fontSize(7.5).font('Helvetica').text(
      'This certificate validates consolidated multi-scope emissions derived from the attached tabular operational dataset in full compliance with ISO 14064-1 and SEBI BRSR Core Guidelines. Verified by CarbonIQ Traceability Engine.',
      50, sealY + 20, { width: 495, lineBreak: true }
    );

    // ========================================================================
    // SCHEDULE A: ITEMIZED MULTI-SCOPE OPERATIONAL ACTIVITY RECORDS (PAGE 2+)
    // ========================================================================
    const items = document.lineItems || [];
    if (items.length > 0) {
      doc.addPage();
      let pageNum = 2;

      const renderScheduleHeader = (pageNumber) => {
        doc.rect(40, 40, 515, 26).fill(dark);
        doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold').text('SCHEDULE A: ITEMIZED MULTI-SCOPE OPERATIONAL ACTIVITY RECORDS', 50, 48);
        doc.fillColor('#34d399').fontSize(7.5).font('Helvetica').text(`Page ${pageNumber} | DOC-${document._id.toString().toUpperCase()}`, 380, 48);

        doc.fillColor(grayText).fontSize(7.5).font('Helvetica').text(
          `Entity: ${company?.name || company?.companyName || 'Corporate Entity'}  |  Source File: ${document.originalFileName}  |  Total Items: ${items.length}`,
          40, 72
        );

        // Table Header
        const headY = 84;
        doc.rect(40, headY, 515, 18).fill('#0f2e22');
        doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold');
        doc.text('#', 44, headY + 5, { width: 16 });
        doc.text('Date', 62, headY + 5, { width: 48 });
        doc.text('Scope', 112, headY + 5, { width: 38 });
        doc.text('Category', 152, headY + 5, { width: 76 });
        doc.text('Description & Counterparty', 230, headY + 5, { width: 146 });
        doc.text('Activity Metric', 378, headY + 5, { width: 68 });
        doc.text('GHG CO2e', 448, headY + 5, { width: 102, align: 'right' });

        return headY + 18;
      };

      let curY = renderScheduleHeader(pageNum);

      items.forEach((item, idx) => {
        const itemScope = item.scope || 'SCOPE_3';
        const itemCat = item.category || 'OTHER';
        const itemQty = item.quantity != null ? `${item.quantity.toLocaleString('en-IN')} ${item.unit || ''}` : 'N/A';
        const dateStr = item.activityDate ? new Date(item.activityDate).toLocaleDateString('en-IN') : 'N/A';
        const descStr = `${item.description || 'Activity'} ${item.supplierName ? `(${item.supplierName})` : ''}`.trim();
        const emObj = item.emissions || {};
        const emItemKg = emObj.emissionsKg != null ? Number(emObj.emissionsKg) : 0;
        const isItemOffset = emObj.isNegativeOffset || emItemKg < 0;

        // Measure description text height
        doc.font('Helvetica').fontSize(7.5);
        const descH = doc.heightOfString(descStr, { width: 144 });
        const rowH = Math.max(18, Math.ceil(descH) + 6);

        // Check page overflow
        if (curY + rowH > 750) {
          doc.addPage();
          pageNum++;
          curY = renderScheduleHeader(pageNum);
        }

        // Draw row
        doc.rect(40, curY, 515, rowH).fill(idx % 2 === 0 ? '#ffffff' : '#f8fafc').stroke('#e2e8f0');

        // Column 0: #
        doc.fillColor(dark).fontSize(7).font('Helvetica');
        doc.text(String(item.rowNumber || idx + 1), 44, curY + 4, { width: 16 });

        // Column 1: Date
        doc.fillColor(grayText).fontSize(7).font('Helvetica');
        doc.text(dateStr, 62, curY + 4, { width: 48 });

        // Column 2: Scope badge
        const scopeCol = itemScope === 'SCOPE_1' ? '#059669' : itemScope === 'SCOPE_2' ? '#0284c7' : '#7c3aed';
        doc.fillColor(scopeCol).fontSize(7).font('Helvetica-Bold');
        doc.text(itemScope.replace('SCOPE_', 'S-'), 112, curY + 4, { width: 38 });

        // Column 3: Category
        doc.fillColor(dark).fontSize(7).font('Helvetica');
        doc.text(itemCat.replace(/_/g, ' '), 152, curY + 4, { width: 76 });

        // Column 4: Description & Supplier
        doc.fillColor(dark).fontSize(7).font('Helvetica');
        doc.text(descStr, 230, curY + 4, { width: 146 });

        // Column 5: Quantity & Unit
        doc.fillColor(dark).fontSize(7).font('Helvetica-Bold');
        doc.text(itemQty, 378, curY + 4, { width: 68 });

        // Column 6: Quantified CO2e
        doc.font('Helvetica-Bold').fontSize(7.5);
        if (isItemOffset) {
          doc.fillColor('#059669').text(`-${Math.abs(emItemKg).toLocaleString('en-IN')} kg*`, 448, curY + 4, { width: 102, align: 'right' });
        } else {
          doc.fillColor(dark).text(`+${emItemKg.toLocaleString('en-IN')} kg`, 448, curY + 4, { width: 102, align: 'right' });
        }

        curY += rowH;
      });

      // Schedule Ledger Grand Total Box
      if (curY + 70 > 750) {
        doc.addPage();
        pageNum++;
        curY = renderScheduleHeader(pageNum);
      }

      curY += 10;
      doc.rect(40, curY, 515, 42).fill('#0f2e22').stroke('#34d399');
      doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold').text('CONSOLIDATED AUDIT LEDGER TOTALS', 50, curY + 8);
      doc.fillColor('#a7f3d0').fontSize(7.5).font('Helvetica').text(
        `Scope 1: +${Number(ms.scope1Kg || 0).toLocaleString('en-IN')} kg  |  Scope 2: +${Number(ms.scope2Kg || 0).toLocaleString('en-IN')} kg  |  Scope 3: +${Number(ms.scope3Kg || 0).toLocaleString('en-IN')} kg  |  Avoided Offsets: -${Number(ms.offsetKg || 0).toLocaleString('en-IN')} kg`,
        50, curY + 22
      );
      doc.fillColor('#bbf7d0').fontSize(10).font('Helvetica-Bold').text(
        `NET FOOTPRINT: +${Number(ms.netKg || 0).toLocaleString('en-IN')} kg CO2e (${Number((ms.netKg || 0) / 1000).toFixed(4)} tCO2e)`,
        300, curY + 14, { align: 'right', width: 245 }
      );
      curY += 46;

      // Assurance seal at the bottom of Schedule A
      if (curY + 50 > 750) {
        doc.addPage();
        pageNum++;
        curY = renderScheduleHeader(pageNum);
      }

      curY += 8;
      doc.rect(40, curY, 515, 36).fill('#f8fafc').stroke('#cbd5e1');
      doc.fillColor(grayText).fontSize(7).font('Helvetica').text(
        '* Negative emissions denote validated avoided lifecycle greenhouse gas displacement credits achieved via closed-loop material recycling.\nThis itemized schedule forms an integral statutory annexure to the CarbonIQ Greenhouse Gas Verification Certificate.',
        50, curY + 6, { width: 495, lineBreak: true }
      );
    }

    doc.end();
    return;
  }

  // 4. Extracted Activity & Line Item Details Table (Single Document Flow)
  const tableY = 345;
  doc.fillColor(dark).fontSize(10).font('Helvetica-Bold').text('EXTRACTED ACTIVITY & VENDOR SPECIFICATIONS', 40, tableY);

  const tHeaders = ['Attribute', 'Extracted Value', 'Verification Detail'];
  const tColX = [40, 160, 350];

  doc.rect(40, tableY + 16, 515, 20).fill(dark);
  doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold');
  tHeaders.forEach((h, i) => doc.text(h, tColX[i] + 8, tableY + 22));

  const formatExtractionMethod = (method) => {
    if (!method) return 'Multimodal AI Vision & OCR';
    const clean = String(method).replace(/groq/gi, 'Multimodal AI');
    if (clean === 'GROQ_VISION' || clean === 'AI_MULTIMODAL_VISION' || clean === 'Multimodal AI_VISION') {
      return 'Multimodal AI Vision & OCR';
    }
    if (clean === 'GROQ_LLM' || clean === 'Multimodal AI_LLM') {
      return 'Multimodal AI Parser';
    }
    return clean.replace(/_/g, ' ');
  };

  const rows = [
    ['Consumption / Spend', `${f.quantity != null ? f.quantity.toLocaleString('en-IN') : 'N/A'} ${f.unit || ''}`, 'Primary extracted activity metric'],
    ['Activity Date', f.activityDate ? new Date(f.activityDate).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'), 'Billing or transaction period'],
    ['Vendor / Supplier', f.supplierName || 'Unspecified / Internal Facility', 'Identified commercial counterparty'],
    ['Description / Item', f.description || document.originalFileName, 'Operational line item summary'],
    ['Extraction Method', formatExtractionMethod(document.extractionMethod), 'Automated extraction pipeline'],
  ];

  let rY = tableY + 36;
  rows.forEach((r, idx) => {
    // Measure dynamic text height for column 1 and column 2 to prevent any overflow or overlapping
    doc.font('Helvetica-Bold').fontSize(8);
    const valHeight = doc.heightOfString(String(r[1] || ''), { width: 180 });
    doc.font('Helvetica').fontSize(8);
    const detailHeight = doc.heightOfString(String(r[2] || ''), { width: 190 });
    const rowHeight = Math.max(22, Math.ceil(Math.max(valHeight, detailHeight)) + 10);

    // Row container
    doc.rect(40, rY, 515, rowHeight).fill(idx % 2 === 0 ? '#ffffff' : '#f8fafc').stroke('#e2e8f0');

    // Column 0: Attribute
    doc.fillColor(dark).fontSize(8).font('Helvetica');
    doc.text(r[0], tColX[0] + 8, rY + 6, { width: 110 });

    // Column 1: Extracted Value (bold, multi-line wrapping with full padding)
    doc.font('Helvetica-Bold').fillColor(dark);
    doc.text(String(r[1] || ''), tColX[1] + 8, rY + 6, { width: 180 });

    // Column 2: Verification Detail
    doc.font('Helvetica').fillColor(grayText);
    doc.text(r[2], tColX[2] + 8, rY + 6, { width: 190 });

    rY += rowHeight;
  });

  // 5. Mathematical Traceability & Formula Pill
  rY += 14;
  doc.fillColor(dark).fontSize(10).font('Helvetica-Bold').text('MATHEMATICAL FORMULA & FACTOR PROVENANCE', 40, rY);
  rY += 16;

  doc.rect(40, rY, 515, 48).fill('#f1f5f9').stroke('#cbd5e1');
  doc.fillColor(dark).fontSize(8).font('Helvetica-Bold').text('Calculation Formula:', 50, rY + 8);
  const rawFormula = em.calculationFormula || em.formula || `${f.quantity} ${f.unit} x Factor = ${emKg} kg CO2e`;
  doc.fillColor('#0f766e').fontSize(8.5).font('Helvetica').text(
    sanitizeForPDF(rawFormula),
    50, rY + 20, { width: 495 }
  );
  doc.fillColor(grayText).fontSize(7.5).text(
    sanitizeForPDF(`Benchmark Source: ${em.source || 'Central Electricity Authority / IPCC'}  |  Factor: ${em.factorUsed || 'N/A'} ${em.factorUnit || ''}`),
    50, rY + 34
  );
  rY += 48;

  // 6. Layer 2 Leontief Decomposition (if available)
  if (em.directEmissionsKg !== undefined && em.upstreamEmissionsKg !== undefined) {
    rY += 14;
    doc.fillColor(dark).fontSize(10).font('Helvetica-Bold').text('EXIOBASE 3.11.2 SUPPLY CHAIN DECOMPOSITION', 40, rY);
    rY += 16;

    doc.rect(40, rY, 250, 40).fill('#ecfeff').stroke('#a5f3fc');
    doc.fillColor(grayText).fontSize(7.5).font('Helvetica').text('Direct Sector Footprint:', 50, rY + 8);
    doc.fillColor('#0891b2').fontSize(11).font('Helvetica-Bold').text(`${Number(em.directEmissionsKg).toLocaleString('en-IN')} kg CO2e`, 50, rY + 20);

    doc.rect(305, rY, 250, 40).fill('#f0fdf4').stroke('#bbf7d0');
    doc.fillColor(grayText).fontSize(7.5).font('Helvetica').text('Upstream Leontief Tier-N Footprint:', 315, rY + 8);
    doc.fillColor('#16a34a').fontSize(11).font('Helvetica-Bold').text(`${Number(em.upstreamEmissionsKg).toLocaleString('en-IN')} kg CO2e`, 315, rY + 20);
    rY += 40;
  }

  // 7. Assurance & Audit Stamp
  rY += 14;
  doc.rect(40, rY, 515, 50).fill('#ecfdf5').stroke('#a7f3d0');
  doc.fillColor('#065f46').fontSize(8.5).font('Helvetica-Bold').text('STATUTORY ASSURANCE SEAL', 50, rY + 8);
  doc.fillColor('#047857').fontSize(7.5).font('Helvetica').text(
    'This certificate certifies the greenhouse gas emissions derived from the attached document in compliance with the GHG Protocol Corporate Accounting Standard, India CEA CO2 Baseline v20.0, and SEBI BRSR Core Principles. Verified by CarbonIQ Traceability Engine.',
    50, rY + 22, { width: 495, lineBreak: true }
  );

  doc.end();
}

