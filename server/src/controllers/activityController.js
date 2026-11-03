import { ActivityRecord } from '../models/ActivityRecord.js';
import { validateExtractedFields } from '../services/extractionService.js';
import { mapCategoryToScope } from '../services/groqService.js';
import { calculateCarbonEmissions } from '../services/carbonCalculationService.js';

/**
 * Creates a manual activity record for authenticated Indian SME
 */
export async function createActivity(req, res) {
  try {
    const {
      documentId,
      category,
      activityDate,
      quantity,
      unit,
      supplierName,
      description,
      categoryData,
      notes,
    } = req.body;

    const companyId = req.company._id;

    if (!category) {
      return res.status(400).json({ success: false, error: 'Category is required.' });
    }

    const fieldsToValidate = {
      category,
      activityDate: activityDate ? new Date(activityDate) : null,
      quantity: parseFloat(quantity),
      unit: unit ? unit.trim() : '',
      supplierName: supplierName ? supplierName.trim() : '',
      categoryData: {
        ...(categoryData || {}),
        currency: 'INR',
      },
    };

    const validation = validateExtractedFields(fieldsToValidate, category);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed for activity entry.',
        validationErrors: validation.validationErrors,
      });
    }

    const assignedScope = req.body.scope || mapCategoryToScope(category);
    let carbonEmissions = {};
    try {
      carbonEmissions = await calculateCarbonEmissions({
        category,
        scope: assignedScope,
        quantity: fieldsToValidate.quantity,
        unit: fieldsToValidate.unit,
        categoryData: fieldsToValidate.categoryData,
        supplierName: fieldsToValidate.supplierName,
        description,
      });
    } catch (calcErr) {
      console.error('Error calculating emissions for manual activity:', calcErr);
    }

    const activity = new ActivityRecord({
      companyId,
      documentId: documentId || null,
      recordSource: 'MANUAL',
      category,
      scope: assignedScope,
      activityDate: fieldsToValidate.activityDate,
      quantity: fieldsToValidate.quantity,
      unit: fieldsToValidate.unit,
      supplierName: fieldsToValidate.supplierName,
      description: description || 'Manually entered SME activity record',
      categoryData: fieldsToValidate.categoryData,
      carbonEmissions,
      verificationStatus: 'APPROVED',
      notes: notes || '',
    });

    await activity.save();

    res.status(201).json({
      success: true,
      message: 'Activity record created successfully in INR.',
      activity,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Lists all activity records for authenticated Indian SME
 */
export async function getActivities(req, res) {
  try {
    const { category, source, verificationStatus } = req.query;
    const filter = { companyId: req.company._id };

    if (category) filter.category = category;
    if (source) filter.recordSource = source;
    if (verificationStatus) filter.verificationStatus = verificationStatus;

    const activities = await ActivityRecord.find(filter)
      .populate('documentId', 'originalFileName processingStatus reviewStatus')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, count: activities.length, activities });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Updates an activity record for authenticated Indian SME
 */
export async function updateActivity(req, res) {
  try {
    const activity = await ActivityRecord.findOne({ _id: req.params.id, companyId: req.company._id });
    if (!activity) {
      return res.status(404).json({ success: false, error: 'Activity record not found or unauthorized.' });
    }

    const updates = req.body;
    const targetCategory = updates.category || activity.category;

    if (updates.quantity != null) {
      const num = parseFloat(updates.quantity);
      if (isNaN(num) || num <= 0) {
        return res.status(400).json({ success: false, error: 'Quantity must be a positive number.' });
      }
      activity.quantity = num;
    }

    if (updates.unit) activity.unit = updates.unit.trim();
    if (updates.activityDate) activity.activityDate = new Date(updates.activityDate);
    if (updates.supplierName !== undefined) activity.supplierName = updates.supplierName;
    if (updates.description !== undefined) activity.description = updates.description;
    if (updates.categoryData) {
      activity.categoryData = {
        ...activity.categoryData,
        ...updates.categoryData,
        currency: 'INR',
      };
    }
    if (updates.verificationStatus) activity.verificationStatus = updates.verificationStatus;
    if (updates.notes !== undefined) activity.notes = updates.notes;
    activity.category = targetCategory;

    await activity.save();

    res.json({ success: true, message: 'Activity record updated.', activity });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Deletes an activity record for authenticated Indian SME
 */
export async function deleteActivity(req, res) {
  try {
    const activity = await ActivityRecord.findOneAndDelete({ _id: req.params.id, companyId: req.company._id });
    if (!activity) {
      return res.status(404).json({ success: false, error: 'Activity record not found or unauthorized.' });
    }
    res.json({ success: true, message: 'Activity record deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
