import React, { useState, useEffect } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Download,
  ShieldCheck,
  Globe,
  Building2,
  X,
  Sparkles,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { fetchStatutorySummary, downloadStatutoryReport } from '../services/api.js';

export function StatutoryComplianceModal({ isOpen, onClose, company }) {
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
    if (isOpen) {
      loadSummary();
    }
  }, [isOpen]);

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

  if (!isOpen) return null;

  const brsr = summaryData?.brsr;
  const cbam = summaryData?.cbam;
  const meta = summaryData?.metadata;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:px-6 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-emerald-950/70 border border-emerald-600/50 text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-semibold text-white">Statutory Carbon Compliance & Export Hub</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                  Audit Ready
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated statutory reporting compliant with SEBI BRSR Core & EU CBAM guidelines
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
              <p className="text-sm font-medium">Aggregating Scope 1, 2, 3 footprint and statutory indicators...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-700/50 text-red-300 flex items-center space-x-3 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              {/* Executive Metrics Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Scope 1 (Direct)</span>
                  <span className="text-xl font-bold font-mono text-cyan-300 mt-1 block">
                    {brsr?.scope1Tonnes ?? 0} <span className="text-xs font-normal text-slate-400">tCO₂e</span>
                  </span>
                  <span className="text-[10px] text-slate-500">Fuel & Fleet</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Scope 2 (Electricity)</span>
                  <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
                    {brsr?.scope2Tonnes ?? 0} <span className="text-xs font-normal text-slate-400">tCO₂e</span>
                  </span>
                  <span className="text-[10px] text-slate-500">CEA 2024 Grid (0.82)</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Scope 3 (Value Chain)</span>
                  <span className="text-xl font-bold font-mono text-indigo-300 mt-1 block">
                    {brsr?.scope3GrossTonnes ?? 0} <span className="text-xs font-normal text-slate-400">tCO₂e</span>
                  </span>
                  <span className="text-[10px] text-slate-500">EXIOBASE 3.11.2 EEIO</span>
                </div>

                <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/40">
                  <span className="text-[11px] text-emerald-300 block">Net Corporate Footprint</span>
                  <span className="text-xl font-extrabold font-mono text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200 mt-1 block">
                    {brsr?.netTonnes ?? 0} <span className="text-xs font-normal text-slate-400">tCO₂e</span>
                  </span>
                  <span className="text-[10px] text-emerald-400/80">
                    {brsr?.offsetTonnes > 0 ? `Incl. -${brsr.offsetTonnes} t avoided recycling` : 'Audit Ready'}
                  </span>
                </div>
              </div>

              {/* Two Column Statutory Export Sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. SEBI BRSR CORE CARD */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between space-y-4 hover:border-emerald-500/30 transition">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 rounded-lg bg-teal-950/60 border border-teal-600/40 text-teal-300">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <h4 className="text-sm font-semibold text-white">SEBI BRSR Core Disclosures</h4>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        Principle 6
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Mandatory Environmental Disclosures for top listed Indian enterprises and value chain partners (SEBI Circular 2023). Covers Essential Indicators 7 (GHG) and 8 (Energy).
                    </p>

                    <div className="mt-3.5 space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-800/80">
                        <span className="text-slate-400">Turnover Basis:</span>
                        <span className="text-slate-200 font-medium">₹ {brsr?.turnoverCrore} Crore</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/80">
                        <span className="text-slate-400">GHG Intensity:</span>
                        <span className="text-emerald-400 font-mono font-medium">{brsr?.ghgIntensityPerCrore} tCO₂e / ₹ Cr</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Energy Intensity:</span>
                        <span className="text-teal-300 font-mono font-medium">{brsr?.energy?.energyIntensityPerCrore} GJ / ₹ Cr</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() => handleDownload('brsr/pdf', `${company?.companyName || 'SME'}_SEBI_BRSR_Core.pdf`, 'brsr_pdf')}
                      disabled={downloadingFormat === 'brsr_pdf'}
                      className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-900/30 transition disabled:opacity-50"
                    >
                      {downloadingFormat === 'brsr_pdf' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      <span>Download Official BRSR Core Report (PDF)</span>
                    </button>

                    <button
                      onClick={() => handleDownload('brsr/excel', `${company?.companyName || 'SME'}_SEBI_BRSR_Core.xlsx`, 'brsr_xlsx')}
                      disabled={downloadingFormat === 'brsr_xlsx'}
                      className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition disabled:opacity-50"
                    >
                      {downloadingFormat === 'brsr_xlsx' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      )}
                      <span>Download Multi-Sheet BRSR Template (Excel)</span>
                    </button>
                  </div>
                </div>

                {/* 2. EU CBAM EXPORT CARD */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between space-y-4 hover:border-cyan-500/30 transition">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 rounded-lg bg-blue-950/60 border border-blue-600/40 text-blue-300">
                          <Globe className="w-4 h-4" />
                        </div>
                        <h4 className="text-sm font-semibold text-white">EU CBAM Export Declarations</h4>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-700/40">
                        Reg (EU) 2023/956
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Structured reporting for Indian exporters of <strong>Steel, Aluminum, and Cement</strong> to EU buyers during the CBAM transitional registry phase.
                    </p>

                    <div className="mt-3.5 space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-800/80">
                        <span className="text-slate-400">Reporting Period:</span>
                        <span className="text-slate-200 font-medium">{cbam?.reportingPeriod || '2024-Q3'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/80">
                        <span className="text-slate-400">Covered Goods:</span>
                        <span className="text-cyan-400 font-medium">{cbam?.goods?.length || 1} CN Line Item(s)</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">CEA Grid Benchmark:</span>
                        <span className="text-slate-300 font-mono font-medium">{cbam?.defaultGridFactor} kg CO₂/kWh</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() => handleDownload('cbam/xml', `${company?.companyName || 'SME'}_EU_CBAM_Registry.xml`, 'cbam_xml')}
                      disabled={downloadingFormat === 'cbam_xml'}
                      className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-900/30 transition disabled:opacity-50"
                    >
                      {downloadingFormat === 'cbam_xml' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      <span>Download EU Transitional Registry (XML)</span>
                    </button>

                    <button
                      onClick={() => handleDownload('cbam/csv', `${company?.companyName || 'SME'}_EU_CBAM_Goods.csv`, 'cbam_csv')}
                      disabled={downloadingFormat === 'cbam_csv'}
                      className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition disabled:opacity-50"
                    >
                      {downloadingFormat === 'cbam_csv' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                      )}
                      <span>Download Importer Communication (CSV)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Complete Audit Ledger CSV Button */}
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-700/40 text-emerald-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-white">Full CarbonIQ Activity Audit Ledger (CSV)</h5>
                    <p className="text-[11px] text-slate-400">
                      Complete line-by-line verification trace containing factor IDs, Leontief direct/upstream splits, and exact mathematical formulas.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleDownload('export/csv', `${company?.companyName || 'SME'}_CarbonIQ_Audit_Ledger.csv`, 'audit_csv')}
                  disabled={downloadingFormat === 'audit_csv'}
                  className="shrink-0 flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium border border-slate-700 transition disabled:opacity-50"
                >
                  {downloadingFormat === 'audit_csv' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>Export Full Ledger CSV</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:px-6 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Aligned with SEBI BRSR Core, EU CBAM (2023/956), CEA 2024 & EXIOBASE 3.11.2</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
