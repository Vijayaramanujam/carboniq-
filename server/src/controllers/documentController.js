import path from 'path';
import fs from 'fs';
import { Document } from '../models/Document.js';
import { UploadBatch } from '../models/UploadBatch.js';
import { ActivityRecord } from '../models/ActivityRecord.js';
import { processSingleDocument } from '../services/processingPipeline.js';
import { extractZipSafely } from '../services/archiveService.js';
import { validateExtractedFields } from '../services/extractionService.js';
import { mapCategoryToScope } from '../services/groqService.js';
import { calculateCarbonEmissions } from '../services/carbonCalculationService.js';
import { generateSingleDocumentPDF } from '../services/statutoryExportService.js';


/**
 * Multi-file document upload handler (Scoped to authenticated SME)
 */
export async function uploadDocuments(req, res) {
  try {
    const files = req.files;
    const companyId = req.company._id;

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files uploaded.' });
    }

    const batch = new UploadBatch({
      companyId,
      batchType: files.length > 1 ? 'MULTI_FILE' : 'SINGLE_FILE',
      totalFiles: files.length,
      status: 'PROCESSING',
    });
    await batch.save();

    const processedDocuments = [];
    let duplicates = 0;
    let failed = 0;
    let successful = 0;

    for (const file of files) {
      try {
        const doc = await processSingleDocument({
          companyId,
          filePath: file.path,
          originalFileName: file.originalname,
          storedFileName: file.filename,
          mimeType: file.mimetype,
          fileSize: file.size,
          sourceType: 'UPLOAD',
          batchId: batch._id,
        });

        processedDocuments.push(doc);

        if (doc.processingStatus === 'DUPLICATE') {
          duplicates++;
        } else if (doc.processingStatus === 'FAILED') {
          failed++;
        } else {
          successful++;
        }
      } catch (err) {
        failed++;
        batch.errorMessages.push(`Failed to process ${file.originalname}: ${err.message}`);
        console.error(`Error processing ${file.originalname}:`, err);
      }
    }

    batch.processedFiles = successful;
    batch.duplicateFiles = duplicates;
    batch.failedFiles = failed;
    batch.status = failed === files.length ? 'FAILED' : failed > 0 ? 'PARTIALLY_FAILED' : 'COMPLETED';
    await batch.save();

    res.status(201).json({
      success: true,
      batchId: batch._id,
      batch,
      documents: processedDocuments,
    });
  } catch (error) {
    console.error('Error in uploadDocuments:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * ZIP Archive upload and unpacking handler (Scoped to authenticated SME)
 */
export async function uploadZip(req, res) {
  try {
    const file = req.file;
    const companyId = req.company._id;

    if (!file) {
      return res.status(400).json({ success: false, error: 'No ZIP archive uploaded.' });
    }

    const targetDir = path.resolve(process.env.UPLOAD_DIR || './uploads/documents');

    let extractedFiles;
    try {
      extractedFiles = await extractZipSafely(file.path, targetDir);
    } catch (zipErr) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(400).json({
        success: false,
        error: `Archive validation failed: ${zipErr.message}`,
      });
    }

    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

    if (extractedFiles.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No supported documents (.pdf, .jpg, .png, .csv, .xlsx) found in ZIP archive.',
      });
    }

    const batch = new UploadBatch({
      companyId,
      batchType: 'ZIP_ARCHIVE',
      archiveFileName: file.originalname,
      totalFiles: extractedFiles.length,
      status: 'PROCESSING',
    });
    await batch.save();

    const processedDocuments = [];
    let duplicates = 0;
    let failed = 0;
    let successful = 0;

    for (const extracted of extractedFiles) {
      try {
        const doc = await processSingleDocument({
          companyId,
          filePath: extracted.storagePath,
          originalFileName: extracted.originalFileName,
          storedFileName: extracted.storedFileName,
          mimeType: extracted.mimeType,
          fileSize: extracted.fileSize,
          sourceType: 'ZIP_ENTRY',
          archiveId: batch._id,
          batchId: batch._id,
        });

        processedDocuments.push(doc);

        if (doc.processingStatus === 'DUPLICATE') {
          duplicates++;
        } else if (doc.processingStatus === 'FAILED') {
          failed++;
        } else {
          successful++;
        }
      } catch (err) {
        failed++;
        batch.errorMessages.push(`Failed entry ${extracted.originalFileName}: ${err.message}`);
        console.error(`Error processing zip entry ${extracted.originalFileName}:`, err);
      }
    }

    batch.processedFiles = successful;
    batch.duplicateFiles = duplicates;
    batch.failedFiles = failed;
    batch.status = failed === extractedFiles.length ? 'FAILED' : failed > 0 ? 'PARTIALLY_FAILED' : 'COMPLETED';
    await batch.save();

    res.status(201).json({
      success: true,
      batchId: batch._id,
      batch,
      documents: processedDocuments,
    });
  } catch (error) {
    console.error('Error in uploadZip:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * List documents with optional filtering (Scoped to authenticated SME)
 */
export async function getDocuments(req, res) {
  try {
    const { status, relevance, search, batchId } = req.query;
    const filter = { companyId: req.company._id };

    if (status) filter.processingStatus = status;
    if (relevance) filter.carbonRelevance = relevance;
    if (batchId) filter.batchId = batchId;
    if (search) {
      filter.$and = [
        { companyId: req.company._id },
        {
          $or: [
            { originalFileName: { $regex: search, $options: 'i' } },
            { classificationReason: { $regex: search, $options: 'i' } },
            { 'extractedFields.supplierName': { $regex: search, $options: 'i' } },
          ],
        },
      ];
    }

    const documents = await Document.find(filter)
      .sort({ createdAt: -1 })
      .populate('parentDocumentId', 'originalFileName processingStatus')
      .populate('duplicateOf', 'originalFileName processingStatus createdAt')
      .populate('supersededBy', 'originalFileName processingStatus')
      .limit(100)
      .lean();

    res.json({ success: true, count: documents.length, documents });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get single document details (Scoped to authenticated SME)
 */
export async function getDocumentById(req, res) {
  try {
    const doc = await Document.findOne({ _id: req.params.id, companyId: req.company._id })
      .populate('parentDocumentId')
      .populate('duplicateOf')
      .populate('supersededBy')
      .lean();

    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found or unauthorized.' });
    }

    const activityRecords = await ActivityRecord.find({ documentId: doc._id, companyId: req.company._id }).lean();

    res.json({ success: true, document: doc, activityRecords });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Securely stream original document file for browser preview
 */
export async function getDocumentPreview(req, res) {
  try {
    const doc = await Document.findOne({ _id: req.params.id, companyId: req.company._id });
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found.' });
    }

    const absolutePath = path.resolve(doc.storagePath);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ success: false, error: 'Stored document file not found on disk.' });
    }

    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.originalFileName)}"`);
    res.setHeader('Content-Security-Policy', "default-src 'self'");

    const readStream = fs.createReadStream(absolutePath);
    readStream.pipe(res);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Re-upload a clearer replacement for a document
 */
export async function reuploadDocument(req, res) {
  try {
    const parentId = req.params.id;
    const parentDoc = await Document.findOne({ _id: parentId, companyId: req.company._id });

    if (!parentDoc) {
      return res.status(404).json({ success: false, error: 'Parent document not found.' });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, error: 'No replacement file provided.' });
    }

    const replacementDoc = await processSingleDocument({
      companyId: req.company._id,
      filePath: file.path,
      originalFileName: file.originalname,
      storedFileName: file.filename,
      mimeType: file.mimetype,
      fileSize: file.size,
      sourceType: 'UPLOAD',
      parentDocumentId: parentDoc._id,
    });

    res.status(201).json({
      success: true,
      message: 'Replacement document uploaded and processed.',
      document: replacementDoc,
      supersededDocumentId: parentDoc._id,
    });
  } catch (error) {
    console.error('Error in reuploadDocument:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Reprocess an existing document through the extraction & validation pipeline
 */
export async function reprocessDocument(req, res) {
  try {
    const doc = await Document.findOne({ _id: req.params.id, companyId: req.company._id });
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found.' });
    }

    const filePath = path.resolve(doc.storagePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Document file missing on disk.' });
    }

    const updated = await processSingleDocument({
      companyId: req.company._id,
      filePath,
      originalFileName: doc.originalFileName,
      storedFileName: doc.storedFileName,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      sourceType: doc.sourceType,
      parentDocumentId: doc.parentDocumentId,
    });

    res.json({
      success: true,
      message: 'Document reprocessed successfully.',
      document: updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * User review and field correction handler
 */
export async function reviewDocument(req, res) {
  try {
    const { action, correctedFields } = req.body;
    const doc = await Document.findOne({ _id: req.params.id, companyId: req.company._id });

    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found.' });
    }

    // Permanent decision requirement: cannot re-approve or re-reject
    if (doc.reviewStatus === 'APPROVED' || doc.reviewStatus === 'REJECTED') {
      return res.status(400).json({
        success: false,
        error: `This document has already been permanently ${doc.reviewStatus.toLowerCase()} and cannot be reviewed again.`,
      });
    }

    if (!['APPROVED', 'REJECTED'].includes(action)) {
      return res.status(400).json({ success: false, error: "Action must be 'APPROVED' or 'REJECTED'." });
    }

    if (action === 'REJECTED') {
      doc.reviewStatus = 'REJECTED';
      doc.processingStatus = 'REJECTED';
      await doc.save();
      return res.json({ success: true, message: 'Document marked as rejected.', document: doc });
    }

    const isMultiScopeDoc = doc.scope === 'MULTI_SCOPE' || (doc.lineItems && doc.lineItems.length > 0);

    if (isMultiScopeDoc) {
      // 1. Process Multi-Scope Tabular Approval
      const itemsToProcess = req.body.lineItems || doc.lineItems || [];
      const updatedLineItems = [];

      for (const item of itemsToProcess) {
        let emissions = item.emissions;
        // Recalculate if emissions missing or non-positive while quantity is valid
        if (!emissions || emissions.emissionsKg == null) {
          try {
            emissions = await calculateCarbonEmissions({
              category: item.category,
              scope: item.scope,
              quantity: item.quantity,
              unit: item.unit,
              categoryData: item.categoryData,
              supplierName: item.supplierName,
              description: item.description,
            });
          } catch (calcErr) {
            console.error(`Error calculating emissions for row ${item.rowNumber}:`, calcErr);
          }
        }

        updatedLineItems.push({
          ...item,
          emissions: emissions || item.emissions || {},
          isIncluded: item.isIncluded !== false,
        });
      }

      doc.lineItems = updatedLineItems;

      // Re-aggregate multiScopeSummary
      let s1 = 0;
      let s2 = 0;
      let s3 = 0;
      let offset = 0;
      let validCount = 0;
      const scopesPresent = new Set();
      const includedValidItems = [];

      for (const item of doc.lineItems) {
        if (item.isIncluded !== false) {
          validCount++;
          if (item.scope) scopesPresent.add(item.scope);
          const e = item.emissions || {};
          const kg = Number(e.emissionsKg || 0);
          if (e.isNegativeOffset || kg < 0) {
            offset += Math.abs(kg);
          } else {
            if (item.scope === 'SCOPE_1') s1 += kg;
            else if (item.scope === 'SCOPE_2') s2 += kg;
            else s3 += kg;
          }
          includedValidItems.push(item);
        }
      }

      if (includedValidItems.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Cannot approve document with 0 included line items. Please include at least one row.',
        });
      }

      const netKg = Number(Math.max(0, (s1 + s2 + s3) - offset).toFixed(2));
      doc.multiScopeSummary = {
        scope1Kg: Number(s1.toFixed(2)),
        scope2Kg: Number(s2.toFixed(2)),
        scope3Kg: Number(s3.toFixed(2)),
        offsetKg: Number(offset.toFixed(2)),
        netKg,
        totalRows: doc.lineItems.length,
        validRows: validCount,
        distinctScopes: Array.from(scopesPresent),
      };

      doc.suggestedEmissions = {
        emissionsKg: netKg,
        emissionsTonnes: Number((netKg / 1000).toFixed(4)),
        totalCo2e: netKg,
        scope1Co2e: Number(s1.toFixed(2)),
        scope2Co2e: Number(s2.toFixed(2)),
        scope3Co2e: Number(s3.toFixed(2)),
        netOffsetCo2e: Number(offset.toFixed(2)),
        methodology: 'GHG Protocol Multi-Scope Consolidated Inventory',
        factorKey: 'MULTI_TIER_CONSOLIDATED',
        factorName: `Consolidated Multi-Scope Ledger (${includedValidItems.length} activities)`,
      };

      doc.reviewStatus = 'APPROVED';
      doc.processingStatus = 'COMPLETED';
      doc.validationErrors = [];
      await doc.save();

      // Clear any prior activities for this document
      await ActivityRecord.deleteMany({ documentId: doc._id, companyId: req.company._id });

      // Bulk insert individual activity records
      const activityDocs = includedValidItems.map((item) => ({
        companyId: req.company._id,
        documentId: doc._id,
        recordSource: 'EXTRACTED',
        category: item.category || 'SUPPLIER_INVOICE',
        scope: item.scope && ['SCOPE_1', 'SCOPE_2', 'SCOPE_3'].includes(item.scope) ? item.scope : 'SCOPE_3',
        activityDate: item.activityDate || doc.createdAt || new Date(),
        quantity: item.quantity || 0,
        unit: item.unit || 'unit',
        supplierName: item.supplierName || '',
        description: item.description || `Row ${item.rowNumber} from ${doc.originalFileName}`,
        categoryData: {
          ...(item.categoryData || {}),
          currency: 'INR',
          rowIndex: item.rowIndex,
          rowNumber: item.rowNumber,
        },
        carbonEmissions: item.emissions || {},
        verificationStatus: 'APPROVED',
      }));

      const createdActivities = await ActivityRecord.insertMany(activityDocs);

      return res.json({
        success: true,
        message: `Consolidated ledger approved. ${createdActivities.length} individual activity records recorded across ${Array.from(scopesPresent).join(', ')}.`,
        document: doc,
        activityRecords: createdActivities,
        multiScopeSummary: doc.multiScopeSummary,
      });
    }

    const fields = correctedFields || doc.extractedFields || {};
    const category = fields.category || 'SUPPLIER_INVOICE';

    const validation = validateExtractedFields(fields, category);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Cannot approve document with unresolved validation errors.',
        validationErrors: validation.validationErrors,
      });
    }

    const assignedScope =
      (fields.scope && ['SCOPE_1', 'SCOPE_2', 'SCOPE_3'].includes(fields.scope))
        ? fields.scope
        : (doc.scope && doc.scope.startsWith('SCOPE_'))
          ? doc.scope
          : mapCategoryToScope(category, doc.documentType);

    // Calculate emissions according to CARBON_EMISSION_CALCULATION_METHODS.md
    let emissionsReport = null;
    try {
      emissionsReport = await calculateCarbonEmissions({
        category,
        scope: assignedScope,
        quantity: fields.quantity,
        unit: fields.unit,
        categoryData: fields.categoryData,
        supplierName: fields.supplierName,
        description: fields.description,
      });
      doc.suggestedEmissions = emissionsReport;
    } catch (calcErr) {
      console.error('Error calculating emissions on review approval:', calcErr);
    }

    if (fields.scope && ['SCOPE_1', 'SCOPE_2', 'SCOPE_3'].includes(fields.scope)) {
      doc.scope = fields.scope;
    }
    doc.extractedFields = fields;
    doc.reviewStatus = 'APPROVED';
    doc.processingStatus = 'COMPLETED';
    doc.validationErrors = [];
    await doc.save();

    let activity = await ActivityRecord.findOne({ documentId: doc._id, companyId: req.company._id });
    if (!activity) {
      activity = new ActivityRecord({
        companyId: req.company._id,
        documentId: doc._id,
        recordSource: 'EXTRACTED',
        category,
        scope: assignedScope,
        activityDate: fields.activityDate || new Date(),
        quantity: fields.quantity,
        unit: fields.unit,
        supplierName: fields.supplierName || '',
        description: fields.description || `Extracted from ${doc.originalFileName}`,
        categoryData: {
          ...fields.categoryData,
          currency: 'INR',
        },
        carbonEmissions: emissionsReport || {},
        verificationStatus: 'APPROVED',
      });
    } else {
      activity.category = category;
      activity.scope = assignedScope;
      activity.activityDate = fields.activityDate || activity.activityDate;
      activity.quantity = fields.quantity;
      activity.unit = fields.unit;
      activity.supplierName = fields.supplierName || activity.supplierName;
      activity.description = fields.description || activity.description;
      activity.categoryData = {
        ...activity.categoryData,
        ...fields.categoryData,
        currency: 'INR',
      };
      if (emissionsReport) {
        activity.carbonEmissions = emissionsReport;
      }
      activity.verificationStatus = 'APPROVED';
    }

    await activity.save();

    res.json({
      success: true,
      message: 'Document reviewed and approved. Activity record created with calculated emissions.',
      document: doc,
      activityRecord: activity,
      emissions: emissionsReport,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Live calculation endpoint for document review suggestions
 */
export async function calculateDocumentEmissionsHandler(req, res) {
  try {
    const { category, scope, quantity, unit, categoryData, supplierName, description } = req.body;
    const report = await calculateCarbonEmissions({
      category,
      scope,
      quantity,
      unit,
      categoryData,
      supplierName,
      description,
    });
    res.json({ success: true, emissions: report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Generates and downloads individual document carbon verification certificate (PDF)
 */
export async function exportDocumentReportPDF(req, res) {
  try {
    const doc = await Document.findOne({ _id: req.params.id, companyId: req.company._id });
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found or unauthorized.' });
    }

    // Ensure emissions are calculated
    if (!doc.suggestedEmissions?.emissionsKg && doc.extractedFields?.quantity) {
      try {
        const emissions = await calculateCarbonEmissions({
          category: doc.extractedFields.category || doc.documentType,
          scope: doc.scope,
          quantity: doc.extractedFields.quantity,
          unit: doc.extractedFields.unit,
          categoryData: doc.extractedFields.categoryData,
          supplierName: doc.extractedFields.supplierName,
          description: doc.extractedFields.description,
        });
        doc.suggestedEmissions = emissions;
        await doc.save();
      } catch (err) {
        console.error('Error calculating emissions for single document report:', err);
      }
    }

    const safeName = (doc.originalFileName || 'document').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${safeName}_Carbon_Certificate.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    generateSingleDocumentPDF(doc, req.company, res);
  } catch (error) {
    console.error('Error in exportDocumentReportPDF:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

