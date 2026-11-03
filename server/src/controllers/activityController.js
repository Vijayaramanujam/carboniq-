import mongoose from 'mongoose';
import { ActivityRecord } from '../models/ActivityRecord.js';
import { validateExtractedFields } from '../services/extractionService.js';
import { mapCategoryToScope } from '../services/groqService.js';
import { calculateCarbonEmissions } from '../services/carbonCalculationService.js';

export const demoActivities = [];

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
    } catch (calcError) {
      console.warn('Emission calculation warning:', calcError.message);
    }

    if (mongoose.connection.readyState !== 1) {
      const activity = {
        _id: 'act_' + Date.now().toString(36),
        companyId,
        recordSource: 'MANUAL',
        category,
        scope: assignedScope,
        activityDate: fieldsToValidate.activityDate || new Date(),
        quantity: fieldsToValidate.quantity,
        unit: fieldsToValidate.unit,
        supplierName: fieldsToValidate.supplierName,
        description: description || '',
        categoryData: fieldsToValidate.categoryData,
        carbonEmissions,
        notes: notes ? notes.trim() : '',
        verificationStatus: 'APPROVED',
        createdAt: new Date(),
      };
      demoActivities.unshift(activity);

      return res.status(201).json({
        success: true,
        message: 'Activity record created successfully in INR.',
        activity,
      });
    }

    const activity = new ActivityRecord({
      companyId,
      documentId: documentId || null,
      recordSource: 'MANUAL',
      category,
      scope: assignedScope,
      activityDate: fieldsToValidate.activityDate || new Date(),
      quantity: fieldsToValidate.quantity,
      unit: fieldsToValidate.unit,
      supplierName: fieldsToValidate.supplierName,
      description: description || '',
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

    if (mongoose.connection.readyState !== 1) {
      let filtered = demoActivities.slice();
      if (category) filtered = filtered.filter((a) => a.category === category);
      if (source) filtered = filtered.filter((a) => a.recordSource === source);
      if (verificationStatus) filtered = filtered.filter((a) => a.verificationStatus === verificationStatus);
      return res.json({ success: true, count: filtered.length, activities: filtered });
    }

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
    const { id } = req.params;
    const updateData = req.body;

    if (mongoose.connection.readyState !== 1) {
      const act = demoActivities.find((a) => a._id === id);
      if (act) Object.assign(act, updateData);
      return res.json({ success: true, activity: act });
    }

    const activity = await ActivityRecord.findOneAndUpdate(
      { _id: id, companyId: req.company._id },
      { $set: updateData },
      { new: true }
    );

    if (!activity) {
      return res.status(404).json({ success: false, error: 'Activity record not found.' });
    }

    res.json({ success: true, activity });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Deletes an activity record for authenticated Indian SME
 */
export async function deleteActivity(req, res) {
  try {
    const { id } = req.params;

    if (mongoose.connection.readyState !== 1) {
      const idx = demoActivities.findIndex((a) => a._id === id);
      if (idx !== -1) demoActivities.splice(idx, 1);
      return res.json({ success: true, message: 'Activity record deleted successfully.' });
    }

    const activity = await ActivityRecord.findOneAndDelete({
      _id: id,
      companyId: req.company._id,
    });

    if (!activity) {
      return res.status(404).json({ success: false, error: 'Activity record not found.' });
    }

    res.json({ success: true, message: 'Activity record deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
