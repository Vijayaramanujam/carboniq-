import { Company } from '../models/Company.js';
import { PendingRegistration } from '../models/PendingRegistration.js';
import { generateToken } from '../utils/token.js';

function generate6DigitOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function sanitizeCompany(company) {
  return {
    _id: company._id,
    companyName: company.companyName,
    businessEmail: company.businessEmail,
    phoneNumber: company.phoneNumber,
    industryType: company.industryType,
    businessSize: company.businessSize,
    gstin: company.gstin,
    country: company.country,
    currency: company.currency,
    isPhoneVerified: company.isPhoneVerified,
    hasCompletedOnboarding: company.hasCompletedOnboarding,
    createdAt: company.createdAt,
  };
}

/**
 * Register a new Indian SME
 * NOTE: Account is ONLY saved in the Company collection if OTP verification succeeds.
 */
export async function register(req, res) {
  try {
    const {
      companyName,
      businessEmail,
      phoneNumber,
      password,
      industryType,
      businessSize,
      gstin,
    } = req.body;

    if (!companyName || !businessEmail || !phoneNumber || !password || !industryType || !businessSize) {
      return res.status(400).json({
        success: false,
        error: 'Please provide all mandatory SME registration details: Company Name, Business Email, Phone Number, Password, Industry Type, and Business Size.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long.',
      });
    }

    const cleanEmail = businessEmail.toLowerCase().trim();

    // Check if an already-verified enterprise account exists
    const existingCompany = await Company.findOne({ businessEmail: cleanEmail, isPhoneVerified: true });
    if (existingCompany) {
      return res.status(400).json({
        success: false,
        error: 'A verified enterprise account with this corporate email is already registered. Please sign in.',
      });
    }

    // Clean up any legacy unverified remnants
    await Company.deleteMany({ businessEmail: cleanEmail, isPhoneVerified: false });

    // Generate 6-digit OTP with 10-minute validity
    const otp = generate6DigitOtp();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Save solely to PendingRegistration (NOT yet saved to Company collection)
    await PendingRegistration.findOneAndUpdate(
      { businessEmail: cleanEmail },
      {
        companyName: companyName.trim(),
        businessEmail: cleanEmail,
        phoneNumber: phoneNumber.trim(),
        password,
        industryType,
        businessSize,
        gstin: gstin ? gstin.trim().toUpperCase() : '',
        otpCode: otp,
        otpExpiresAt,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Log OTP to server console
    console.log('\n=============================================================');
    console.log('[INDIAN SME OTP VERIFICATION SERVICE]');
    console.log(`Target SME   : ${companyName.trim()}`);
    console.log(`Phone Number : ${phoneNumber.trim()}`);
    console.log(`Email        : ${cleanEmail}`);
    console.log(`>> VERIFICATION OTP CODE: [ ${otp} ] (Valid for 10 minutes)`);
    console.log('=============================================================\n');

    res.status(201).json({
      success: true,
      message: `Registration initiated. An OTP has been dispatched to ${phoneNumber.trim()}. Account will be registered once OTP is confirmed.`,
      businessEmail: cleanEmail,
      phoneNumber: phoneNumber.trim(),
      otpCode: otp,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Verify OTP to complete SME registration
 * Only creates and persists the Company document upon correct OTP input!
 */
export async function verifyOtp(req, res) {
  try {
    const { businessEmail, otp } = req.body;

    if (!businessEmail || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Please provide both business email and the 6-digit OTP code.',
      });
    }

    const cleanEmail = businessEmail.toLowerCase().trim();
    const cleanOtp = otp.trim();

    // Check PendingRegistration first (new registrations)
    const pending = await PendingRegistration.findOne({ businessEmail: cleanEmail });
    if (pending) {
      if (pending.otpCode !== cleanOtp) {
        return res.status(400).json({
          success: false,
          error: 'Invalid OTP code. Please re-check the OTP.',
        });
      }

      if (pending.otpExpiresAt && pending.otpExpiresAt < new Date()) {
        return res.status(400).json({
          success: false,
          error: 'The OTP code has expired. Please request a new OTP code.',
        });
      }

      // OTP is valid! Now and ONLY now persist the Company record into MongoDB
      const company = new Company({
        companyName: pending.companyName,
        businessEmail: pending.businessEmail,
        phoneNumber: pending.phoneNumber,
        password: pending.password,
        industryType: pending.industryType,
        businessSize: pending.businessSize,
        gstin: pending.gstin,
        isPhoneVerified: true,
        hasCompletedOnboarding: false,
        currency: 'INR',
      });

      await company.save();
      await PendingRegistration.deleteOne({ _id: pending._id });

      const token = generateToken(company._id);

      return res.json({
        success: true,
        message: 'Phone number verified successfully. Account officially registered in CarbonIQ!',
        token,
        company: sanitizeCompany(company),
      });
    }

    // Check existing Company (for existing accounts in 2FA mode)
    const company = await Company.findOne({ businessEmail: cleanEmail });
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'No registration request found for this email. Please register first.',
      });
    }

    if (!company.otpCode || company.otpCode !== cleanOtp) {
      return res.status(400).json({ success: false, error: 'Invalid OTP code. Please re-check the OTP.' });
    }

    if (company.otpExpiresAt && company.otpExpiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'The OTP code has expired. Please request a new OTP code.',
      });
    }

    company.isPhoneVerified = true;
    company.otpCode = null;
    company.otpExpiresAt = null;
    await company.save();

    const token = generateToken(company._id);

    return res.json({
      success: true,
      message: 'Phone number verified successfully. Welcome to CarbonIQ!',
      token,
      company: sanitizeCompany(company),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Resend OTP to company contact number
 */
export async function resendOtp(req, res) {
  try {
    const { businessEmail } = req.body;
    if (!businessEmail) {
      return res.status(400).json({ success: false, error: 'Business email is required.' });
    }

    const cleanEmail = businessEmail.toLowerCase().trim();
    const otp = generate6DigitOtp();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // If in PendingRegistration
    const pending = await PendingRegistration.findOne({ businessEmail: cleanEmail });
    if (pending) {
      pending.otpCode = otp;
      pending.otpExpiresAt = otpExpiresAt;
      await pending.save();

      console.log('\n=============================================================');
      console.log('[INDIAN SME RESEND OTP SERVICE]');
      console.log(`Target SME   : ${pending.companyName}`);
      console.log(`Phone Number : ${pending.phoneNumber}`);
      console.log(`>> RESENT OTP CODE: [ ${otp} ] (Valid for 10 minutes)`);
      console.log('=============================================================\n');

      return res.json({
        success: true,
        message: `A new OTP has been dispatched to ${pending.phoneNumber}.`,
        businessEmail: cleanEmail,
        phoneNumber: pending.phoneNumber,
        otpCode: otp,
      });
    }

    const company = await Company.findOne({ businessEmail: cleanEmail });
    if (!company) {
      return res.status(404).json({ success: false, error: 'Company account not found.' });
    }

    company.otpCode = otp;
    company.otpExpiresAt = otpExpiresAt;
    await company.save();

    console.log('\n=============================================================');
    console.log('[INDIAN SME RESEND OTP SERVICE]');
    console.log(`Target SME   : ${company.companyName}`);
    console.log(`Phone Number : ${company.phoneNumber}`);
    console.log(`>> RESENT OTP CODE: [ ${otp} ] (Valid for 10 minutes)`);
    console.log('=============================================================\n');

    return res.json({
      success: true,
      message: `A new OTP has been dispatched to ${company.phoneNumber}.`,
      businessEmail: company.businessEmail,
      phoneNumber: company.phoneNumber,
      otpCode: otp,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Login for registered SMEs
 */
export async function login(req, res) {
  try {
    const { businessEmail, password } = req.body;

    if (!businessEmail || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide both business email and password.',
      });
    }

    const company = await Company.findOne({ businessEmail: businessEmail.toLowerCase().trim() });
    if (!company) {
      return res.status(401).json({ success: false, error: 'Invalid business email or password.' });
    }

    const isMatch = await company.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid business email or password.' });
    }

    if (!company.isPhoneVerified) {
      // Generate OTP and log to console
      const otp = generate6DigitOtp();
      company.otpCode = otp;
      company.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await company.save();

      console.log('\n=============================================================');
      console.log(`[INDIAN SME LOGIN OTP DISPATCH]`);
      console.log(`Target SME   : ${company.companyName}`);
      console.log(`Phone Number : ${company.phoneNumber}`);
      console.log(`>> VERIFICATION OTP CODE: [ ${otp} ]`);
      console.log('=============================================================\n');

      return res.status(403).json({
        success: false,
        requiresOtp: true,
        businessEmail: company.businessEmail,
        phoneNumber: company.phoneNumber,
        otpCode: otp,
        error: 'Phone number verification is pending. An OTP has been logged to the server console.',
      });
    }

    const token = generateToken(company._id);

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      company: sanitizeCompany(company),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get profile of currently logged-in SME
 */
export async function getMe(req, res) {
  try {
    res.json({
      success: true,
      company: sanitizeCompany(req.company),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Mark onboarding document step as completed
 */
export async function completeOnboarding(req, res) {
  try {
    const company = await Company.findById(req.company._id);
    if (!company) {
      return res.status(404).json({ success: false, error: 'Company not found.' });
    }

    company.hasCompletedOnboarding = true;
    await company.save();

    res.json({
      success: true,
      message: 'Onboarding completed. Welcome to your main SME carbon workspace.',
      company: sanitizeCompany(company),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Update company profile & accounting boundaries
 */
export async function updateProfile(req, res) {
  try {
    const { companyName, businessEmail, phoneNumber, industryType, businessSize, gstin, currency } = req.body;
    const company = await Company.findById(req.company._id);
    if (!company) {
      return res.status(404).json({ success: false, error: 'Company account not found.' });
    }

    if (companyName && companyName.trim()) {
      company.companyName = companyName.trim();
    }
    if (businessEmail && businessEmail.trim()) {
      const lowerEmail = businessEmail.toLowerCase().trim();
      if (lowerEmail !== company.businessEmail) {
        const emailExists = await Company.findOne({ businessEmail: lowerEmail, _id: { $ne: company._id } });
        if (emailExists) {
          return res.status(400).json({ success: false, error: 'This business email is already assigned to another enterprise account.' });
        }
        company.businessEmail = lowerEmail;
      }
    }
    if (phoneNumber && phoneNumber.trim()) {
      company.phoneNumber = phoneNumber.trim();
    }
    if (industryType) {
      company.industryType = industryType;
    }
    if (businessSize) {
      company.businessSize = businessSize;
    }
    if (gstin !== undefined) {
      company.gstin = gstin ? gstin.trim().toUpperCase() : '';
    }
    if (currency) {
      company.currency = currency;
    }

    await company.save();

    res.json({
      success: true,
      message: 'Enterprise profile and statutory parameters updated successfully.',
      company: sanitizeCompany(company),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
