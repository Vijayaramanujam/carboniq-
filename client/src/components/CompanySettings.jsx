import React, { useState, useEffect } from 'react';
import {
  Building2,
  Mail,
  Phone,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Save,
  ShieldCheck,
  CreditCard,
  Layers,
  Sparkles,
  Edit3,
  X,
  Briefcase,
  FileText,
  BadgeCheck,
} from 'lucide-react';
import { updateCompanyProfile } from '../services/api.js';

export function CompanySettings({ company, onUpdateCompany }) {
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    companyName: company?.companyName || '',
    businessEmail: company?.businessEmail || '',
    phoneNumber: company?.phoneNumber || '',
    businessSize: company?.businessSize || 'Small',
    industryType: company?.industryType || 'Manufacturing',
    gstin: company?.gstin || '',
    currency: company?.currency || 'INR',
    factorBaseline: 'CEA v20.0 & MoEFCC Aligned',
  });

  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Sync when external company prop updates
  useEffect(() => {
    if (company) {
      setFormData({
        companyName: company.companyName || '',
        businessEmail: company.businessEmail || '',
        phoneNumber: company.phoneNumber || '',
        businessSize: company.businessSize || 'Small',
        industryType: company.industryType || 'Manufacturing',
        gstin: company.gstin || '',
        currency: company.currency || 'INR',
        factorBaseline: 'CEA v20.0 & MoEFCC Aligned',
      });
    }
  }, [company]);

  const handleCancel = () => {
    setFormData({
      companyName: company?.companyName || '',
      businessEmail: company?.businessEmail || '',
      phoneNumber: company?.phoneNumber || '',
      businessSize: company?.businessSize || 'Small',
      industryType: company?.industryType || 'Manufacturing',
      gstin: company?.gstin || '',
      currency: company?.currency || 'INR',
      factorBaseline: 'CEA v20.0 & MoEFCC Aligned',
    });
    setIsEditing(false);
    setNotification(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.companyName.trim()) {
      setNotification({ type: 'error', text: 'Company Legal Name cannot be empty.' });
      return;
    }
    if (!formData.businessEmail.trim()) {
      setNotification({ type: 'error', text: 'Corporate Email cannot be empty.' });
      return;
    }
    if (!formData.phoneNumber.trim()) {
      setNotification({ type: 'error', text: 'Contact Phone Number cannot be empty.' });
      return;
    }

    setSaving(true);
    setNotification(null);

    try {
      const res = await updateCompanyProfile({
        companyName: formData.companyName.trim(),
        businessEmail: formData.businessEmail.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        businessSize: formData.businessSize,
        industryType: formData.industryType,
        gstin: formData.gstin.trim().toUpperCase(),
        currency: formData.currency,
      });

      if (res.success && res.company) {
        onUpdateCompany(res.company);
        setIsEditing(false);
        setNotification({
          type: 'success',
          text: 'Enterprise details and accounting boundaries successfully updated.',
        });
        setTimeout(() => setNotification(null), 5000);
      } else {
        setNotification({
          type: 'error',
          text: res.error || 'Failed to update company parameters.',
        });
      }
    } catch (err) {
      setNotification({
        type: 'error',
        text: 'Network error while updating settings: ' + err.message,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-page-switch">
      {/* Top Header with Prominent Edit Option Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white font-mono tracking-tight flex items-center space-x-2">
            <span>Company Profile & Accounting Boundaries</span>
          </h2>
          <p className="text-xs text-[#9aada2] font-mono mt-1">
            Verified corporate details, MSME scale, and statutory greenhouse gas accounting boundaries.
          </p>
        </div>

        {/* The Explicit Edit Action Option Button */}
        <div>
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold bg-[#122e1f] text-[#b5f568] border border-[#b5f568]/50 hover:bg-[#163825] hover:shadow-[0_0_24px_rgba(181,245,104,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-md"
            >
              <Edit3 className="w-4 h-4 text-[#b5f568]" />
              <span>Edit Details</span>
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-mono font-bold text-slate-300 hover:text-white bg-[#040a08] border border-white/[0.12] hover:border-white/[0.25] transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center space-x-2 px-5 py-2 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-[#b5f568] to-[#9ad84f] text-[#07130f] hover:shadow-[0_0_20px_rgba(181,245,104,0.45)] transition cursor-pointer shadow-md"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-xs font-mono flex items-center space-x-3 transition-all ${
            notification.type === 'success'
              ? 'bg-[#0f2d1e] text-[#62dd9e] border border-[#62dd9e]/40 shadow-[0_0_20px_rgba(98,221,158,0.2)]'
              : 'bg-red-950/70 text-red-200 border border-red-500/40'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-[#62dd9e] shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span className="flex-1 font-semibold">{notification.text}</span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white underline cursor-pointer text-[10px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ================================================================= */}
      {/* 1. VIEW MODE: Structured Verified Cards with Click to Edit */}
      {/* ================================================================= */}
      {!isEditing && (
        <div className="telemetry-card p-6 sm:p-8 rounded-2xl border border-[#b4ffcd]/18 bg-[#0b1b14]/90 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center space-x-2 text-xs font-mono text-[#b5f568] font-bold">
              <BadgeCheck className="w-4 h-4 text-[#b5f568]" />
              <span>Current Registered Parameters</span>
            </div>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="text-xs font-mono text-[#62dd9e] hover:text-[#b5f568] hover:underline flex items-center space-x-1 cursor-pointer"
            >
              <span>Click to Edit Information</span>
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            {/* Company Legal Name */}
            <div
              onClick={() => setIsEditing(true)}
              className="p-4 rounded-xl bg-[#040a08]/90 border border-white/[0.08] hover:border-[#b5f568]/40 transition cursor-pointer group"
            >
              <div className="text-[10px] text-[#9aada2] uppercase tracking-wider">Company Legal Name</div>
              <div className="text-white font-bold text-sm mt-1 group-hover:text-[#b5f568] transition-colors flex items-center justify-between">
                <span>{formData.companyName}</span>
                <Edit3 className="w-3.5 h-3.5 text-[#9aada2] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            {/* Business Scale */}
            <div
              onClick={() => setIsEditing(true)}
              className="p-4 rounded-xl bg-[#040a08]/90 border border-white/[0.08] hover:border-[#b5f568]/40 transition cursor-pointer group"
            >
              <div className="text-[10px] text-[#9aada2] uppercase tracking-wider">MSME Business Scale</div>
              <div className="text-[#b5f568] font-bold text-sm mt-1 flex items-center justify-between">
                <span>{formData.businessSize} Enterprise</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#122e1f] border border-[#b5f568]/30 text-[#b5f568]">
                  Verified Tier
                </span>
              </div>
            </div>

            {/* Corporate Email */}
            <div
              onClick={() => setIsEditing(true)}
              className="p-4 rounded-xl bg-[#040a08]/90 border border-white/[0.08] hover:border-[#b5f568]/40 transition cursor-pointer group"
            >
              <div className="text-[10px] text-[#9aada2] uppercase tracking-wider">Corporate Email Address</div>
              <div className="text-white font-semibold text-xs mt-1 group-hover:text-[#b5f568] transition-colors flex items-center justify-between">
                <span>{formData.businessEmail}</span>
                <Edit3 className="w-3.5 h-3.5 text-[#9aada2] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            {/* Contact Phone */}
            <div
              onClick={() => setIsEditing(true)}
              className="p-4 rounded-xl bg-[#040a08]/90 border border-white/[0.08] hover:border-[#b5f568]/40 transition cursor-pointer group"
            >
              <div className="text-[10px] text-[#9aada2] uppercase tracking-wider">Contact Phone Number</div>
              <div className="text-white font-semibold text-xs mt-1 group-hover:text-[#b5f568] transition-colors flex items-center justify-between">
                <span>{formData.phoneNumber}</span>
                <Edit3 className="w-3.5 h-3.5 text-[#9aada2] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            {/* Primary Industry Sector */}
            <div
              onClick={() => setIsEditing(true)}
              className="p-4 rounded-xl bg-[#040a08]/90 border border-white/[0.08] hover:border-[#b5f568]/40 transition cursor-pointer group"
            >
              <div className="text-[10px] text-[#9aada2] uppercase tracking-wider">Primary Industry Sector</div>
              <div className="text-white font-semibold text-xs mt-1 group-hover:text-[#b5f568] transition-colors flex items-center justify-between">
                <span>{formData.industryType}</span>
                <Edit3 className="w-3.5 h-3.5 text-[#9aada2] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            {/* GSTIN Identifier */}
            <div
              onClick={() => setIsEditing(true)}
              className="p-4 rounded-xl bg-[#040a08]/90 border border-white/[0.08] hover:border-[#b5f568]/40 transition cursor-pointer group"
            >
              <div className="text-[10px] text-[#9aada2] uppercase tracking-wider">GSTIN Identifier</div>
              <div className="text-white font-semibold text-xs mt-1 group-hover:text-[#b5f568] transition-colors flex items-center justify-between">
                <span className="font-mono tracking-wider">{formData.gstin || 'Not Provided (Micro Exemption)'}</span>
                <Edit3 className="w-3.5 h-3.5 text-[#9aada2] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            {/* Reporting Currency */}
            <div
              onClick={() => setIsEditing(true)}
              className="p-4 rounded-xl bg-[#040a08]/90 border border-white/[0.08] hover:border-[#b5f568]/40 transition cursor-pointer group"
            >
              <div className="text-[10px] text-[#9aada2] uppercase tracking-wider">Reporting Currency</div>
              <div className="text-white font-semibold text-xs mt-1 flex items-center justify-between">
                <span>{formData.currency === 'INR' ? 'Indian Rupee (₹ INR)' : formData.currency}</span>
                <span className="text-[10px] text-[#9aada2]">Spend Benchmark</span>
              </div>
            </div>

            {/* Factor Baseline */}
            <div
              onClick={() => setIsEditing(true)}
              className="p-4 rounded-xl bg-[#040a08]/90 border border-white/[0.08] hover:border-[#b5f568]/40 transition cursor-pointer group"
            >
              <div className="text-[10px] text-[#9aada2] uppercase tracking-wider">Factor Database Baseline</div>
              <div className="text-[#62dd9e] font-semibold text-xs mt-1 flex items-center justify-between">
                <span>{formData.factorBaseline}</span>
                <span className="text-[10px] text-[#62dd9e] font-mono">Statutory Baseline</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between text-xs font-mono text-[#9aada2]">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-[#62dd9e]" />
              <span>All corporate modifications logged to sovereign immutable audit log.</span>
            </div>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 rounded-xl bg-[#122e1f] text-[#b5f568] border border-[#b5f568]/40 font-bold hover:bg-[#163825] transition cursor-pointer"
            >
              Edit Information
            </button>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 2. EDIT MODE: Interactive Form with Illuminated Focus Inputs */}
      {/* ================================================================= */}
      {isEditing && (
        <form onSubmit={handleSave} className="telemetry-card p-6 sm:p-8 rounded-2xl border border-[#b5f568]/40 bg-[#0b1b14]/95 space-y-6 shadow-[0_0_32px_rgba(181,245,104,0.15)]">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.1]">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#b5f568] animate-ping" />
              <span className="text-xs font-mono text-[#b5f568] font-bold uppercase tracking-wider">
                Editing Enterprise Parameters
              </span>
            </div>
            <span className="text-[11px] font-mono text-[#9aada2]">
              Update the fields below and click Save Profile Changes
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs font-mono">
            {/* Company Legal Name */}
            <div className="space-y-1.5">
              <label className="text-[#9aada2] text-[10px] uppercase tracking-wider block font-bold">
                Company Legal Name <span className="text-[#b5f568]">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="e.g. Apachi Industrial Technologies"
                className="w-full px-4 py-3 rounded-xl bg-[#040a08] border border-[#b5f568]/40 text-white focus:outline-none focus:border-[#b5f568] focus:ring-1 focus:ring-[#b5f568] transition text-xs shadow-inner"
              />
              <span className="text-[10px] text-[#71857c]">
                Reflected in top navigation bar and statutory reports.
              </span>
            </div>

            {/* Corporate Email */}
            <div className="space-y-1.5">
              <label className="text-[#9aada2] text-[10px] uppercase tracking-wider block font-bold">
                Corporate Email Address <span className="text-[#b5f568]">*</span>
              </label>
              <input
                type="email"
                required
                value={formData.businessEmail}
                onChange={(e) => setFormData({ ...formData, businessEmail: e.target.value })}
                placeholder="e.g. esg@company.com"
                className="w-full px-4 py-3 rounded-xl bg-[#040a08] border border-[#b5f568]/40 text-white focus:outline-none focus:border-[#b5f568] focus:ring-1 focus:ring-[#b5f568] transition text-xs shadow-inner"
              />
              <span className="text-[10px] text-[#71857c]">
                Official email address for carbon accounting disclosures.
              </span>
            </div>

            {/* Contact Phone */}
            <div className="space-y-1.5">
              <label className="text-[#9aada2] text-[10px] uppercase tracking-wider block font-bold">
                Official Contact Phone <span className="text-[#b5f568]">*</span>
              </label>
              <input
                type="tel"
                required
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full px-4 py-3 rounded-xl bg-[#040a08] border border-[#b5f568]/40 text-white focus:outline-none focus:border-[#b5f568] focus:ring-1 focus:ring-[#b5f568] transition text-xs shadow-inner"
              />
              <span className="text-[10px] text-[#71857c]">
                Phone number registered for two-factor verification.
              </span>
            </div>

            {/* Business Scale */}
            <div className="space-y-1.5">
              <label className="text-[#9aada2] text-[10px] uppercase tracking-wider block font-bold">
                MSME Business Scale <span className="text-[#b5f568]">*</span>
              </label>
              <select
                value={formData.businessSize}
                onChange={(e) => setFormData({ ...formData, businessSize: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#040a08] border border-[#b5f568]/40 text-[#b5f568] font-bold focus:outline-none focus:border-[#b5f568] focus:ring-1 focus:ring-[#b5f568] transition cursor-pointer text-xs shadow-inner"
              >
                <option value="Micro" className="bg-[#0b1b14]">Micro Enterprise (&lt; ₹5 Cr turnover)</option>
                <option value="Small" className="bg-[#0b1b14]">Small Enterprise (&lt; ₹50 Cr turnover)</option>
                <option value="Medium" className="bg-[#0b1b14]">Medium Enterprise (&lt; ₹250 Cr turnover)</option>
                <option value="Large" className="bg-[#0b1b14]">Large Corporate / Industrial Scale</option>
              </select>
              <span className="text-[10px] text-[#71857c]">
                Determines applicable statutory materiality thresholds.
              </span>
            </div>

            {/* Primary Industry Sector */}
            <div className="space-y-1.5">
              <label className="text-[#9aada2] text-[10px] uppercase tracking-wider block font-bold">
                Primary Industry Sector <span className="text-[#b5f568]">*</span>
              </label>
              <select
                value={formData.industryType}
                onChange={(e) => setFormData({ ...formData, industryType: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#040a08] border border-[#b5f568]/40 text-white focus:outline-none focus:border-[#b5f568] focus:ring-1 focus:ring-[#b5f568] transition cursor-pointer text-xs shadow-inner"
              >
                <option value="Manufacturing" className="bg-[#0b1b14]">Manufacturing & Fabrication</option>
                <option value="Engineering & Machinery" className="bg-[#0b1b14]">Engineering & Machinery</option>
                <option value="Food Processing & FMCG" className="bg-[#0b1b14]">Food Processing & Agri FMCG</option>
                <option value="Logistics" className="bg-[#0b1b14]">Logistics & Supply Chain</option>
                <option value="Textiles" className="bg-[#0b1b14]">Textiles & Garment Manufacturing</option>
                <option value="Chemicals" className="bg-[#0b1b14]">Chemicals & Pharmaceuticals</option>
                <option value="Services" className="bg-[#0b1b14]">IT & Software Services</option>
                <option value="Automotive" className="bg-[#0b1b14]">Automotive & Ancillary</option>
                <option value="Other" className="bg-[#0b1b14]">Other Industrial Sector</option>
              </select>
              <span className="text-[10px] text-[#71857c]">
                Calibrates default Scope 1 & Scope 3 emission activity benchmarks.
              </span>
            </div>

            {/* GSTIN Identifier */}
            <div className="space-y-1.5">
              <label className="text-[#9aada2] text-[10px] uppercase tracking-wider block font-bold">
                GSTIN Identifier
              </label>
              <input
                type="text"
                maxLength={15}
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                placeholder="e.g. 33AAAAA0000A1Z5"
                className="w-full px-4 py-3 rounded-xl bg-[#040a08] border border-[#b5f568]/40 text-white uppercase focus:outline-none focus:border-[#b5f568] focus:ring-1 focus:ring-[#b5f568] transition tracking-wider text-xs shadow-inner"
              />
              <span className="text-[10px] text-[#71857c]">
                15-character statutory GST identification number.
              </span>
            </div>

            {/* Reporting Currency */}
            <div className="space-y-1.5">
              <label className="text-[#9aada2] text-[10px] uppercase tracking-wider block font-bold">
                Reporting Currency
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#040a08] border border-[#b5f568]/40 text-white focus:outline-none focus:border-[#b5f568] focus:ring-1 focus:ring-[#b5f568] transition cursor-pointer text-xs shadow-inner"
              >
                <option value="INR" className="bg-[#0b1b14]">Indian Rupee (₹ INR)</option>
                <option value="USD" className="bg-[#0b1b14]">US Dollar ($ USD)</option>
                <option value="EUR" className="bg-[#0b1b14]">Euro (€ EUR)</option>
                <option value="GBP" className="bg-[#0b1b14]">British Pound (£ GBP)</option>
              </select>
              <span className="text-[10px] text-[#71857c]">
                Currency unit for spend-based Scope 3 calculations.
              </span>
            </div>

            {/* Factor Baseline Standard */}
            <div className="space-y-1.5">
              <label className="text-[#9aada2] text-[10px] uppercase tracking-wider block font-bold">
                Factor Database Baseline
              </label>
              <select
                value={formData.factorBaseline}
                onChange={(e) => setFormData({ ...formData, factorBaseline: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#040a08] border border-[#b5f568]/40 text-[#62dd9e] font-semibold focus:outline-none focus:border-[#b5f568] focus:ring-1 focus:ring-[#b5f568] transition cursor-pointer text-xs shadow-inner"
              >
                <option value="CEA v20.0 & MoEFCC Aligned" className="bg-[#0b1b14]">CEA v20.0 & MoEFCC Aligned (Default National Grid)</option>
                <option value="IPCC 2006 Guidelines Tier 1 & 2" className="bg-[#0b1b14]">IPCC 2006 Guidelines (Tier 1 & 2 Stationary)</option>
                <option value="GHG Protocol Corporate Standard" className="bg-[#0b1b14]">GHG Protocol Corporate Standard (Global Baseline)</option>
              </select>
              <span className="text-[10px] text-[#71857c]">
                Governs automated emission factor assignment for invoices.
              </span>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-white/[0.1]">
            <div className="flex items-center space-x-2 text-[11px] font-mono text-[#9aada2]">
              <ShieldCheck className="w-4 h-4 text-[#62dd9e]" />
              <span>Changes will update active workspace telemetry and statutory exports.</span>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-mono font-bold text-slate-300 hover:text-white bg-[#040a08] border border-white/[0.12] hover:border-white/[0.25] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-[#b5f568] to-[#9ad84f] text-[#07130f] hover:shadow-[0_0_24px_rgba(181,245,104,0.45)] hover:scale-[1.01] transition-all cursor-pointer shadow-md"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

export default CompanySettings;
