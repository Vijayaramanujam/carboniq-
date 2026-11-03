import axios from 'axios';
import fs from 'fs';
import path from 'path';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Maps category to standard GHG Protocol scope fallback
 */
export function mapCategoryToScope(category, documentType = '') {
  switch (category) {
    case 'ELECTRICITY':
      return 'SCOPE_2';
    case 'FUEL':
      return 'SCOPE_1';
    case 'TRANSPORTATION':
      return 'SCOPE_3';
    case 'WASTE':
      return 'SCOPE_3';
    case 'SUPPLIER_INVOICE':
      return 'SCOPE_3';
    default: {
      if (documentType === 'PAYROLL_SALARY' || documentType === 'IRRELEVANT') {
        return 'NOT_APPLICABLE';
      }
      return 'SCOPE_3';
    }
  }
}

/**
 * Extracts text, classifies carbon relevance, and determines GHG Scope from image using Groq Vision API
 */
export async function performGroqVisionExtraction(filePath, originalFileName, mimeType) {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';

  if (!apiKey || apiKey.trim() === '') {
    return {
      success: false,
      text: '',
      error: 'Vision AI API key is not configured in server/.env.',
      scope: 'UNKNOWN',
      confidence: 0,
    };
  }

  try {
    const ext = path.extname(originalFileName).toLowerCase();
    const effectiveMime = mimeType || (ext === '.png' ? 'image/png' : 'image/jpeg');
    const imageBuffer = fs.readFileSync(filePath);
    const base64Image = imageBuffer.toString('base64');
    const dataUrl = `data:${effectiveMime};base64,${base64Image}`;

    const prompt = `You are an expert AI carbon accounting auditor analyzing business operational records for Indian SMEs.
Analyze this document image and return a STRICT JSON object with these exact keys:
1. "extractedText": Complete optical text transcription visible in the document.
2. "carbonRelevance": "RELEVANT" if related to energy, fuel, logistics, waste, or supplier operational activity. "IRRELEVANT" for employee salaries, personal payslips, resume, or unrelated files. "UNCERTAIN" if blurry or ambiguous.
3. "documentType": One of "ELECTRICITY_BILL", "FUEL_RECEIPT", "TRANSPORT_RECORD", "WASTE_RECORD", "SUPPLIER_INVOICE", "AUDIT_SHEET", "PAYROLL_SALARY", "UNKNOWN".
4. "classificationReason": Concise sentence explaining why this document is relevant/irrelevant.
5. "scope": GHG Protocol Scope classification:
   - "SCOPE_1" for direct emissions (Fuel receipts, diesel generator, stationary combustion, mobile company vehicles).
   - "SCOPE_2" for indirect purchased energy (Electricity bills, power utility, grid consumption).
   - "SCOPE_3" for value-chain emissions (Logistics freight, transportation by third parties, waste disposal manifests, supplier invoices, purchased goods).
   - "NOT_APPLICABLE" for non-carbon documents (payroll/salary).
6. "extractedFields": {
   "category": "ELECTRICITY" | "FUEL" | "TRANSPORTATION" | "WASTE" | "SUPPLIER_INVOICE",
   "activityDate": "YYYY-MM-DD" (or null if not found),
   "quantity": numeric consumption value (or null),
   "unit": standard measurement unit like "kWh", "MWh", "Liters", "Gallons", "km", "tonne-km", "kg", "tonnes", "units",
   "supplierName": string vendor/utility company name,
   "description": brief summary of activity,
   "categoryData": {
     "fuelType": "Diesel" | "Petrol" | "Natural Gas (CNG)" | "LPG" (if fuel),
     "transportMode": "Road / Truck" | "Air Freight" | "Sea Freight" | "Rail" (if transport),
     "wasteType": "Hazardous" | "Scrap Metal" | "General Municipal Waste" | "Cardboard" (if waste),
     "disposalMethod": "Landfill" | "Recycled" | "Incineration" | "Composted" (if waste),
     "currency": "INR"
   }
}
7. "confidence": Numeric value between 0.0 and 1.0 representing extraction clarity.

Return ONLY the JSON object. Do not enclose in markdown code fences.`;

    const response = await axios.post(
      GROQ_API_URL,
      {
        model,
        messages: [
          {
            role: 'system',
            content: 'You are an accurate carbon accounting OCR & GHG Protocol classification specialist. You always output valid, raw JSON only.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        timeout: 45000,
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Vision AI returned an empty response.');
    }

    const parsed = JSON.parse(content);

    const rawReason = parsed.classificationReason || 'Analyzed via Multimodal Vision AI.';
    const sanitizedReason = rawReason.replace(/groq(\s+vision)?/gi, 'Multimodal AI');

    return {
      success: true,
      text: parsed.extractedText || '',
      carbonRelevance: parsed.carbonRelevance || 'UNCERTAIN',
      documentType: parsed.documentType || 'UNKNOWN',
      classificationReason: sanitizedReason,
      scope: parsed.scope || mapCategoryToScope(parsed.extractedFields?.category, parsed.documentType),
      extractedFields: parsed.extractedFields || {},
      confidence: parsed.confidence || 0.85,
      error: null,
    };
  } catch (error) {
    console.error('Vision AI extraction error:', error.response?.data || error.message);
    const msg = error.response?.data?.error?.message || error.message;
    return {
      success: false,
      text: '',
      error: `Vision AI Processing: ${msg}`.replace(/groq(\s+vision)?/gi, 'Vision AI'),
      scope: 'UNKNOWN',
      confidence: 0,
    };
  }
}

/**
 * Determines GHG Protocol Scope and validates classification for pre-extracted text documents (PDFs, CSV, Excel)
 */
export async function performGroqScopeClassification(text, originalFileName, preliminaryDocType, candidateFields) {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';

  // Fallback if API key is not configured
  if (!apiKey || apiKey.trim() === '') {
    const fallbackScope = mapCategoryToScope(candidateFields?.category, preliminaryDocType);
    return {
      scope: fallbackScope,
      reason: `Assigned ${fallbackScope} based on category ${candidateFields?.category || preliminaryDocType}.`,
    };
  }

  try {
    const prompt = `Analyze the extracted text from this business document (${originalFileName}) and determine its GHG Protocol Scope.
Preliminary Document Type: ${preliminaryDocType}
Candidate Category: ${candidateFields?.category}
Sample Text:
"""
${text.slice(0, 2000)}
"""

Return a STRICT JSON object with:
1. "scope": "SCOPE_1" (Direct: fuel/combustion/company vehicles), "SCOPE_2" (Purchased electricity/steam), "SCOPE_3" (Value chain: freight, waste, supplier spend), or "NOT_APPLICABLE" (payroll/irrelevant).
2. "carbonRelevance": "RELEVANT", "IRRELEVANT", or "UNCERTAIN".
3. "scopeReason": Brief explanation of the assigned Scope under GHG Protocol standards.

Return ONLY raw JSON.`;

    const response = await axios.post(
      GROQ_API_URL,
      {
        model,
        messages: [
          { role: 'system', content: 'You are a carbon accounting auditor. Output raw JSON only.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);

    return {
      scope: parsed.scope || mapCategoryToScope(candidateFields?.category, preliminaryDocType),
      carbonRelevance: parsed.carbonRelevance,
      reason: parsed.scopeReason,
    };
  } catch (error) {
    console.warn('Groq Scope classification fallback:', error.message);
    const fallbackScope = mapCategoryToScope(candidateFields?.category, preliminaryDocType);
    return {
      scope: fallbackScope,
      reason: `Assigned ${fallbackScope} based on category ${candidateFields?.category || preliminaryDocType}.`,
    };
  }
}
