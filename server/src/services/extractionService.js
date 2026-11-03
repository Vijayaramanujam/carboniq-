import fs from 'fs';
import path from 'path';
import { PDFParse } from 'pdf-parse';
import { parse as parseCsvSync } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { performGroqVisionExtraction } from './groqService.js';

/**
 * Extracts raw textual content from supported file types
 */
export async function extractRawContent(filePath, mimeType, originalFileName) {
  const ext = path.extname(originalFileName).toLowerCase();

  // 1. PDF Documents
  if (ext === '.pdf' || mimeType === 'application/pdf') {
    try {
      const buffer = fs.readFileSync(filePath);
      const uint8 = new Uint8Array(buffer);
      const parser = new PDFParse(uint8);
      const result = await parser.getText();
      const text = (result.text || '').trim();

      // If digital text was found
      if (text.length >= 30) {
        return {
          method: 'PDF_TEXT',
          text,
          pages: result.pages || [],
          pageCount: result.total || 1,
          confidence: 0.95,
          error: null,
        };
      }

      // If digital text is empty/sparse, it's likely a scanned PDF image
      const groqResult = await performGroqVisionExtraction(filePath, originalFileName, mimeType);
      return {
        method: 'AI_MULTIMODAL_VISION',
        text: groqResult.text,
        confidence: groqResult.confidence,
        error: groqResult.error,
        scope: groqResult.scope,
        groqAnalysis: groqResult.success ? groqResult : null,
        pageCount: 1,
      };
    } catch (err) {
      // Fallback to Vision AI if PDFParse fails
      const groqResult = await performGroqVisionExtraction(filePath, originalFileName, mimeType);
      return {
        method: 'AI_MULTIMODAL_VISION',
        text: groqResult.text,
        confidence: groqResult.confidence,
        error: groqResult.error || err.message,
        scope: groqResult.scope,
        groqAnalysis: groqResult.success ? groqResult : null,
        pageCount: 1,
      };
    }
  }

  // 2. Images (JPEG, PNG, JPG) - Processed with Multimodal AI Vision
  if (['.jpg', '.jpeg', '.png'].includes(ext) || mimeType.startsWith('image/')) {
    const groqResult = await performGroqVisionExtraction(filePath, originalFileName, mimeType);
    return {
      method: 'AI_MULTIMODAL_VISION',
      text: groqResult.text,
      confidence: groqResult.confidence,
      error: groqResult.error,
      scope: groqResult.scope,
      groqAnalysis: groqResult.success ? groqResult : null,
      pageCount: 1,
    };
  }

  // 3. CSV Tabular Documents
  if (ext === '.csv' || mimeType === 'text/csv') {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const records = parseCsvSync(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      const text = records
        .map((row, i) => `Row ${i + 1}: ${Object.entries(row).map(([k, v]) => `${k}=${v}`).join(', ')}`)
        .join('\n');

      return {
        method: 'CSV_PARSER',
        text,
        rawRecords: records,
        confidence: 0.98,
        error: null,
        pageCount: 1,
      };
    } catch (err) {
      return {
        method: 'CSV_PARSER',
        text: '',
        confidence: 0,
        error: `Failed to parse CSV: ${err.message}`,
        pageCount: 0,
      };
    }
  }

  // 4. Excel Documents (XLSX, XLS)
  if (['.xlsx', '.xls'].includes(ext) || mimeType.includes('spreadsheetml')) {
    try {
      const xlsxLib = XLSX.default || XLSX;
      const buf = fs.readFileSync(filePath);
      const workbook = xlsxLib.read(buf, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const records = xlsxLib.utils.sheet_to_json(sheet, { defval: '' });

      const text = records
        .map((row, i) => `Row ${i + 1}: ${Object.entries(row).map(([k, v]) => `${k}=${v}`).join(', ')}`)
        .join('\n');

      return {
        method: 'EXCEL_PARSER',
        text,
        rawRecords: records,
        confidence: 0.98,
        error: null,
        pageCount: 1,
      };
    } catch (err) {
      return {
        method: 'EXCEL_PARSER',
        text: '',
        confidence: 0,
        error: `Failed to parse Excel workbook: ${err.message}`,
        pageCount: 0,
      };
    }
  }

  return {
    method: 'NONE',
    text: '',
    confidence: 0,
    error: `Unsupported file format: ${ext}`,
    pageCount: 0,
  };
}

/**
 * Infers category, GHG Protocol scope, and specific activity subtypes for a spreadsheet row
 */
export function inferRowCategoryAndScope(rowText = '', explicitCat = '', explicitScope = '', explicitUnit = '') {
  const combined = `${explicitCat} ${explicitScope} ${rowText} ${explicitUnit}`.toLowerCase();

  // 1. Check explicit Scope if supplied in a column
  let scope = null;
  if (/scope\s*1\b|^1$|direct/i.test(explicitScope.trim())) scope = 'SCOPE_1';
  else if (/scope\s*2\b|^2$|indirect\s*energy|electricity/i.test(explicitScope.trim())) scope = 'SCOPE_2';
  else if (/scope\s*3\b|^3$|value\s*chain|upstream|freight|spend/i.test(explicitScope.trim())) scope = 'SCOPE_3';

  let category = 'SUPPLIER_INVOICE';
  let fuelType = '';
  let transportMode = '';
  let wasteType = '';
  let disposalMethod = '';

  // Check Fuel / Scope 1
  if (
    /fuel/i.test(explicitCat) ||
    /diesel|hsd|petrol|gasoline|lpg|cng|furnace\s*oil|fuel\s*oil|natural\s*gas|png|kerosene|coal|generator\s*fuel|dg\s*set/i.test(combined)
  ) {
    category = 'FUEL';
    if (!scope) scope = 'SCOPE_1';
    if (/diesel|hsd/i.test(combined)) fuelType = 'Diesel';
    else if (/petrol|gasoline/i.test(combined)) fuelType = 'Petrol';
    else if (/cng|compressed\s*natural/i.test(combined)) fuelType = 'CNG';
    else if (/lpg|liquefied\s*petroleum/i.test(combined)) fuelType = 'LPG';
    else if (/natural\s*gas|png/i.test(combined)) fuelType = 'Natural Gas (CNG)';
    else if (/furnace\s*oil|fuel\s*oil/i.test(combined)) fuelType = 'Heavy Fuel Oil';
    else fuelType = 'Diesel';
  }
  // Check Electricity / Scope 2
  else if (
    /electric/i.test(explicitCat) ||
    /electricity|electric|power|grid|discom|kwh|mwh|units\s*consumed|bescom|tata\s*power|adani\s*electricity|msedcl|cesc/i.test(combined)
  ) {
    category = 'ELECTRICITY';
    if (!scope) scope = 'SCOPE_2';
  }
  // Check Waste / Scope 3
  else if (
    /waste/i.test(explicitCat) ||
    /waste|scrap|recycle|recycled|landfill|compost|effluent|hazardous\s*waste|scrap\s*metal|plastic\s*waste/i.test(combined)
  ) {
    category = 'WASTE';
    if (!scope) scope = 'SCOPE_3';
    if (/recycl/i.test(combined)) disposalMethod = 'Recycled';
    else if (/landfill/i.test(combined)) disposalMethod = 'Landfill';
    else if (/compost/i.test(combined)) disposalMethod = 'Composted';
    else disposalMethod = 'Recycled';

    if (/scrap|metal/i.test(combined)) wasteType = 'Scrap Metal';
    else if (/hazard/i.test(combined)) wasteType = 'Hazardous';
    else if (/cardboard|paper/i.test(combined)) wasteType = 'Cardboard';
    else wasteType = 'General Municipal Waste';
  }
  // Check Transportation / Logistics / Scope 3
  else if (
    /transport|freight|logistics/i.test(explicitCat) ||
    /freight|transport|logistics|courier|delivery|truck|tkm|tonne-km|cargo|air\s*freight|sea\s*freight|rail/i.test(combined)
  ) {
    category = 'TRANSPORTATION';
    if (!scope) scope = 'SCOPE_3';
    if (/air/i.test(combined)) transportMode = 'Air Freight';
    else if (/sea|ship/i.test(combined)) transportMode = 'Sea Freight';
    else if (/rail/i.test(combined)) transportMode = 'Rail';
    else transportMode = 'Road / Truck';
  }
  // Fallback to Supplier Spend / Scope 3
  else {
    category = 'SUPPLIER_INVOICE';
    if (!scope) scope = 'SCOPE_3';
  }

  return {
    category,
    scope: scope || 'SCOPE_3',
    fuelType,
    transportMode,
    wasteType,
    disposalMethod,
  };
}

/**
 * Extracts and classifies all line items from tabular records (CSV / Excel)
 */
export function extractTabularLineItems(rawRecords, fileName = '') {
  if (!Array.isArray(rawRecords) || rawRecords.length === 0) {
    return { lineItems: [], distinctScopes: [], isMultiScope: false };
  }

  const getColVal = (row, candidates) => {
    const rowKeys = Object.keys(row || {});
    const matchedKey = rowKeys.find((k) => {
      const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
      return candidates.some((cand) => cleanK.includes(cand.toLowerCase().replace(/[^a-z0-9]/g, '')));
    });
    return matchedKey ? row[matchedKey] : null;
  };

  const lineItems = rawRecords.map((row, idx) => {
    const rowNum = idx + 1;
    const explicitCat = String(getColVal(row, ['category', 'activitytype', 'cat']) || '').trim();
    const explicitScope = String(getColVal(row, ['scope', 'ghgscope']) || '').trim();
    const explicitUnit = String(getColVal(row, ['unit', 'uom', 'metric']) || '').trim();
    const explicitSupplier = String(getColVal(row, ['supplier', 'vendor', 'party', 'provider', 'contractor', 'biller', 'name']) || '').trim();
    const explicitDesc = String(getColVal(row, ['description', 'item', 'details', 'particulars', 'activity', 'memo']) || '').trim();
    const dateVal = getColVal(row, ['date', 'time', 'period', 'month', 'billdate', 'txndate', 'invoicedate']);
    
    const qtyVal = parseFloat(getColVal(row, ['quantity', 'qty', 'volume', 'consumption', 'usage', 'distance', 'weight', 'litres', 'kwh']));
    const spendVal = parseFloat(getColVal(row, ['amount', 'spend', 'total', 'inr', 'cost', 'price', 'value']));

    const rowValues = Object.entries(row)
      .map(([k, v]) => `${k}:${v}`)
      .join(' ');

    const inference = inferRowCategoryAndScope(
      `${explicitDesc} ${rowValues}`,
      explicitCat,
      explicitScope,
      explicitUnit
    );

    let finalQty = !isNaN(qtyVal) ? qtyVal : (!isNaN(spendVal) ? spendVal : 0);
    let finalUnit = explicitUnit;
    if (!finalUnit) {
      if (inference.category === 'ELECTRICITY') finalUnit = 'kWh';
      else if (inference.category === 'FUEL') finalUnit = 'Liters';
      else if (inference.category === 'TRANSPORTATION') finalUnit = 'km';
      else if (inference.category === 'WASTE') finalUnit = 'kg';
      else finalUnit = !isNaN(spendVal) ? 'INR' : 'units';
    }

    const categoryData = {
      fuelType: String(getColVal(row, ['fueltype', 'fuel']) || inference.fuelType || '').trim(),
      transportMode: String(getColVal(row, ['transportmode', 'mode', 'vehicle']) || inference.transportMode || '').trim(),
      wasteType: String(getColVal(row, ['wastetype', 'waste']) || inference.wasteType || '').trim(),
      disposalMethod: String(getColVal(row, ['disposalmethod', 'disposal', 'method']) || inference.disposalMethod || '').trim(),
      spendAmount: !isNaN(spendVal) ? spendVal : (inference.category === 'SUPPLIER_INVOICE' && !isNaN(qtyVal) ? qtyVal : null),
      currency: 'INR',
    };

    const rowErrors = [];
    if (finalQty == null || finalQty <= 0) {
      rowErrors.push(`Missing or non-positive quantity / spend value`);
    }

    return {
      rowIndex: idx,
      rowNumber: rowNum,
      rawRow: row,
      category: inference.category,
      scope: inference.scope,
      activityDate: parseDate(dateVal) || new Date(),
      quantity: finalQty,
      unit: finalUnit,
      supplierName: explicitSupplier || '',
      description: explicitDesc || `Row ${rowNum} activity from ${fileName}`,
      categoryData,
      emissions: {
        emissionsKg: 0,
        emissionsTonnes: 0,
        factorUsed: null,
        factorUnit: '',
        methodology: '',
        source: '',
        calculationFormula: '',
        isNegativeOffset: false,
        tier: '',
        directEmissionsKg: null,
        upstreamEmissionsKg: null,
      },
      validationErrors: rowErrors,
      isIncluded: rowErrors.length === 0,
    };
  });

  const distinctScopes = [...new Set(lineItems.map((li) => li.scope).filter(Boolean))];
  const isMultiScope = distinctScopes.length > 1;

  return {
    lineItems,
    distinctScopes,
    isMultiScope,
  };
}

/**
 * Parses structured candidate fields from extracted text or table records
 */
export function extractStructuredFields(text = '', documentType = 'UNKNOWN', fileName = '', rawRecords = null) {
  // If tabular records are provided, extract batch summary fields
  if (rawRecords && Array.isArray(rawRecords) && rawRecords.length > 0) {
    const { lineItems, isMultiScope, distinctScopes } = extractTabularLineItems(rawRecords, fileName);
    const totalQuantity = lineItems.reduce((acc, li) => acc + (li.quantity || 0), 0);
    const first = lineItems[0] || {};

    return {
      category: isMultiScope ? 'SUPPLIER_INVOICE' : (first.category || 'SUPPLIER_INVOICE'),
      activityDate: first.activityDate || new Date(),
      quantity: totalQuantity > 0 ? totalQuantity : first.quantity,
      unit: first.unit || 'units',
      supplierName: first.supplierName || 'Multiple Counterparties',
      description: `Consolidated log with ${lineItems.length} records (${distinctScopes.join(', ')})`,
      categoryData: first.categoryData || {},
    };
  }

  // Regex and pattern extraction from raw text
  const category = inferCategoryFromDocType(documentType, text);
  const parsedDate = extractDateFromText(text);
  const parsedSupplier = extractSupplierFromText(text);
  const parsedQuantityAndUnit = extractQuantityAndUnit(text, category);

  return {
    category,
    activityDate: parsedDate,
    quantity: parsedQuantityAndUnit.quantity,
    unit: parsedQuantityAndUnit.unit,
    supplierName: parsedSupplier,
    description: parsedQuantityAndUnit.description || `Extracted from ${fileName}`,
    categoryData: {
      fuelType: extractFuelType(text, category),
      transportMode: extractTransportMode(text, category),
      wasteType: extractWasteType(text, category),
      disposalMethod: extractDisposalMethod(text, category),
    },
  };
}

/**
 * Validates fields according to SME operational category requirements
 */
export function validateExtractedFields(fields, category) {
  const errors = [];
  const confidence = {
    category: fields.category ? 0.9 : 0.2,
    activityDate: fields.activityDate ? 0.85 : 0.0,
    quantity: fields.quantity != null && fields.quantity > 0 ? 0.9 : 0.0,
    unit: fields.unit ? 0.9 : 0.0,
    supplierName: fields.supplierName ? 0.8 : 0.3,
  };

  if (!fields.activityDate) {
    errors.push('Missing valid activity date or billing period.');
  }

  if (fields.quantity == null || isNaN(fields.quantity) || fields.quantity <= 0) {
    errors.push('Missing or invalid numeric activity quantity.');
  }

  if (!fields.unit || fields.unit.trim() === '') {
    errors.push('Missing measurement unit.');
  }

  switch (category) {
    case 'ELECTRICITY': {
      const validUnits = ['kwh', 'mwh', 'units', 'wh'];
      if (fields.unit && !validUnits.includes(fields.unit.toLowerCase())) {
        errors.push(`Unrecognized unit '${fields.unit}' for electricity (expected: kWh, MWh).`);
      }
      break;
    }
    case 'FUEL': {
      const validFuelUnits = ['liters', 'litres', 'l', 'gallons', 'gal', 'm3', 'kg', 'barrels'];
      if (fields.unit && !validFuelUnits.includes(fields.unit.toLowerCase())) {
        errors.push(`Unrecognized unit '${fields.unit}' for fuel (expected: Liters, Gallons, m3).`);
      }
      if (!fields.categoryData?.fuelType) {
        errors.push('Missing fuel type (e.g., Diesel, Petrol, Natural Gas).');
      }
      break;
    }
    case 'TRANSPORTATION': {
      const validTransportUnits = ['km', 'miles', 'mi', 'tonne-km', 'tkm', 'ton-miles'];
      if (fields.unit && !validTransportUnits.includes(fields.unit.toLowerCase())) {
        errors.push(`Unrecognized unit '${fields.unit}' for transportation (expected: km, miles, tonne-km).`);
      }
      if (!fields.categoryData?.transportMode) {
        errors.push('Missing transportation mode (e.g., Road / Truck, Air, Sea Freight, Rail).');
      }
      break;
    }
    case 'WASTE': {
      const validWasteUnits = ['kg', 'tonnes', 'tons', 'lbs', 'm3'];
      if (fields.unit && !validWasteUnits.includes(fields.unit.toLowerCase())) {
        errors.push(`Unrecognized unit '${fields.unit}' for waste (expected: kg, tonnes, tons).`);
      }
      if (!fields.categoryData?.wasteType) {
        errors.push('Missing waste type (e.g., General, Recyclable, Hazardous, Scrap Metal).');
      }
      break;
    }
    case 'SUPPLIER_INVOICE': {
      if (!fields.supplierName || fields.supplierName.trim() === '') {
        errors.push('Missing supplier / vendor name.');
      }
      break;
    }
    default:
      break;
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    validationErrors: errors,
    fieldConfidence: confidence,
  };
}

// ----------------- Helpers -----------------

function inferCategoryFromDocType(documentType, text = '') {
  switch (documentType) {
    case 'ELECTRICITY_BILL':
      return 'ELECTRICITY';
    case 'FUEL_RECEIPT':
      return 'FUEL';
    case 'TRANSPORT_RECORD':
      return 'TRANSPORTATION';
    case 'WASTE_RECORD':
      return 'WASTE';
    case 'SUPPLIER_INVOICE':
      return 'SUPPLIER_INVOICE';
    default: {
      const lower = text.toLowerCase();
      if (lower.includes('kwh') || lower.includes('electric')) return 'ELECTRICITY';
      if (lower.includes('diesel') || lower.includes('petrol') || lower.includes('fuel')) return 'FUEL';
      if (lower.includes('freight') || lower.includes('transport') || lower.includes('shipment')) return 'TRANSPORTATION';
      if (lower.includes('waste') || lower.includes('recycling')) return 'WASTE';
      return 'SUPPLIER_INVOICE';
    }
  }
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function extractDateFromText(text) {
  // ISO: 2024-05-23
  const isoMatch = text.match(/\b(20\d\d[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12]\d|3[01]))\b/);
  if (isoMatch) return new Date(isoMatch[1]);

  // DD/MM/YYYY or MM/DD/YYYY: 14/05/2024
  const slashMatch = text.match(/\b(0[1-9]|[12]\d|3[01])[-/.](0[1-9]|1[0-2])[-/.](20\d\d)\b/);
  if (slashMatch) {
    const d = new Date(`${slashMatch[3]}-${slashMatch[2]}-${slashMatch[1]}`);
    if (!isNaN(d.getTime())) return d;
  }

  // Named month: 14 May 2024 or May 14, 2024
  const monthMatch = text.match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),?\s+(20\d\d)\b/i);
  if (monthMatch) {
    const d = new Date(`${monthMatch[1]} ${monthMatch[2]}, ${monthMatch[3]}`);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

function extractSupplierFromText(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 8)) {
    const match = line.match(/(?:supplier|vendor|biller|from|company|contractor)\s*:\s*([^,\n\r]+)/i);
    if (match) return match[1].trim();
  }
  // If top line looks like a company name
  if (lines.length > 0 && lines[0].length < 50 && !/invoice|bill|receipt|statement|date/i.test(lines[0])) {
    return lines[0];
  }
  return '';
}

function extractQuantityAndUnit(text, category) {
  const result = { quantity: null, unit: '', description: '' };

  if (category === 'ELECTRICITY') {
    const match = text.match(/(\d+(?:[.,]\d+)?)\s*(kwh|mwh|units)/i);
    if (match) {
      result.quantity = parseFloat(match[1].replace(',', ''));
      result.unit = match[2].toUpperCase() === 'MWH' ? 'MWh' : 'kWh';
      return result;
    }
    const elecMatch = text.match(/(?:consumption|usage|electricity|power|total)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
    if (elecMatch) {
      result.quantity = parseFloat(elecMatch[1].replace(',', ''));
      result.unit = 'kWh';
      return result;
    }
  }

  if (category === 'FUEL') {
    const match = text.match(/(\d+(?:[.,]\d+)?)\s*(liters|litres|l\b|gallons|gal|m3)/i);
    if (match) {
      result.quantity = parseFloat(match[1].replace(',', ''));
      result.unit = match[2].toLowerCase().startsWith('l') ? 'Liters' : match[2];
      return result;
    }
  }

  if (category === 'TRANSPORTATION') {
    const match = text.match(/(\d+(?:[.,]\d+)?)\s*(km|miles|mi|tonne-km|tkm)/i);
    if (match) {
      result.quantity = parseFloat(match[1].replace(',', ''));
      result.unit = match[2].toLowerCase().includes('t') ? 'tonne-km' : match[2].toLowerCase();
      return result;
    }
  }

  if (category === 'WASTE') {
    const match = text.match(/(\d+(?:[.,]\d+)?)\s*(kg|tonnes|tons|lbs)/i);
    if (match) {
      result.quantity = parseFloat(match[1].replace(',', ''));
      result.unit = match[2].toLowerCase();
      return result;
    }
  }

  // Fallback for general quantity / total
  const genericMatch = text.match(/(?:total|amount|qty|quantity)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*([a-zA-Z%]+)?/i);
  if (genericMatch) {
    result.quantity = parseFloat(genericMatch[1].replace(',', ''));
    result.unit = genericMatch[2] || 'units';
  }

  return result;
}

function extractFuelType(text, category) {
  if (category !== 'FUEL') return '';
  const lower = text.toLowerCase();
  if (lower.includes('diesel')) return 'Diesel';
  if (lower.includes('petrol') || lower.includes('gasoline')) return 'Petrol / Gasoline';
  if (lower.includes('natural gas') || lower.includes('cng')) return 'Natural Gas (CNG)';
  if (lower.includes('lpg') || lower.includes('propane')) return 'LPG';
  return '';
}

function extractTransportMode(text, category) {
  if (category !== 'TRANSPORTATION') return '';
  const lower = text.toLowerCase();
  if (lower.includes('air') || lower.includes('flight')) return 'Air Freight';
  if (lower.includes('sea') || lower.includes('maritime') || lower.includes('ocean')) return 'Sea Freight';
  if (lower.includes('rail') || lower.includes('train')) return 'Rail';
  if (lower.includes('truck') || lower.includes('road') || lower.includes('van')) return 'Road / Truck';
  return 'Road / Truck';
}

function extractWasteType(text, category) {
  if (category !== 'WASTE') return '';
  const lower = text.toLowerCase();
  if (lower.includes('hazardous')) return 'Hazardous Waste';
  if (lower.includes('scrap metal') || lower.includes('metal')) return 'Scrap Metal';
  if (lower.includes('plastic')) return 'Plastic';
  if (lower.includes('paper') || lower.includes('cardboard')) return 'Paper / Cardboard';
  if (lower.includes('organic') || lower.includes('compost')) return 'Organic Waste';
  return 'General Municipal Waste';
}

function extractDisposalMethod(text, category) {
  if (category !== 'WASTE') return '';
  const lower = text.toLowerCase();
  if (lower.includes('recycled') || lower.includes('recycling')) return 'Recycled';
  if (lower.includes('landfill')) return 'Landfill';
  if (lower.includes('incineration') || lower.includes('burned')) return 'Incineration';
  if (lower.includes('composted') || lower.includes('compost')) return 'Composted';
  return 'Landfill';
}
