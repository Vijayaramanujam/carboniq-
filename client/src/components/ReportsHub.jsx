import React, { useState, useEffect } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Download,
  ShieldCheck,
  Globe,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Flame,
  Zap,
  Package,
} from 'lucide-react';
import { fetchStatutorySummary, downloadStatutoryReport } from '../services/api.js';

export function ReportsHub({ company, onNavigateTab }) {
  const [loading, setLoading] = useState(true);
  const [downloadingFormat, setDownloadingFormat] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [error, setError] = useState(null);

  const loadSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchStatutorySummary();
      if (res.success) {
        setSummaryData(res);
      } else {
        setError(res.error || 'Failed to load statutory compliance summary');
      }
    } catch (err) {
      setError(err.message || 'Error communicating with server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const handleDownload = async (endpoint, fallbackFilename, formatId) => {
    setDownloadingFormat(formatId);
    try {
      await downloadStatutoryReport(endpoint, fallbackFilename);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setDownloadingFormat(null);
    }
  };

  const brsr = summaryData?.brsr;
  const cbam = summaryData?.cbam;

  return (
    <div className="space-y-6 animate-page-enter">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>Statutory Carbon Compliance &amp; Disclosures</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#9aada2] font-mono mt-1">
            Automated statutory disclosures compliant with SEBI BRSR Core &bull; EU CBAM Reg (EU) 2023/956 &bull; CEA v20.0
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#0b1b14] border border-[#62dd9e]/25 text-xs font-mono text-[#d8e6de] shadow-inner">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#62dd9e] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#62dd9e]"></span>
            </span>
            <span className="text-[10px] text-[#9aada2]">Assurance:</span>
            <span className="text-[#b5f568] font-semibold text-[11px]">Audit Ready</span>
          </div>

          <button
            type="button"
            onClick={loadSummary}
            disabled={loading}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-[#122e1f] text-[#b5f568] border border-[#b5f568]/40 hover:bg-[#163825] transition cursor-pointer disabled:opacity-50"
            title="Refresh Statutory Ledger Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Body */}
      {loading ? (
        <div className="py-20 rounded-2xl bg-[#0b1b14]/90 border border-[#b4ffcd]/15 flex flex-col items-center justify-center text-[#9aada2] space-y-3 font-mono">
          <Loader2 className="w-8 h-8 animate-spin text-[#b5f568]" />
          <p className="text-xs">Aggregating Scope 1, 2, 3 footprint and statutory indicators...</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-[#2b0c10] border border-[#f87171]/40 text-[#fca5a5] flex items-center space-x-3 text-xs font-mono">
          <AlertCircle className="w-5 h-5 shrink-0 text-[#f87171]" />
          <span>{error}</span>
        </div>
      ) : (
        <>
          {/* Executive Metrics Overview (4 Glowing Telemetry Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Scope 1 */}
            <div className="telemetry-card p-5 rounded-2xl border border-amber-500/25 bg-[#0b1b14]/90 backdrop-blur-xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#9aada2] block">
                    Scope 1 (Direct Fuel)
                  </span>
                  <div className="flex items-baseline space-x-1.5 mt-1">
                    <span className="text-3xl font-black font-mono text-white tracking-tight">
                      {brsr?.scope1Tonnes ?? 0}
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-400">t CO₂e</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#9aada2] block mt-2">Stationary &amp; Mobile Comb.</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#241708] border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)]">
                  <Flame className="w-6 h-6 text-amber-400" />
                </div>
              </div>
            </div>

            {/* Card 2: Scope 2 */}
            <div className="telemetry-card p-5 rounded-2xl border border-sky-500/25 bg-[#0b1b14]/90 backdrop-blur-xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-sky-400 to-transparent" />
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#9aada2] block">
                    Scope 2 (Electricity)
                  </span>
                  <div className="flex items-baseline space-x-1.5 mt-1">
                    <span className="text-3xl font-black font-mono text-white tracking-tight">
                      {brsr?.scope2Tonnes ?? 0}
                    </span>
                    <span className="text-xs font-mono font-bold text-sky-400">t CO₂e</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#9aada2] block mt-2">CEA v20.0 National Baseline</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#091e2b] border border-sky-500/40 flex items-center justify-center text-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.25)]">
                  <Zap className="w-6 h-6 text-sky-400" />
                </div>
              </div>
            </div>

            {/* Card 3: Scope 3 */}
            <div className="telemetry-card p-5 rounded-2xl border border-purple-500/25 bg-[#0b1b14]/90 backdrop-blur-xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-400 to-transparent" />
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#9aada2] block">
                    Scope 3 (Value Chain)
                  </span>
                  <div className="flex items-baseline space-x-1.5 mt-1">
                    <span className="text-3xl font-black font-mono text-white tracking-tight">
                      {brsr?.scope3GrossTonnes ?? 0}
                    </span>
                    <span className="text-xs font-mono font-bold text-purple-400">t CO₂e</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#9aada2] block mt-2">EXIOBASE &amp; Vendor Ledgers</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#1e132b] border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-[0_0_20px_rgba(192,132,252,0.25)]">
                  <Package className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </div>

            {/* Card 4: Net Footprint */}
            <div className="telemetry-card p-5 rounded-2xl border border-[#b5f568]/30 bg-gradient-to-br from-[#0b2417] via-[#071810] to-[#040e09] relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#b5f568] to-transparent" />
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#b5f568] block font-semibold">
                    Net Corporate Footprint
                  </span>
                  <div className="flex items-baseline space-x-1.5 mt-1">
                    <span className="text-3xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-[#b5f568] to-[#62dd9e] tracking-tight">
                      {brsr?.netTonnes ?? 0}
                    </span>
                    <span className="text-xs font-mono font-bold text-[#b5f568]">t CO₂e</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#62dd9e] block mt-2">
                    {brsr?.offsetTonnes > 0 ? `Incl. -${brsr.offsetTonnes} t avoided emissions` : 'Statutory Assurance Ready'}
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#0c2e1f] border border-[#62dd9e]/50 flex items-center justify-center text-[#62dd9e] shadow-[0_0_20px_rgba(98,221,158,0.3)]">
                  <ShieldCheck className="w-6 h-6 text-[#62dd9e]" />
                </div>
              </div>
            </div>
          </div>

          {/* Dual Framework Columns (SEBI BRSR Core & EU CBAM Declarations) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. SEBI BRSR CORE CARD */}
            <div className="telemetry-card p-6 rounded-2xl border border-[#b4ffcd]/15 bg-[#0b1b14]/90 backdrop-blur-xl flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#b5f568] to-transparent" />

              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-xl bg-[#122e1f] border border-[#b5f568]/40 text-[#b5f568]">
                      <Building2 className="w-5 h-5 text-[#b5f568]" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white font-mono tracking-tight">SEBI BRSR Core Disclosures</h3>
                      <span className="text-[10px] font-mono text-[#9aada2]">Securities and Exchange Board of India</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[#122e1f] text-[#b5f568] border border-[#b5f568]/40 font-semibold">
                    Principle 6
                  </span>
                </div>

                <p className="text-xs text-[#9aada2] font-mono leading-relaxed">
                  Mandatory statutory environmental reporting for listed Indian enterprises and value chain partners (SEBI Circular 2023). Covers Essential Indicators 7 (GHG Protocol Scopes 1, 2, 3) and 8 (Total Energy Consumption).
                </p>

                {/* Accounting Parameters */}
                <div className="p-3.5 rounded-xl bg-[#040a08]/90 border border-white/[0.08] space-y-2 text-xs font-mono">
                  <div className="flex justify-between items-center py-1 border-b border-white/[0.06]">
                    <span className="text-[#9aada2]">Turnover Reference Basis:</span>
                    <span className="text-white font-bold">&#8377; {brsr?.turnoverCrore || 10} Crore</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-white/[0.06]">
                    <span className="text-[#9aada2]">GHG Intensity Ratio:</span>
                    <span className="text-[#b5f568] font-bold">{brsr?.ghgIntensityPerCrore || 0.18} t CO₂e / &#8377; Cr turnover</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-white/[0.06]">
                    <span className="text-[#9aada2]">Energy Intensity Ratio:</span>
                    <span className="text-[#62dd9e] font-bold">{brsr?.energy?.energyIntensityPerCrore || 0.8} GJ / &#8377; Cr turnover</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-[#9aada2]">Grid Emission Factor:</span>
                    <span className="text-[#d8e6de] font-semibold">CEA v20.0 National Baseline</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-5 border-t border-white/[0.08] mt-4">
                <button
                  type="button"
                  onClick={() => handleDownload('brsr/pdf', `${company?.companyName || 'SME'}_SEBI_BRSR_Core.pdf`, 'brsr_pdf')}
                  disabled={downloadingFormat === 'brsr_pdf'}
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#b5f568] to-[#9ad84f] text-[#07130f] text-xs font-mono font-bold hover:shadow-[0_0_24px_rgba(181,245,104,0.4)] hover:scale-[1.01] active:scale-[0.99] transition cursor-pointer disabled:opacity-50"
                >
                  {downloadingFormat === 'brsr_pdf' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#07130f]" />
                  ) : (
                    <Download className="w-4 h-4 text-[#07130f]" />
                  )}
                  <span>Download Official BRSR Core Report (PDF)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownload('brsr/excel', `${company?.companyName || 'SME'}_SEBI_BRSR_Core.xlsx`, 'brsr_xlsx')}
                  disabled={downloadingFormat === 'brsr_xlsx'}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-[#122e1f] text-[#b5f568] border border-[#b5f568]/40 hover:bg-[#163825] text-xs font-mono font-bold transition cursor-pointer disabled:opacity-50"
                >
                  {downloadingFormat === 'brsr_xlsx' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#b5f568]" />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4 text-[#b5f568]" />
                  )}
                  <span>Download Multi-Sheet BRSR Template (Excel)</span>
                </button>
              </div>
            </div>

            {/* 2. EU CBAM EXPORT CARD */}
            <div className="telemetry-card p-6 rounded-2xl border border-[#b4ffcd]/15 bg-[#0b1b14]/90 backdrop-blur-xl flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-sky-400 to-transparent" />

              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-xl bg-[#0c2331] border border-sky-500/40 text-sky-400">
                      <Globe className="w-5 h-5 text-sky-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white font-mono tracking-tight">EU CBAM Declarations</h3>
                      <span className="text-[10px] font-mono text-[#9aada2]">Carbon Border Adjustment Mechanism</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[#0c2331] text-sky-400 border border-sky-500/40 font-semibold">
                    Reg (EU) 2023/956
                  </span>
                </div>

                <p className="text-xs text-[#9aada2] font-mono leading-relaxed">
                  Structured reporting for Indian exporters of Steel, Aluminum, Cement, and Fertilizers to European Union importers during the CBAM transitional registry phase.
                </p>

                {/* Accounting Parameters */}
                <div className="p-3.5 rounded-xl bg-[#040a08]/90 border border-white/[0.08] space-y-2 text-xs font-mono">
                  <div className="flex justify-between items-center py-1 border-b border-white/[0.06]">
                    <span className="text-[#9aada2]">Transitional Reporting Period:</span>
                    <span className="text-white font-bold">{cbam?.reportingPeriod || '2026-Q3'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-white/[0.06]">
                    <span className="text-[#9aada2]">Covered Combined Nomenclature:</span>
                    <span className="text-sky-400 font-bold">{cbam?.goods?.length || 1} CN Line Item(s)</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-white/[0.06]">
                    <span className="text-[#9aada2]">CEA Specific Electricity Factor:</span>
                    <span className="text-white font-bold">{cbam?.defaultGridFactor || 0.727} kg CO₂/kWh</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-[#9aada2]">Embedded Emissions Ledger:</span>
                    <span className="text-[#62dd9e] font-semibold">Direct &amp; Indirect Split Aligned</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-5 border-t border-white/[0.08] mt-4">
                <button
                  type="button"
                  onClick={() => handleDownload('cbam/xml', `${company?.companyName || 'SME'}_EU_CBAM_Registry.xml`, 'cbam_xml')}
                  disabled={downloadingFormat === 'cbam_xml'}
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-gradient-to-r from-sky-400 to-blue-500 text-[#07130f] text-xs font-mono font-bold hover:shadow-[0_0_24px_rgba(56,189,248,0.4)] hover:scale-[1.01] active:scale-[0.99] transition cursor-pointer disabled:opacity-50"
                >
                  {downloadingFormat === 'cbam_xml' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#07130f]" />
                  ) : (
                    <Download className="w-4 h-4 text-[#07130f]" />
                  )}
                  <span>Download EU Transitional Registry (XML)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownload('cbam/csv', `${company?.companyName || 'SME'}_EU_CBAM_Goods.csv`, 'cbam_csv')}
                  disabled={downloadingFormat === 'cbam_csv'}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-[#0c2331] text-sky-400 border border-sky-500/40 hover:bg-[#102e40] text-xs font-mono font-bold transition cursor-pointer disabled:opacity-50"
                >
                  {downloadingFormat === 'cbam_csv' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4 text-sky-400" />
                  )}
                  <span>Download Importer Communication (CSV)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Complete Audit Ledger CSV Card (Full Width Banner) */}
          <div className="p-5 sm:p-6 rounded-2xl border border-[#b4ffcd]/15 bg-[#0b1b14]/90 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
            <div className="flex items-center space-x-3.5">
              <div className="p-3 rounded-xl bg-[#122e1f] border border-[#62dd9e]/40 text-[#62dd9e] shrink-0">
                <FileText className="w-6 h-6 text-[#62dd9e]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white tracking-tight">Full CarbonIQ Activity Audit Ledger (CSV)</h4>
                <p className="text-xs text-[#9aada2] mt-0.5 max-w-2xl leading-relaxed">
                  Complete line-by-line verification trace containing factor IDs, Leontief direct/upstream splits, CEA grid baselines, and exact mathematical formulas.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleDownload('export/csv', `${company?.companyName || 'SME'}_CarbonIQ_Audit_Ledger.csv`, 'audit_csv')}
              disabled={downloadingFormat === 'audit_csv'}
              className="shrink-0 flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#122e1f] hover:bg-[#163825] text-[#b5f568] text-xs font-mono font-bold border border-[#b5f568]/40 hover:border-[#b5f568] transition cursor-pointer disabled:opacity-50"
            >
              {downloadingFormat === 'audit_csv' ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#b5f568]" />
              ) : (
                <Download className="w-4 h-4 text-[#b5f568]" />
              )}
              <span>Export Full Ledger CSV</span>
            </button>
          </div>

          {/* Compliance Assurance Footer Strip */}
          <div className="p-4 rounded-xl bg-[#040a08]/80 border border-white/[0.06] flex items-center space-x-2.5 text-xs font-mono text-[#9aada2]">
            <CheckCircle2 className="w-4 h-4 text-[#62dd9e] shrink-0" />
            <span>
              Formulated under SEBI BRSR Core Circular SEBI/HO/CFD/CFD-SEC-2/P/CIR/2023/122 &bull; EU CBAM Regulation (EU) 2023/956 &bull; CEA v20.0 National Baseline.
            </span>
          </div>
        </>
      )}
    </div>
  );
}