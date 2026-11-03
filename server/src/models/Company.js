import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const CompanySchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: [true, 'Company / Business Name is required'],
      trim: true,
    },
    businessEmail: {
      type: String,
      required: [true, 'Business Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/\S+@\S+\.\S+/, 'Please provide a valid business email address'],
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone Number is required'],
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
    },
    industryType: {
      type: String,
      required: [true, 'Industry Type is required'],
      enum: [
        'Manufacturing',
        'Textiles',
        'Textiles & Garments',
        'Chemicals',
        'Chemicals & Pharmaceuticals',
        'Food Processing & FMCG',
        'Logistics',
        'Logistics & Supply Chain',
        'Services',
        'IT & Software Services',
        'Agriculture & Agribusiness',
        'Retail & Wholesale Distribution',
        'Construction & Engineering',
        'Automotive',
        'Automotive & Ancillary',
        'Metal & Fabrication',
        'Other',
      ],
      default: 'Manufacturing',
    },
    businessSize: {
      type: String,
      required: [true, 'Business Size is required'],
      enum: ['Micro', 'Small', 'Medium', 'Emerging', 'Large'],
      default: 'Small',
    },
    gstin: {
      type: String,
      trim: true,
      default: '',
    },
    country: {
      type: String,
      default: 'India',
    },
    currency: {
      type: String,
      default: 'INR',
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    otpCode: {
      type: String,
      default: null,
    },
    otpExpiresAt: {
      type: Date,
      default: null,
    },
    hasCompletedOnboarding: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
CompanySchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
CompanySchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export const Company = mongoose.models.Company || mongoose.model('Company', CompanySchema);
