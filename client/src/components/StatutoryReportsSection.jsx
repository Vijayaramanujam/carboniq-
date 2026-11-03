import React, { useState, useEffect } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Download,
  ShieldCheck,
  Globe,
  Building2,
  Sparkles,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
  Layers,
  Calendar,
  Check,
} from 'lucide-react';
import { fetchStatutorySummary, downloadStatutoryReport } from '../services/api.js';

export function StatutoryReportsSection({ company }) {
  const [loading, setLoading] = useState(true);
  const [downloadingFormat, setDownloadingFormat] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchStatutorySummary();
      if (res.success) {
        setSummaryData(res);
        setLastRefreshed(new Date());
      } else {
        setError(res.error || 'Failed to load statutory compliance summary');
      }
    } catch (err) {
      setError(err.message || 'Error communicating with server');
    } finally {
      setLoading(false);
    }
  };

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
  const meta = summaryData?.metadata;

  return (
    <div className="space-y-6 animate-page-enter">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#b4ffcd]/10">
        <div className="flex items-start space-x-3.5">
          <div className="p-3 rounded-2xl bg-[#0e2a1e] border border-[#b5f568]/40 text-[#b5f568] shadow-[0_0_20px_rgba(181,245,104,0.25)] shrink-0">
            <ShieldCheck className="w-6 h-6 text-[#b5f568]" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
                Statutory Compliance & Reporting Hub
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#122e1f] text-[#b5f568] border border-[#b5f568]/40 font-mono shadow-[0_0_12px_rgba(181,245,104,0.2)]">
                Audit Ready
              </span>
            </div>
            <p className="text-xs text-[#9aada2] font-mono mt-1">
              SEBI BRSR Core (Principle 6) &bull; EU CBAM Reg (EU) 2023/956 &bull; ISO 14064-1 Verifiable Disclosures
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 self-end sm:self-auto">
          {lastRefreshed && (
            <span className="text-[10px] font-mono text-[#9aada2] hidden md:inline">
              Synced: {lastRefreshed.toLocaleTimeString()}
            </span>
          )}
          <button
            type="button"
            onClick={loadSummary}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-semibold bg-[#122e1f] hover:bg-[#1a3d2b] text-[#b5f568] border border-[#b5f568]/40 hover:shadow-[0_0_16px_rgba(181,245,104,0.3)] transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Ledger</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-[#9aada2] space-y-3 font-mono">
          <Loader2 className="w-8 h-8 animate-spin text-[#b5f568]" />
          <p className="text-sm font-medium">Aggregating Scope 1, 2, 3 footprint and statutory indicators...</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-700/50 text-red-300 flex items-center space-x-3 text-sm font-mono">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <>
          {/* Executive Metrics Overview Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="telemetry-card p-4 rounded-2xl border border-[#b4ffcd]/15 bg-[#0b1b14]/90 relative overflow-hidden">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#9aada2] block">
                Scope 1 (Direct)
              </span>
              <span className="text-2xl font-black font-mono text-cyan-300 mt-1 block tracking-tight">
                {brsr?.scope1Tonnes ?? 0} <span className="text-xs font-normal text-[#9aada2]">tCO₂e</span>
              </span>
              <span className="text-[10px] font-mono text-[#62dd9e] mt-1 block">
                Stationary & Fleet Combustion
              </span>
            </div>

            <div className="telemetry-card p-4 rounded-2xl border border-[#b4ffcd]/15 bg-[#0b1b14]/90 relative overflow-hidden">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#9aada2] block">
                Scope 2 (Electricity)
              </span>
              <span className="text-2xl font-black font-mono text-[#b5f568] mt-1 block tracking-tight">
                {brsr?.scope2Tonnes ?? 0} <span className="text-xs font-normal text-[#9aada2]">tCO₂e</span>
              </span>
              <span className="text-[10px] font-mono text-[#9aada2] mt-1 block">
                CEA v20.0 Grid Baseline (0.82)
              </span>
            </div>

            <div className="telemetry-card p-4 rounded-2xl border border-[#b4ffcd]/15 bg-[#0b1b14]/90 relative overflow-hidden">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#9aada2] block">
                Scope 3 (Value Chain)
              </span>
              <span className="text-2xl font-black font-mono text-indigo-300 mt-1 block tracking-tight">
                {brsr?.scope3GrossTonnes ?? 0} <span className="text-xs font-normal text-[#9aada2]">tCO₂e</span>
              </span>
              <span className="text-[10px] font-mono text-[#9aada2] mt-1 block">
                EXIOBASE 3.11.2 Leontief EEIO
              </span>
            </div>

            <div className="telemetry-card p-4 rounded-2xl border border-[#b5f568]/40 bg-gradient-to-br from-[#0c261a] to-[#040e09] relative overflow-hidden shadow-[0_0_24px_rgba(181,245,104,0.15)]">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#b5f568] block font-bold">
                Net Corporate Footprint
              </span>
              <span className="text-2xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-[#b5f568] to-[#62dd9e] mt-1 block tracking-tight">
                {brsr?.netTonnes ?? 0} <span className="text-xs font-normal text-[#9aada2]">tCO₂e</span>
              </span>
              <span className="text-[10px] font-mono text-[#62dd9e] mt-1 block">
                {brsr?.offsetTonnes > 0
                  ? `Incl. -${brsr.offsetTonnes} t avoided recycling`
                  : 'ISO 14064-1 Verifiable'}
              </span>
            </div>
          </div>

          {/* Core Statutory Compliance Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. SEBI BRSR CORE CARD */}
            <div className="telemetry-card p-5 sm:p-6 rounded-2xl border border-[#62dd9e]/30 bg-[#071610] flex flex-col justify-between space-y-5 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-36 h-36 bg-[#62dd9e]/10 rounded-full blur-3xl pointer-events-none" />

              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#62dd9e]/20">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-xl bg-[#0e2a1e] border border-[#62dd9e]/40 text-[#62dd9e]">
                      <Building2 className="w-5 h-5 text-[#62dd9e]" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-white font-mono">
                        SEBI BRSR Core Disclosures
                      </h3>
                      <span className="text-[10px] font-mono text-[#9aada2]">
                        Mandatory Principle 6 Environmental Indicators
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg bg-[#0e2a1e] text-[#b5f568] border border-[#b5f568]/40">
                    SEBI 2023 Circular
                  </span>
                </div>

                <p className="text-xs text-[#9aada2] font-mono mt-3 leading-relaxed">
                  Generates statutory Environmental Disclosures for listed Indian enterprises and top value chain partners. 
                  Populates Essential Indicators 7 (GHG Emissions) and 8 (Energy Intensity per Rupee of Turnover).
                </p>

                <div className="mt-4 p-3.5 rounded-xl bg-[#040e09] border border-[#62dd9e]/20 space-y-2.5 text-xs font-mono">
                  <div className="flex justify-between py-1 border-b border-white/[0.06]">
                    <span className="text-[#9aada2]">Turnover Basis:</span>
                    <span className="text-white font-bold">₹ {brsr?.turnoverCrore || '10.00'} Crore</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/[0.06]">
                    <span className="text-[#9aada2]">GHG Intensity Ratio:</span>
                    <span className="text-[#b5f568] font-bold">
                      {brsr?.ghgIntensityPerCrore ?? '0.00'} tCO₂e / ₹ Cr
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[#9aada2]">Energy Intensity Ratio:</span>
                    <span className="text-[#62dd9e] font-bold">
                      {brsr?.energy?.energyIntensityPerCrore ?? '0.00'} GJ / ₹ Cr
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-[#62dd9e]/20">
                <button
                  type="button"
                  onClick={() =>
                    handleDownload(
                      'brsr/pdf',
                      `${company?.companyName || 'SME'}_SEBI_BRSR_Core.pdf`,
                      'brsr_pdf'
                    )
                  }
                  disabled={downloadingFormat === 'brsr_pdf'}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#b5f568] to-[#62dd9e] hover:from-[#c5fa82] hover:to-[#73e8ac] text-[#05110c] text-xs font-mono font-bold shadow-lg transition cursor-pointer disabled:opacity-50"
                >
                  {downloadingFormat === 'brsr_pdf' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#05110c]" />
                  ) : (
                    <Download className="w-4 h-4 text-[#05110c]" />
                  )}
                  <span>Download Official BRSR Core Report (PDF)</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleDownload(
                      'brsr/excel',
                      `${company?.companyName || 'SME'}_SEBI_BRSR_Core.xlsx`,
                      'brsr_xlsx'
                    )
                  }
                  disabled={downloadingFormat === 'brsr_xlsx'}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-[#0e2a1e] hover:bg-[#143a29] text-[#b5f568] text-xs font-mono font-semibold border border-[#b5f568]/40 transition cursor-pointer disabled:opacity-50"
                >
                  {downloadingFormat === 'brsr_xlsx' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4 text-[#b5f568]" />
                  )}
                  <span>Download Multi-Sheet BRSR Template (Excel)</span>
                </button>
              </div>
            </div>

            {/* 2. EU CBAM EXPORT CARD */}
            <div className="telemetry-card p-5 sm:p-6 rounded-2xl border border-cyan-500/30 bg-[#071610] flex flex-col justify-between space-y-5 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-36 h-36 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

              <div>
                <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-300">
                      <Globe className="w-5 h-5 text-cyan-300" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-white font-mono">
                        EU CBAM Export Declarations
                      </h3>
                      <span className="text-[10px] font-mono text-[#9aada2]">
                        Carbon Border Adjustment Mechanism Package
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg bg-cyan-950/60 text-cyan-300 border border-cyan-500/40">
                    Reg (EU) 2023/956
                  </span>
                </div>

                <p className="text-xs text-[#9aada2] font-mono mt-3 leading-relaxed">
                  Export compliance for Indian manufacturers of <strong>Steel, Aluminum, and Cement</strong> to EU buyers during the transitional phase. Computes direct & indirect embedded specific carbon intensities.
                </p>

                <div className="mt-4 p-3.5 rounded-xl bg-[#040e09] border border-cyan-500/20 space-y-2.5 text-xs font-mono">
                  <div className="flex justify-between py-1 border-b border-white/[0.06]">
                    <span className="text-[#9aada2]">Reporting Period:</span>
                    <span className="text-white font-bold">{cbam?.reportingPeriod || '2024-Q3'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/[0.06]">
                    <span className="text-[#9aada2]">Covered Commodities:</span>
                    <span className="text-cyan-300 font-bold">{cbam?.goods?.length || 1} CN Goods Category</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[#9aada2]">National Grid Benchmark:</span>
                    <span className="text-[#b5f568] font-bold">{cbam?.defaultGridFactor || 0.82} kg CO₂/kWh</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-cyan-500/20">
                <button
                  type="button"
                  onClick={() =>
                    handleDownload(
                      'cbam/xml',
                      `${company?.companyName || 'SME'}_EU_CBAM_Registry.xml`,
                      'cbam_xml'
                    )
                  }
                  disabled={downloadingFormat === 'cbam_xml'}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-[#05110c] text-xs font-mono font-bold shadow-lg transition cursor-pointer disabled:opacity-50"
                >
                  {downloadingFormat === 'cbam_xml' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#05110c]" />
                  ) : (
                    <Download className="w-4 h-4 text-[#05110c]" />
                  )}
                  <span>Download EU Registry Package (XML)</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleDownload(
                      'cbam/csv',
                      `${company?.companyName || 'SME'}_EU_CBAM_Goods.csv`,
                      'cbam_csv'
                    )
                  }
                  disabled={downloadingFormat === 'cbam_csv'}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-cyan-950/50 hover:bg-cyan-900/50 text-cyan-200 text-xs font-mono font-semibold border border-cyan-500/40 transition cursor-pointer disabled:opacity-50"
                >
                  {downloadingFormat === 'cbam_csv' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4 text-cyan-300" />
                  )}
                  <span>Download Importer Communication (CSV)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Full Activity Ledger Audit Download */}
          <div className="telemetry-card p-5 rounded-2xl border border-[#b4ffcd]/15 bg-[#0b1b14]/90 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="p-2.5 rounded-xl bg-[#0e2a1e] border border-[#62dd9e]/40 text-[#62dd9e] shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white font-mono">
                  Full CarbonIQ Sovereign Activity Audit Ledger (CSV)
                </h4>
                <p className="text-[11px] text-[#9aada2] font-mono mt-0.5">
                  Complete line-by-line verification trace containing factor IDs, Leontief direct/upstream splits, and exact mathematical provenance formulas.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                handleDownload(
                  'export/csv',
                  `${company?.companyName || 'SME'}_CarbonIQ_Audit_Ledger.csv`,
                  'audit_csv'
                )
              }
              disabled={downloadingFormat === 'audit_csv'}
              className="shrink-0 flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#0e2a1e] hover:bg-[#143a29] text-[#b5f568] text-xs font-mono font-bold border border-[#b5f568]/40 hover:shadow-[0_0_16px_rgba(181,245,104,0.3)] transition cursor-pointer disabled:opacity-50"
            >
              {downloadingFormat === 'audit_csv' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4 text-[#b5f568]" />
              )}
              <span>Export Full Ledger CSV</span>
            </button>
          </div>

          {/* Regulatory Standards Compliance Matrix Footer */}
          <div className="p-4 rounded-xl bg-[#071610] border border-[#62dd9e]/20 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-[#9aada2]">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-[#62dd9e] shrink-0" />
              <span>Aligned with SEBI BRSR Core, EU CBAM (2023/956), CEA India v20.0 (0.82 kg/kWh) & EXIOBASE 3.11.2</span>
            </div>
            <div className="flex items-center space-x-3 text-[10px] text-[#b5f568]">
              <span>GHG Protocol Corporate Standard</span>
              <span>&bull;</span>
              <span>ISO 14064-1:2018</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

