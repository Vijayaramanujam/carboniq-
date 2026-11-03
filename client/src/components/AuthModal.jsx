import React, { useState, useEffect } from 'react';
import {
  Building2,
  Mail,
  Phone,
  Lock,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Eye,
  EyeOff,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Zap,
} from 'lucide-react';
import {
  registerCompany,
  verifyCompanyOtp,
  resendCompanyOtp,
  loginCompany,
} from '../services/api.js';

export function AuthModal({ onAuthenticated, initialView = 'REGISTER', onClose }) {
  const [view, setView] = useState(initialView || 'REGISTER'); // 'LOGIN' | 'REGISTER' | 'OTP'
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [activePhraseIdx, setActivePhraseIdx] = useState(0);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authorizingCompany, setAuthorizingCompany] = useState(null);

  const triggerAuthTransition = (company, token) => {
    setAuthorizingCompany(company);
    setIsAuthorizing(true);
    setTimeout(() => {
      if (onAuthenticated) {
        onAuthenticated(company, token);
      }
    }, 850);
  };

  // Lock background body scroll when modal is mounted to prevent double scrollbars
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    if (initialView) {
      setView(initialView);
    }
  }, [initialView]);

  // Catchy phrases for the sidebar showcase (Punchy, welcoming, zero technical clutter)
  const phrasesByView = {
    LOGIN: [
      {
        headline: 'Welcome back to CarbonIQ.',
        quote: 'Turn complex operational data into audit-ready carbon intelligence in seconds.',
        highlight: 'Continuous Emission Ledger',
        tag: 'Fast & Verified',
      },
      {
        headline: 'Measure. Disclose. Decarbonize.',
        quote: 'Seamless statutory greenhouse gas accounting engineered for modern Indian enterprises.',
        highlight: 'Statutory Assurance',
        tag: 'Instant Access',
      },
      {
        headline: 'One ledger. Total clarity.',
        quote: 'Streamline Scope 1, 2, and 3 accounting with zero spreadsheet friction.',
        highlight: 'Enterprise ESG Standard',
        tag: 'Audit Proven',
      },
    ],
    REGISTER: [
      {
        headline: 'Start your climate journey.',
        quote: 'Join forward-thinking sustainability leaders automating corporate carbon disclosures.',
        highlight: 'Get Started in Minutes',
        tag: 'Zero Setup Friction',
      },
      {
        headline: 'Precision corporate accounting.',
        quote: 'Statutory compliance calibrated specifically for Indian enterprises and growing businesses.',
        highlight: 'Sovereign Factor Engine',
        tag: 'Enterprise Ready',
      },
      {
        headline: 'Decarbonize with confidence.',
        quote: 'Eliminate manual spreadsheet keying with automated invoice and manifest parsing.',
        highlight: '100% Deterministic',
        tag: 'Statutory Aligned',
      },
    ],
    OTP: [
      {
        headline: 'Securing your workspace.',
        quote: 'Protecting your corporate emissions data with enterprise-grade cryptographic verification.',
        highlight: 'Sovereign Verification',
        tag: 'Safe & Encrypted',
      },
    ],
  };

  const activePhrases = phrasesByView[view] || phrasesByView.LOGIN;
  const currentPhrase = activePhrases[activePhraseIdx % activePhrases.length];

  const handleNextPhrase = () => {
    setActivePhraseIdx((prev) => (prev + 1) % activePhrases.length);
  };

  const handlePrevPhrase = () => {
    setActivePhraseIdx((prev) => (prev === 0 ? activePhrases.length - 1 : prev - 1));
  };

  // Automatically cycle through catchy phrases every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActivePhraseIdx((prev) => (prev + 1) % activePhrases.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [activePhrases.length]);

  // Handle smooth closing animation
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      if (onClose) onClose();
    }, 220);
  };

  // Registration Fields
  const [companyName, setCompanyName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [industryType, setIndustryType] = useState('Manufacturing');
  const [businessSize, setBusinessSize] = useState('Small');
  const [gstin, setGstin] = useState('');

  // OTP Verification
  const [otp, setOtp] = useState('');
  const [demoOtp, setDemoOtp] = useState('');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpPhone, setOtpPhone] = useState('');

  // Login Fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [infoMessage, setInfoMessage] = useState(null);

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      const payload = {
        companyName,
        businessEmail,
        phoneNumber,
        password,
        industryType,
        businessSize,
        gstin: gstin.trim() ? gstin.trim().toUpperCase() : undefined,
      };

      const res = await registerCompany(payload);
      if (!res.success) {
        throw new Error(res.error || 'Registration failed');
      }

      setOtpEmail(res.businessEmail || businessEmail);
      setOtpPhone(res.phoneNumber || phoneNumber);
      if (res.otpCode) {
        setDemoOtp(res.otpCode);
        console.log('%c======================================================', 'color: #b5f568;');
        console.log('%c[CarbonIQ SME Portal] Registration OTP Dispatched', 'color: #b5f568; font-weight: bold; font-size: 14px;');
        console.log(`%c>> Verification OTP Code: [ ${res.otpCode} ] (Valid for 10 min)`, 'color: #62dd9e; font-weight: bold; font-size: 16px; background: #0b1b14; padding: 4px 8px; border-radius: 4px;');
        console.log('%c======================================================', 'color: #b5f568;');
      }
      setView('OTP');
      setActivePhraseIdx(0);
      setInfoMessage('Verification code dispatched to your registered contact channel.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      const res = await verifyCompanyOtp({
        businessEmail: otpEmail,
        otp,
      });

      if (!res.success) {
        throw new Error(res.error || 'Invalid verification code');
      }

      triggerAuthTransition(res.company, res.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError(null);
    setInfoMessage(null);
    setLoading(true);
    try {
      const res = await resendCompanyOtp({ businessEmail: otpEmail });
      if (!res.success) {
        throw new Error(res.error || 'Failed to resend code');
      }
      if (res.otpCode) {
        setDemoOtp(res.otpCode);
        console.log('%c======================================================', 'color: #b5f568;');
        console.log('%c[CarbonIQ SME Portal] Resent OTP Code', 'color: #b5f568; font-weight: bold; font-size: 14px;');
        console.log(`%c>> Verification OTP Code: [ ${res.otpCode} ]`, 'color: #62dd9e; font-weight: bold; font-size: 16px; background: #0b1b14; padding: 4px 8px; border-radius: 4px;');
        console.log('%c======================================================', 'color: #b5f568;');
      }
      setInfoMessage('A fresh verification code has been dispatched.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      const res = await loginCompany({
        email: loginEmail,
        password: loginPassword,
      });

      if (!res.success) {
        if (res.requiresVerification || res.requiresOtp) {
          setOtpEmail(res.businessEmail || loginEmail);
          if (res.otpCode) {
            setDemoOtp(res.otpCode);
            console.log('%c======================================================', 'color: #b5f568;');
            console.log('%c[CarbonIQ SME Portal] Login Verification OTP', 'color: #b5f568; font-weight: bold; font-size: 14px;');
            console.log(`%c>> Verification OTP Code: [ ${res.otpCode} ]`, 'color: #62dd9e; font-weight: bold; font-size: 16px; background: #0b1b14; padding: 4px 8px; border-radius: 4px;');
            console.log('%c======================================================', 'color: #b5f568;');
          }
          setView('OTP');
          setActivePhraseIdx(0);
          setInfoMessage('Verification pending. A code has been dispatched to your contact channel.');
          return;
        }
        throw new Error(res.error || 'Sign in failed');
      }

      triggerAuthTransition(res.company, res.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 h-screen w-screen bg-[#06110d] overflow-y-auto lg:overflow-hidden selection:bg-[#b5f568] selection:text-[#102000] flex flex-col justify-between transition-all duration-300 ${
        isClosing ? 'animate-modal-leave' : 'animate-modal-enter'
      }`}
    >
      {/* Background Ambient Mesh & Coordinate Grids */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-15%] left-[-10%] w-[55rem] h-[55rem] bg-gradient-to-br from-[#16a36a]/20 via-[#b5f568]/10 to-transparent rounded-full blur-[160px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60rem] h-[60rem] bg-gradient-to-tl from-[#62dd9e]/15 via-[#121e1a]/40 to-transparent rounded-full blur-[180px]" />
        <div className="absolute top-1/3 right-1/4 w-[35rem] h-[35rem] bg-[#b5f568]/5 rounded-full blur-[130px]" />

        <svg className="w-full h-full opacity-[0.035]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern height="48" id="auth-grid-pattern" patternUnits="userSpaceOnUse" width="48">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#B4FFCD" strokeWidth="0.8" />
              <circle cx="0" cy="0" fill="#B4FFCD" r="1" />
            </pattern>
          </defs>
          <rect fill="url(#auth-grid-pattern)" height="100%" width="100%" />
        </svg>
      </div>

      {/* Top Floating Utility Bar */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-2 flex items-center justify-between">
        {/* Brand Logo with Public Logo Asset */}
        <div className="flex items-center space-x-3 group">
          <img
            src="/drkthm-logo.png"
            alt="CarbonIQ"
            className="h-8 sm:h-9 w-auto max-w-[170px] sm:max-w-[200px] object-contain transition-transform duration-300 group-hover:scale-105 drop-shadow-[0_0_12px_rgba(98,221,158,0.2)]"
          />
          <span className="hidden sm:inline-block text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-[#121e1a] text-[#b5f568] border border-[#b5f568]/30 font-semibold tracking-wider">
            Sovereign Portal
          </span>
        </div>

        {/* Back / Close Action */}
        {onClose && (
          <button
            type="button"
            onClick={handleClose}
            className="flex items-center space-x-2 px-4 py-2 rounded-full bg-[#121e1a]/90 hover:bg-[#16221d] border border-white/[0.1] text-xs font-mono text-[#d8e6de] hover:text-white transition-all duration-200 active:scale-95 group shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#b5f568] group-hover:-translate-x-1 transition-transform" />
            <span>Return to Portal</span>
          </button>
        )}
      </header>

      {/* Main Full-Width Split Experience */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
          {/* ========================================================= */}
          {/* LEFT COLUMN: THE FORM CANVAS */}
          {/* ========================================================= */}
          <div className="lg:col-span-7 flex flex-col justify-center max-w-xl mx-auto lg:mx-0 w-full">
            {/* Perfectly Symmetrical Segmented Sliding Pill Switcher */}
            {view !== 'OTP' && (
              <div className="grid grid-cols-2 p-1 mb-6 rounded-full bg-[#07130f] border border-white/[0.1] w-full max-w-[340px] shadow-inner">
                <button
                  type="button"
                  onClick={() => {
                    setView('LOGIN');
                    setError(null);
                    setInfoMessage(null);
                    setActivePhraseIdx(0);
                  }}
                  className={`w-full py-2.5 rounded-full text-xs font-bold font-mono tracking-wider transition-all duration-300 cursor-pointer text-center ${
                    view === 'LOGIN'
                      ? 'bg-[#b5f568] text-[#07130f] shadow-[0_0_20px_rgba(181,245,104,0.4)]'
                      : 'text-[#9aada2] hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setView('REGISTER');
                    setError(null);
                    setInfoMessage(null);
                    setActivePhraseIdx(0);
                  }}
                  className={`w-full py-2.5 rounded-full text-xs font-bold font-mono tracking-wider transition-all duration-300 cursor-pointer text-center ${
                    view === 'REGISTER'
                      ? 'bg-[#b5f568] text-[#07130f] shadow-[0_0_20px_rgba(181,245,104,0.4)]'
                      : 'text-[#9aada2] hover:text-white'
                  }`}
                >
                  Create Account
                </button>
              </div>
            )}

            {/* Header copy */}
            <div className="mb-5">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                {view === 'LOGIN' && 'Welcome back'}
                {view === 'REGISTER' && 'Create your account'}
                {view === 'OTP' && 'Security verification'}
              </h1>
              <p className="text-sm text-[#9aada2] mt-1.5 font-normal">
                {view === 'LOGIN' && 'Enter your enterprise credentials to access your carbon workspace'}
                {view === 'REGISTER' && 'Start measuring corporate emissions with verified national benchmarks'}
                {view === 'OTP' && `Enter the 6-digit verification code sent to ${otpEmail}`}
              </p>
            </div>

            {/* Alert Messages */}
            {error && (
              <div className="mb-4 p-3.5 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start space-x-3 backdrop-blur-xl animate-fade-in">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <div className="flex-1 leading-relaxed">{error}</div>
              </div>
            )}

            {infoMessage && (
              <div className="mb-4 p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-start space-x-3 backdrop-blur-xl animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-[#62dd9e] mt-0.5 shrink-0" />
                <div className="flex-1 leading-relaxed">{infoMessage}</div>
              </div>
            )}

            {/* 1. LOGIN FORM */}
            {view === 'LOGIN' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Email Pill Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[#d8e6de] pl-2 font-mono">
                    Email address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="corporate@enterprise.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full px-5 py-3.5 rounded-full bg-[#040a08]/90 border border-white/[0.12] text-white text-sm placeholder-[#9aada2]/40 focus:outline-none focus:border-[#b5f568] focus:shadow-[0_0_20px_rgba(181,245,104,0.25)] transition-all shadow-inner"
                    />
                  </div>
                </div>

                {/* Password Pill Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[#d8e6de] pl-2 font-mono">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full px-5 py-3.5 rounded-full bg-[#040a08]/90 border border-white/[0.12] text-white text-sm placeholder-[#9aada2]/40 focus:outline-none focus:border-[#b5f568] focus:shadow-[0_0_20px_rgba(181,245,104,0.25)] transition-all shadow-inner pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9aada2] hover:text-white transition cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-[#b5f568]" />}
                    </button>
                  </div>
                </div>

                {/* Keep Me Logged In & Forgot Password */}
                <div className="flex items-center justify-between text-xs pt-1 px-2">
                  <label className="flex items-center space-x-2 text-[#9aada2] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded bg-[#040a08] border-white/20 text-[#b5f568] focus:ring-0 focus:ring-offset-0 cursor-pointer w-3.5 h-3.5"
                    />
                    <span>Keep me logged in</span>
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setError(
                        'Credential reset link is dispatched to verified administrators on record.'
                      )
                    }
                    className="text-[#b5f568] hover:underline font-medium transition cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>

                {/* High Contrast Gradient Pill CTA */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 rounded-full bg-gradient-to-r from-[#b5f568] via-[#85e656] to-[#62dd9e] text-[#07130f] font-extrabold text-sm tracking-wide shadow-[0_0_24px_rgba(181,245,104,0.35)] hover:shadow-[0_0_36px_rgba(181,245,104,0.55)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Authorizing Credentials...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>

                {/* Social SSO Authentication Pills */}
                <div className="pt-5">
                  <div className="relative flex items-center justify-center mb-3.5">
                    <div className="border-t border-white/[0.08] w-full" />
                    <span className="bg-[#06110d] px-3 text-[11px] font-mono uppercase text-[#9aada2] absolute">
                      Or Enterprise SSO
                    </span>
                  </div>

                  <div className="flex items-center justify-center space-x-4 pt-1">
                    <button
                      type="button"
                      onClick={() => setError('Google Workspace SSO can be activated after initial onboarding.')}
                      className="w-11 h-11 rounded-full bg-[#121e1a] hover:bg-[#16221d] border border-white/[0.1] hover:border-[#b5f568]/40 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                      title="Sign in with Google Workspace"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                    </button>

                    <button
                      type="button"
                      onClick={() => setError('GitHub Enterprise SSO can be configured in organization settings.')}
                      className="w-11 h-11 rounded-full bg-[#121e1a] hover:bg-[#16221d] border border-white/[0.1] hover:border-[#b5f568]/40 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-md text-white cursor-pointer"
                      title="Sign in with GitHub"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      onClick={() => setError('SAML / Okta authentication is enabled on enterprise tiers.')}
                      className="w-11 h-11 rounded-full bg-[#121e1a] hover:bg-[#16221d] border border-white/[0.1] hover:border-[#b5f568]/40 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-md text-[#62dd9e] cursor-pointer"
                      title="Sign in with SAML / Okta"
                    >
                      <ShieldCheck className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* 2. REGISTRATION FORM */}
            {view === 'REGISTER' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-[#d8e6de] pl-2 font-mono">
                      Legal Entity Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apex Industrial Ltd"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-full bg-[#040a08]/90 border border-white/[0.12] text-white text-xs placeholder-[#9aada2]/40 focus:outline-none focus:border-[#b5f568] focus:shadow-[0_0_20px_rgba(181,245,104,0.25)] transition-all shadow-inner"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-[#d8e6de] pl-2 font-mono">
                      Corporate Email *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="esg@company.com"
                      value={businessEmail}
                      onChange={(e) => setBusinessEmail(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-full bg-[#040a08]/90 border border-white/[0.12] text-white text-xs placeholder-[#9aada2]/40 focus:outline-none focus:border-[#b5f568] focus:shadow-[0_0_20px_rgba(181,245,104,0.25)] transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-[#d8e6de] pl-2 font-mono">
                      Contact Phone *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-full bg-[#040a08]/90 border border-white/[0.12] text-white text-xs placeholder-[#9aada2]/40 focus:outline-none focus:border-[#b5f568] focus:shadow-[0_0_20px_rgba(181,245,104,0.25)] transition-all shadow-inner"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-[#d8e6de] pl-2 font-mono">
                      Master Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-full bg-[#040a08]/90 border border-white/[0.12] text-white text-xs placeholder-[#9aada2]/40 focus:outline-none focus:border-[#b5f568] focus:shadow-[0_0_20px_rgba(181,245,104,0.25)] transition-all shadow-inner pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9aada2] hover:text-white transition cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-[#b5f568]" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-[#d8e6de] pl-2 font-mono">
                      Industry Sector
                    </label>
                    <select
                      value={industryType}
                      onChange={(e) => setIndustryType(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-full bg-[#040a08]/90 border border-white/[0.12] text-white text-xs focus:outline-none focus:border-[#b5f568] transition-all cursor-pointer"
                    >
                      <option value="Manufacturing" className="bg-[#0b1b14]">Manufacturing</option>
                      <option value="Logistics" className="bg-[#0b1b14]">Logistics</option>
                      <option value="Textiles" className="bg-[#0b1b14]">Textiles</option>
                      <option value="Chemicals" className="bg-[#0b1b14]">Chemicals</option>
                      <option value="Automotive" className="bg-[#0b1b14]">Automotive</option>
                      <option value="Services" className="bg-[#0b1b14]">IT / Services</option>
                      <option value="Other" className="bg-[#0b1b14]">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-[#d8e6de] pl-2 font-mono">
                      Scale (MSME)
                    </label>
                    <select
                      value={businessSize}
                      onChange={(e) => setBusinessSize(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-full bg-[#040a08]/90 border border-white/[0.12] text-white text-xs focus:outline-none focus:border-[#b5f568] transition-all cursor-pointer"
                    >
                      <option value="Micro" className="bg-[#0b1b14]">Micro (&lt; ₹5 Cr)</option>
                      <option value="Small" className="bg-[#0b1b14]">Small (₹5-50 Cr)</option>
                      <option value="Medium" className="bg-[#0b1b14]">Medium (₹50-250 Cr)</option>
                      <option value="Large" className="bg-[#0b1b14]">Enterprise (&gt; ₹250 Cr)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-[#d8e6de] pl-2 font-mono">
                      GSTIN (Optional)
                    </label>
                    <input
                      type="text"
                      maxLength={15}
                      placeholder="27AAAAA0000A1Z5"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value.toUpperCase())}
                      className="w-full px-4 py-2.5 rounded-full bg-[#040a08]/90 border border-white/[0.12] text-white text-xs uppercase font-mono placeholder-[#9aada2]/40 focus:outline-none focus:border-[#b5f568] transition-all"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#b5f568] via-[#85e656] to-[#62dd9e] text-[#07130f] font-extrabold text-sm tracking-wide shadow-[0_0_24px_rgba(181,245,104,0.35)] hover:shadow-[0_0_36px_rgba(181,245,104,0.55)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Provisioning Sovereign Space...</span>
                      </>
                    ) : (
                      <>
                        <span>Create Enterprise Account</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* 3. OTP VERIFICATION FORM */}
            {view === 'OTP' && (
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <div className="space-y-3 py-2">
                  <input
                    type="text"
                    maxLength={6}
                    required
                    placeholder="• • • • • •"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full text-center text-3xl font-mono tracking-[0.5em] py-3.5 rounded-2xl bg-[#06110d]/90 border border-[#b4ffcd]/30 text-[#b5f568] focus:outline-none focus:border-[#b5f568] focus:shadow-[0_0_24px_rgba(181,245,104,0.3)] transition-all shadow-inner"
                  />
                  {demoOtp && (
                    <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#122e1f]/90 border border-[#b5f568]/40 text-xs font-mono text-[#d8e6de]">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-3.5 h-3.5 text-[#b5f568]" />
                        <span>OTP Code: <strong className="text-[#b5f568] tracking-widest">{demoOtp}</strong></span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOtp(demoOtp)}
                        className="px-2.5 py-1 rounded-lg bg-[#b5f568] text-[#07130f] font-bold text-[10px] hover:shadow-[0_0_12px_rgba(181,245,104,0.5)] transition cursor-pointer"
                      >
                        Auto-fill
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-2xl bg-[#121e1a] border border-white/[0.06] text-xs text-[#9aada2] flex items-center justify-center gap-2 font-mono">
                  <ShieldCheck className="w-4 h-4 text-[#62dd9e] shrink-0" />
                  <span>Security verified for statutory reporting</span>
                </div>

                <div className="pt-2 space-y-2.5">
                  <button
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#b5f568] to-[#9ad84f] text-[#102000] font-bold text-sm tracking-wide shadow-[0_0_28px_rgba(181,245,104,0.35)] hover:scale-[1.01] active:scale-[0.98] transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying Credentials...</span>
                      </>
                    ) : (
                      <>
                        <span>Complete Verification</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      onClick={() => setView('LOGIN')}
                      className="text-[#9aada2] hover:text-white cursor-pointer"
                    >
                      ← Back to Sign In
                    </button>

                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={loading}
                      className="text-[#b5f568] hover:underline font-mono text-xs cursor-pointer"
                    >
                      Resend Code
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* ========================================================= */}
          {/* RIGHT COLUMN: CATCHY & ANIMATED SHOWCASE (No clutter, inspired by reference image) */}
          {/* ========================================================= */}
          <div className="lg:col-span-5 relative w-full h-full min-h-[500px] flex items-center justify-center">
            {/* The Main Dark Obsidian Showcase Card */}
            <div className="relative w-full h-full rounded-3xl bg-[#0b1b14]/90 backdrop-blur-3xl border border-[#b4ffcd]/25 p-8 sm:p-10 flex flex-col justify-between shadow-2xl overflow-hidden group hover:border-[#62dd9e]/40 transition-all duration-500">
              {/* Top Specular Rim */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#b5f568]/50 to-transparent" />

              {/* Decorative Concentric Multi-Pointed Starburst Animation (Inspired by Reference Image) */}
              <div className="absolute right-[-24px] bottom-14 w-80 h-80 pointer-events-none select-none opacity-25 group-hover:opacity-40 transition-opacity duration-700">
                <svg
                  viewBox="0 0 200 200"
                  className="w-full h-full animate-spin-slow group-hover:animate-spin-medium text-[#b5f568] transition-all"
                >
                  {/* 16-pointed telemetry star */}
                  {[0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5].map((angle, i) => (
                    <line
                      key={i}
                      x1="100"
                      y1="10"
                      x2="100"
                      y2="190"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      transform={`rotate(${angle} 100 100)`}
                    />
                  ))}
                  <circle cx="100" cy="100" r="42" stroke="currentColor" strokeWidth="1.5" fill="none" />
                  <circle
                    cx="100"
                    cy="100"
                    r="75"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeDasharray="4 6"
                    fill="none"
                  />
                </svg>
              </div>

              {/* Showcase Top: Catchy Headline & Animated Quotes */}
              <div className="relative z-10 space-y-5">
                {/* Active Tag Pill */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#121e1a] border border-[#b5f568]/30 text-[#b5f568] font-mono text-[11px] font-bold shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#b5f568] animate-pulse" />
                  <span>{currentPhrase.tag}</span>
                </div>

                {/* Catchy Headline */}
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                  {currentPhrase.headline}
                </h2>

                {/* Stylized Quotation Mark */}
                <div className="text-5xl font-serif text-[#b5f568] leading-none select-none opacity-90 -mt-2">
                  “
                </div>

                {/* Catchy Animated Phrase */}
                <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-normal min-h-[64px]">
                  "{currentPhrase.quote}"
                </p>

                {/* Highlight Credential */}
                <div className="pt-2">
                  <div className="font-bold text-white text-sm tracking-tight">
                    {currentPhrase.highlight}
                  </div>
                  <div className="text-[11px] text-[#7dd9a3] font-mono mt-0.5">
                    CarbonIQ Sovereign Platform &bull; Corporate GHG Accounting
                  </div>
                </div>

                {/* Carousel Controls: [ ← ] [ → ] and Direct Slide Dots */}
                <div className="flex items-center space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={handlePrevPhrase}
                    className="w-10 h-10 rounded-xl bg-[#121e1a] hover:bg-[#16221d] hover:border-[#b5f568]/40 border border-white/[0.1] text-white flex items-center justify-center transition-all duration-150 active:scale-90 cursor-pointer shadow-sm"
                    aria-label="Previous quote"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-300" />
                  </button>

                  <button
                    type="button"
                    onClick={handleNextPhrase}
                    className="w-10 h-10 rounded-xl bg-[#16a36a]/30 hover:bg-[#16a36a]/50 hover:border-[#b5f568] border border-[#62dd9e]/40 text-[#62dd9e] flex items-center justify-center transition-all duration-150 active:scale-90 cursor-pointer shadow-sm"
                    aria-label="Next quote"
                  >
                    <ChevronRight className="w-4 h-4 text-[#b5f568]" />
                  </button>

                  {/* Direct Clickable Dot Indicators */}
                  <div className="flex items-center space-x-1.5 pl-2">
                    {activePhrases.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setActivePhraseIdx(i)}
                        className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                          activePhraseIdx % activePhrases.length === i
                            ? 'w-6 bg-[#b5f568] shadow-[0_0_8px_rgba(181,245,104,0.6)]'
                            : 'w-2 bg-white/20 hover:bg-white/50'
                        }`}
                        aria-label={`Slide ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Showcase Bottom: Overlapping Floating Card (Inspired by Reference Image Bottom-Right Card) */}
              <div className="relative z-10 mt-8 p-4 sm:p-5 rounded-2xl bg-[#121e1a]/95 backdrop-blur-2xl border border-[#b4ffcd]/30 shadow-2xl flex items-center justify-between transition-all duration-300 hover:-translate-y-1 hover:border-[#b5f568]/50 hover:shadow-[0_20px_40px_rgba(0,0,0,0.8)] cursor-pointer group/card">
                <div className="flex items-center space-x-3.5">
                  <div className="p-2.5 rounded-xl bg-[#06110d] border border-[#62dd9e]/40 text-[#62dd9e] shrink-0 group-hover/card:scale-105 transition-transform">
                    <Sparkles className="w-4 h-4 text-[#b5f568]" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight group-hover/card:text-[#b5f568] transition-colors">
                      {view === 'LOGIN' ? 'Sovereign Precision' : 'Ready on Day One'}
                    </h4>
                    <p className="text-[11px] text-[#9aada2] mt-0.5">
                      {view === 'LOGIN'
                        ? 'Continuous emissions accounting calibrated for ₹ INR & India'
                        : 'Deploy your statutory carbon inventory in under five minutes'}
                    </p>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-1.5 text-[#b5f568] font-mono text-[10px] shrink-0 pl-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#b5f568] animate-pulse" />
                  <span>Verified</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Footer Note */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-[#9aada2] border-t border-white/[0.05]">
        <div>© 2026 CarbonIQ Platform &bull; Corporate GHG Accounting & Disclosures</div>
        <div className="flex items-center space-x-4 mt-1.5 sm:mt-0 text-[11px] text-[#7dd9a3]">
          <span>Central Electricity Authority (v20.0)</span>
          <span>&bull;</span>
          <span>MoEFCC Verified</span>
        </div>
      </footer>

      {/* Holographic Calibration Transition on Successful Authentication */}
      {isAuthorizing && (
        <div className="fixed inset-0 z-50 bg-[#06110d]/95 backdrop-blur-3xl flex flex-col items-center justify-center animate-page-enter">
          <div className="relative flex items-center justify-center mb-8">
            <div className="w-32 h-32 rounded-full border-2 border-dashed border-[#b5f568]/40 animate-spin-slow" />
            <div className="w-24 h-24 rounded-full border border-[#62dd9e]/60 animate-spin-reverse absolute" />
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#b5f568] to-[#62dd9e] flex items-center justify-center shadow-[0_0_36px_rgba(181,245,104,0.6)] absolute">
              <Sparkles className="w-7 h-7 text-[#07130f] animate-pulse" />
            </div>
          </div>
          <div className="text-center space-y-2.5 max-w-md px-4">
            <span className="text-[10px] font-mono uppercase px-3 py-1 rounded-full bg-[#121e1a] text-[#b5f568] border border-[#b5f568]/30 font-semibold tracking-wider">
              Sovereign Space Authorized
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Initializing Workspace
            </h3>
            <p className="text-xs text-[#9aada2] font-mono leading-relaxed">
              Calibrating statutory corporate climate ledger for {authorizingCompany?.companyName || 'your enterprise'}...
            </p>
            <div className="w-48 h-1.5 mx-auto rounded-full bg-[#121e1a] overflow-hidden mt-4">
              <div className="h-full bg-gradient-to-r from-[#b5f568] to-[#62dd9e] animate-pulse rounded-full w-full" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuthModal;
