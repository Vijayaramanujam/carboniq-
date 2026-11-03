import { Document } from '../models/Document.js';
import { calculateFileHash, findDuplicateDocument } from './cryptoService.js';
import { classifyDocument } from './classificationService.js';
import {
  extractRawContent,
  extractStructuredFields,
  extractTabularLineItems,
  validateExtractedFields,
} from './extractionService.js';
import { compressImageIfExceedsLimit } from './imageCompressionService.js';
import { performGroqScopeClassification, mapCategoryToScope } from './groqService.js';
import { calculateCarbonEmissions } from './carbonCalculationService.js';

/**
 * Executes the complete input processing lifecycle on a single document
 */
export async function processSingleDocument({
  companyId,
  filePath,
  originalFileName,
  storedFileName,
  mimeType,
  fileSize,
  sourceType = 'UPLOAD',
  archiveId = null,
  batchId = null,
  parentDocumentId = null,
}) {
  // Step 0: Compress image using Sharp if size exceeds 1MB
  const comp = await compressImageIfExceedsLimit(filePath, originalFileName, mimeType);
  if (comp.compressed) {
    fileSize = comp.newSize;
  }

  // Step 1: Calculate SHA-256 Hash
  const sha256 = await calculateFileHash(filePath);

  // Step 2: Check Duplicate (scoped to company)
  const existingDoc = await findDuplicateDocument(sha256, companyId);

  if (existingDoc && (!parentDocumentId || existingDoc._id.toString() !== parentDocumentId.toString())) {
    const duplicateDoc = new Document({
      companyId,
      originalFileName,
      storedFileName,
      mimeType,
      fileSize,
      sha256,
      storagePath: filePath,
      sourceType,
      archiveId,
      batchId,
      parentDocumentId,
      isDuplicate: true,
      duplicateOf: existingDoc._id,
      carbonRelevance: existingDoc.carbonRelevance,
      documentType: existingDoc.documentType,
      scope: existingDoc.scope || 'NOT_APPLICABLE',
      classificationReason: `Duplicate file detected via exact SHA-256 match with existing document: ${existingDoc.originalFileName} (ID: ${existingDoc._id})`,
      processingStatus: 'DUPLICATE',
      reviewStatus: 'PENDING',
      extractedFields: existingDoc.extractedFields,
    });

    await duplicateDoc.save();
    return duplicateDoc;
  }

  // Step 3: Extract raw text / Groq Vision analysis based on file type
  const rawExtraction = await extractRawContent(filePath, mimeType, originalFileName);

  // Step 4: Classify relevance to carbon accounting
  let classification = classifyDocument(rawExtraction.text, originalFileName);
  let docScope = 'UNKNOWN';

  // If Groq Vision already analyzed the image
  if (rawExtraction.groqAnalysis) {
    const ga = rawExtraction.groqAnalysis;
    if (ga.carbonRelevance && ga.carbonRelevance !== 'UNCERTAIN') {
      classification.carbonRelevance = ga.carbonRelevance;
    }
    if (ga.documentType && ga.documentType !== 'UNKNOWN') {
      classification.documentType = ga.documentType;
    }
    if (ga.classificationReason) {
      classification.classificationReason = ga.classificationReason;
    }
    if (ga.scope && ga.scope !== 'UNKNOWN') {
      docScope = ga.scope;
    }
  }

  // Step 5: Check Relevance
  if (classification.carbonRelevance === 'IRRELEVANT') {
    const irrelevantDoc = new Document({
      companyId,
      originalFileName,
      storedFileName,
      mimeType,
      fileSize,
      sha256,
      storagePath: filePath,
      sourceType,
      archiveId,
      batchId,
      parentDocumentId,
      documentType: classification.documentType,
      carbonRelevance: 'IRRELEVANT',
      scope: 'NOT_APPLICABLE',
      classificationReason: classification.classificationReason,
      processingStatus: 'REJECTED',
      reviewStatus: 'REJECTED',
      extractionMethod: rawExtraction.method,
      extractedText: rawExtraction.text,
      validationErrors: ['Document rejected: Identified as unrelated to SME operational carbon footprint.'],
    });

    await irrelevantDoc.save();

    if (parentDocumentId) {
      await Document.findByIdAndUpdate(parentDocumentId, { supersededBy: irrelevantDoc._id });
    }

    return irrelevantDoc;
  }

  // Step 6: Structured Field Extraction
  let extractedFields = extractStructuredFields(
    rawExtraction.text,
    classification.documentType,
    originalFileName,
    rawExtraction.rawRecords
  );

  let lineItems = [];
  let multiScopeSummary = null;
  let isMultiScope = false;
  let suggestedEmissions = null;

  // Tabular spreadsheet processing (row-by-row multi-scope classification & emissions calculation)
  if (rawExtraction.rawRecords && Array.isArray(rawExtraction.rawRecords) && rawExtraction.rawRecords.length > 0) {
    const tabularResult = extractTabularLineItems(rawExtraction.rawRecords, originalFileName);
    lineItems = tabularResult.lineItems;
    isMultiScope = tabularResult.isMultiScope;

    for (const li of lineItems) {
      if (li.quantity > 0) {
        try {
          const rowEmission = await calculateCarbonEmissions({
            category: li.category,
            scope: li.scope,
            quantity: li.quantity,
            unit: li.unit,
            categoryData: li.categoryData,
            supplierName: li.supplierName,
            description: li.description,
          });
          li.emissions = {
            emissionsKg: rowEmission.emissionsKg || 0,
            emissionsTonnes: rowEmission.emissionsTonnes || 0,
            factorUsed: rowEmission.factorUsed,
            factorUnit: rowEmission.factorUnit,
            methodology: rowEmission.methodology,
            source: rowEmission.source,
            calculationFormula: rowEmission.calculationFormula,
            isNegativeOffset: Boolean(rowEmission.isNegativeOffset),
            tier: rowEmission.tier,
            directEmissionsKg: rowEmission.directEmissionsKg,
            upstreamEmissionsKg: rowEmission.upstreamEmissionsKg,
          };
        } catch (err) {
          console.warn(`Row ${li.rowNumber} calculation failed:`, err.message);
          li.validationErrors.push(`Calculation error: ${err.message}`);
        }
      }
    }

    let s1 = 0;
    let s2 = 0;
    let s3 = 0;
    let offset = 0;
    let validRows = 0;

    for (const li of lineItems) {
      if (li.validationErrors.length === 0) {
        validRows++;
        const kg = li.emissions?.emissionsKg || 0;
        if (li.emissions?.isNegativeOffset || kg < 0) {
          offset += Math.abs(kg);
        } else if (li.scope === 'SCOPE_1') {
          s1 += kg;
        } else if (li.scope === 'SCOPE_2') {
          s2 += kg;
        } else {
          s3 += kg;
        }
      }
    }
    const net = (s1 + s2 + s3) - offset;

    multiScopeSummary = {
      scope1Kg: Math.round(s1 * 100) / 100,
      scope2Kg: Math.round(s2 * 100) / 100,
      scope3Kg: Math.round(s3 * 100) / 100,
      offsetKg: Math.round(offset * 100) / 100,
      netKg: Math.round(net * 100) / 100,
      totalRows: lineItems.length,
      validRows,
      distinctScopes: tabularResult.distinctScopes,
    };

    if (isMultiScope) {
      docScope = 'MULTI_SCOPE';
      classification.documentType = 'CONSOLIDATED_LOG';
      classification.carbonRelevance = 'RELEVANT';
      classification.classificationReason = `Consolidated multi-scope log with ${lineItems.length} records across ${tabularResult.distinctScopes.join(', ')}.`;
    } else if (tabularResult.distinctScopes.length === 1) {
      docScope = tabularResult.distinctScopes[0];
      classification.carbonRelevance = 'RELEVANT';
      classification.classificationReason = `Tabular operational log with ${lineItems.length} records under ${tabularResult.distinctScopes[0]}.`;
    }

    suggestedEmissions = {
      emissionsKg: multiScopeSummary.netKg,
      emissionsTonnes: Math.round((multiScopeSummary.netKg / 1000) * 1000) / 1000,
      calculationFormula: `Consolidated sum across ${lineItems.length} line items: S1(${multiScopeSummary.scope1Kg} kg) + S2(${multiScopeSummary.scope2Kg} kg) + S3(${multiScopeSummary.scope3Kg} kg) - Offsets(${multiScopeSummary.offsetKg} kg) = ${multiScopeSummary.netKg} kg CO2e`,
      source: 'Consolidated National Benchmark (CEA / IPCC / EXIOBASE 3.11.2)',
      methodology: 'Multi-Scope Tabular Activity Accounting',
      tier: 'IPCC Tier 1 / EEIO',
      isNegativeOffset: multiScopeSummary.netKg < 0,
    };
  }

  // Merge Groq Vision fields if present
  if (rawExtraction.groqAnalysis?.extractedFields) {
    const gf = rawExtraction.groqAnalysis.extractedFields;
    extractedFields = {
      ...extractedFields,
      category: gf.category || extractedFields.category,
      quantity: gf.quantity != null ? gf.quantity : extractedFields.quantity,
      unit: gf.unit || extractedFields.unit,
      activityDate: gf.activityDate ? new Date(gf.activityDate) : extractedFields.activityDate,
      supplierName: gf.supplierName || extractedFields.supplierName,
      description: gf.description || extractedFields.description,
      categoryData: {
        ...(extractedFields.categoryData || {}),
        ...(gf.categoryData || {}),
      },
    };
  }

  // Determine Scope using Groq for text-based documents if scope not already determined
  if (docScope === 'UNKNOWN') {
    const scopeAnalysis = await performGroqScopeClassification(
      rawExtraction.text,
      originalFileName,
      classification.documentType,
      extractedFields
    );
    docScope = scopeAnalysis.scope || mapCategoryToScope(extractedFields.category, classification.documentType);
  }

  // Step 7: Validation and confidence analysis
  const validation = validateExtractedFields(extractedFields, extractedFields.category);

  const errors = [...validation.validationErrors];
  if (rawExtraction.error) {
    errors.unshift(rawExtraction.error);
  }
  if (classification.carbonRelevance === 'UNCERTAIN') {
    errors.push('Document carbon relevance could not be verified automatically. User review required.');
  }

  const isFailed = rawExtraction.method === 'NONE' || (rawExtraction.error && !rawExtraction.text);
  const needsReview = isFailed || !validation.isValid || classification.carbonRelevance === 'UNCERTAIN';

  const processingStatus = isFailed ? 'FAILED' : needsReview ? 'NEEDS_REVIEW' : 'COMPLETED';
  const reviewStatus = isFailed ? 'REQUIRED' : needsReview ? 'REQUIRED' : 'PENDING';

  // Step 8: Calculate Suggested Carbon Emissions (IPCC / CEA Baseline for single documents)
  if (!suggestedEmissions) {
    try {
      if (classification.carbonRelevance !== 'IRRELEVANT' && extractedFields) {
        suggestedEmissions = await calculateCarbonEmissions({
          category: extractedFields.category,
          scope: docScope,
          quantity: extractedFields.quantity,
          unit: extractedFields.unit,
          categoryData: extractedFields.categoryData,
          supplierName: extractedFields.supplierName,
          description: extractedFields.description,
        });
      }
    } catch (calcErr) {
      console.error('Error calculating suggested emissions during processing:', calcErr);
    }
  }

  // Step 9: Persist Document Record
  const newDoc = new Document({
    companyId,
    originalFileName,
    storedFileName,
    mimeType,
    fileSize,
    sha256,
    storagePath: filePath,
    sourceType,
    archiveId,
    batchId,
    parentDocumentId,
    documentType: classification.documentType,
    carbonRelevance: classification.carbonRelevance,
    scope: docScope,
    isMultiScope,
    classificationReason: classification.classificationReason,
    processingStatus,
    reviewStatus,
    extractionMethod: rawExtraction.method,
    extractedText: rawExtraction.text,
    extractedFields,
    suggestedEmissions,
    lineItems,
    multiScopeSummary,
    fieldConfidence: validation.fieldConfidence,
    validationErrors: errors,
  });

  await newDoc.save();

  // If this is a re-upload of a parent document, mark parent as superseded
  if (parentDocumentId) {
    await Document.findByIdAndUpdate(parentDocumentId, { supersededBy: newDoc._id });
  }

  return newDoc;
}
