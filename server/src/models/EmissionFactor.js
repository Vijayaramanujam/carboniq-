import mongoose from 'mongoose';

const EmissionFactorSchema = new mongoose.Schema(
  {
    // Identification
    activityKey: {
      type: String,
      required: [true, 'activityKey is required'],
      trim: true,
      lowercase: true,
      index: true,
    },
    activityName: {
      type: String,
      required: [true, 'activityName is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'category is required'],
      enum: ['ELECTRICITY', 'FUEL', 'TRANSPORTATION', 'WASTE', 'PURCHASED_GOODS', 'OTHER'],
      index: true,
    },
    aliases: {
      type: [String],
      default: [],
      set: (aliases) => (Array.isArray(aliases) ? aliases.map((a) => a.trim().toLowerCase()) : []),
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },

    // Numerical Factor and Accounting Metadata
    factorValue: {
      type: Number,
      required: [true, 'factorValue is required'],
      min: [0, 'factorValue must be non-negative'],
    },
    factorUnit: {
      type: String,
      required: [true, 'factorUnit is required'],
      trim: true,
    },
    activityUnit: {
      type: String,
      required: [true, 'activityUnit is required'],
      trim: true,
    },
    scope: {
      type: String,
      required: [true, 'scope is required'],
      enum: ['SCOPE_1', 'SCOPE_2', 'SCOPE_3'],
      index: true,
    },
    scopeCategory: {
      type: String,
      trim: true,
      default: '',
    },
    gasBasis: {
      type: String,
      required: [true, 'gasBasis is required'],
      enum: ['CO2', 'CO2e'],
    },
    methodology: {
      type: String,
      required: [true, 'methodology is required'],
      trim: true,
    },

    // Applicability & Temporal Boundaries
    countryCode: {
      type: String,
      required: [true, 'countryCode is required'],
      trim: true,
      uppercase: true,
      index: true,
    },
    region: {
      type: String,
      trim: true,
      default: 'National',
    },
    validFrom: {
      type: Date,
      default: null,
    },
    validTo: {
      type: Date,
      default: null,
    },
    reportingYear: {
      type: Number,
      required: [true, 'reportingYear is required'],
      min: [1990, 'reportingYear must be valid'],
      max: [2100, 'reportingYear cannot exceed 2100'],
      index: true,
    },
    sourcePublicationYear: {
      type: Number,
      required: [true, 'sourcePublicationYear is required'],
      min: [1990, 'sourcePublicationYear must be valid'],
      max: [2100, 'sourcePublicationYear cannot exceed 2100'],
    },

    // Provenance & Source Traceability
    sourceOrganization: {
      type: String,
      required: [true, 'sourceOrganization is required'],
      trim: true,
      index: true,
    },
    sourceDataset: {
      type: String,
      required: [true, 'sourceDataset is required'],
      trim: true,
    },
    sourceUrl: {
      type: String,
      required: [true, 'sourceUrl is required'],
      trim: true,
    },
    sourceReference: {
      type: String,
      trim: true,
      default: '',
    },
    methodologyUrl: {
      type: String,
      trim: true,
      default: '',
    },
    limitations: {
      type: String,
      trim: true,
      default: '',
    },
    verifiedAt: {
      type: Date,
      default: Date.now,
    },

    // Record Lifecycle
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'emissionfactors',
  }
);

// Compound Unique Index: Allows multiple historical reporting years, countries, or methodologies
// for the same activity key without creating duplicates on repeated seeding.
EmissionFactorSchema.index(
  {
    activityKey: 1,
    countryCode: 1,
    reportingYear: 1,
    sourceOrganization: 1,
    methodology: 1,
  },
  { unique: true }
);

// Compound indexes for scalable multi-field filtering and sorting
EmissionFactorSchema.index({ category: 1, countryCode: 1, reportingYear: -1, activityName: 1 });
EmissionFactorSchema.index({ scope: 1, reportingYear: -1 });
EmissionFactorSchema.index({ isActive: 1, category: 1, scope: 1 });
EmissionFactorSchema.index({ activityName: 1 });

export const EmissionFactor = mongoose.model('EmissionFactor', EmissionFactorSchema);
