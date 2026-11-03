import mongoose from 'mongoose';

const PendingRegistrationSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    businessEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    industryType: {
      type: String,
      required: true,
    },
    businessSize: {
      type: String,
      required: true,
    },
    gstin: {
      type: String,
      default: '',
      trim: true,
    },
    otpCode: {
      type: String,
      required: true,
    },
    otpExpiresAt: {
      type: Date,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 600, // 10 minutes TTL
    },
  },
  {
    timestamps: true,
  }
);

export const PendingRegistration = mongoose.model('PendingRegistration', PendingRegistrationSchema);
