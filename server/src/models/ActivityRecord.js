import mongoose from 'mongoose';

const ActivityRecordSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      default: null,
      index: true,
    },
    recordSource: {
      type: String,
      enum: ['EXTRACTED', 'MANUAL'],
      required: true,
      default: 'EXTRACTED',
    },
    category: {
      type: String,
      enum: ['ELECTRICITY', 'FUEL', 'TRANSPORTATION', 'WASTE', 'SUPPLIER_INVOICE'],
      required: true,
    },
    scope: {
      type: String,
      enum: ['SCOPE_1', 'SCOPE_2', 'SCOPE_3'],
      required: true,
      default: 'SCOPE_2',
    },
    activityDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    supplierName: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    categoryData: {
      fuelType: { type: String, default: '' },
      transportMode: { type: String, default: '' },
      disposalMethod: { type: String, default: '' },
      wasteType: { type: String, default: '' },
      billingPeriodStart: { type: Date, default: null },
      billingPeriodEnd: { type: Date, default: null },
      spendAmount: { type: Number, default: null },
      currency: { type: String, default: 'INR' },
    },
    sourcePage: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    verificationStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
    notes: {
      type: String,
      default: '',
    },
    carbonEmissions: {
      emissionsKg: { type: Number, default: 0 },
      emissionsTonnes: { type: Number, default: 0 },
      factorUsed: { type: Number, default: null },
      factorUnit: { type: String, default: '' },
      activityUnit: { type: String, default: '' },
      methodology: { type: String, default: '' },
      source: { type: String, default: '' },
      calculationFormula: { type: String, default: '' },
      isNegativeOffset: { type: Boolean, default: false },
      tier: { type: String, default: '' },
      factorKey: { type: String, default: null },
      factorName: { type: String, default: null },
      recommendation: { type: String, default: '' },
    },
  },
  {
    timestamps: true,
  }
);

export const ActivityRecord = mongoose.model('ActivityRecord', ActivityRecordSchema);
