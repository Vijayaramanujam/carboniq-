import mongoose from 'mongoose';

const UploadBatchSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    batchType: {
      type: String,
      enum: ['MULTI_FILE', 'ZIP_ARCHIVE', 'SINGLE_FILE'],
      required: true,
      default: 'MULTI_FILE',
    },
    totalFiles: {
      type: Number,
      default: 0,
    },
    processedFiles: {
      type: Number,
      default: 0,
    },
    failedFiles: {
      type: Number,
      default: 0,
    },
    duplicateFiles: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['PROCESSING', 'COMPLETED', 'PARTIALLY_FAILED', 'FAILED'],
      default: 'PROCESSING',
    },
    archiveFileName: {
      type: String,
      default: null,
    },
    errorMessages: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const UploadBatch = mongoose.model('UploadBatch', UploadBatchSchema);
