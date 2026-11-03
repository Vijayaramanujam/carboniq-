import mongoose from 'mongoose';

const EEIOSectorSchema = new mongoose.Schema(
  {
    sectorIndex: {
      type: Number,
      required: true,
      index: true,
    },
    region: {
      type: String,
      required: true,
      default: 'IN',
      uppercase: true,
      index: true,
    },
    sectorCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    sectorName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'AGRICULTURE',
        'MINING',
        'MANUFACTURING',
        'ENERGY',
        'CONSTRUCTION',
        'TRANSPORTATION',
        'SERVICES',
        'WASTE',
        'OTHER',
      ],
      index: true,
    },
    hsnPrefixes: {
      type: [String],
      default: [],
      index: true,
    },
    aliases: {
      type: [String],
      default: [],
      set: (aliases) => (Array.isArray(aliases) ? aliases.map((a) => a.trim().toLowerCase()) : []),
    },
    description: {
      type: String,
      default: '',
    },
    grossOutputMeur: {
      type: Number,
      required: true,
    },
    directIntensityEur: {
      type: Number,
      required: true, // kg CO2e / EUR
    },
    directIntensityInr: {
      type: Number,
      required: true, // kg CO2e / INR
    },
    upstreamMultiplierInr: {
      type: Number,
      required: true, // kg CO2e / INR
    },
    totalMultiplierInr: {
      type: Number,
      required: true, // kg CO2e / INR (M = B * (I - A)^-1)
      index: true,
    },
    totalMultiplierEur: {
      type: Number,
      required: true, // kg CO2e / EUR
    },
    exchangeRateInrPerEur: {
      type: Number,
      default: 89.5,
    },
    baseYear: {
      type: Number,
      default: 2024,
    },
    uncertaintyPercent: {
      type: Number,
      default: 35.0,
    },
    source: {
      type: String,
      default: 'EXIOBASE 3.11.2 - pxp 2024 (MR-EEIO)',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'eeiosectors',
  }
);

// Compound index for fast text search and category lookups
EEIOSectorSchema.index({ region: 1, category: 1, totalMultiplierInr: -1 });
EEIOSectorSchema.index({ sectorName: 'text', aliases: 'text', description: 'text' });

export const EEIOSector = mongoose.model('EEIOSector', EEIOSectorSchema);
