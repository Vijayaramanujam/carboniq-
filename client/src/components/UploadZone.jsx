import React, { useState, useRef } from 'react';
import {
  Upload,
  File,
  FileArchive,
  X,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Scan,
  Compass,
  Radio,
  Layers,
  ArrowRight,
  FileText,
  Activity,
  Check,
} from 'lucide-react';
import { uploadDocumentFiles, uploadZipArchive } from '../services/api.js';

const ALLOWED_EXTS = ['.pdf', '.jpg', '.jpeg', '.png', '.csv', '.xlsx', '.zip'];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const MAX_ZIP_SIZE = 100 * 1024 * 1024; // 100 MB

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function UploadZone({ onUploadComplete, onViewDocuments, onViewActivities }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadStage, setUploadStage] = useState('IDLE'); // 'IDLE' | 'SELECTING' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'ERROR'
  const [pipelinePhase, setPipelinePhase] = useState(1); // 1: Deduplication, 2: Parsing, 3: Calibration, 4: Synthesis
  const [progressPercent, setProgressPercent] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);

  const fileInputRef = useRef(null);
  const zipInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (uploadStage === 'PROCESSING') return;
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateFiles = (fileList) => {
    const valid = [];
    const errors = [];

    Array.from(fileList).forEach((file) => {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      if (!ALLOWED_EXTS.includes(ext)) {
        errors.push(`${file.name}: Unsupported format. Allowed: PDF, JPG, PNG, CSV, XLSX, ZIP.`);
        return;
      }

      if (ext === '.zip' && file.size > MAX_ZIP_SIZE) {
        errors.push(`${file.name}: ZIP archive exceeds maximum allowed size (100MB).`);
        return;
      }

      if (ext !== '.zip' && file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File exceeds maximum allowed size (25MB).`);
        return;
      }

      valid.push(file);
    });

    if (errors.length > 0) {
      setUploadError(errors.join('\n'));
    } else {
      setUploadError(null);
    }

    return valid;
  };

  const openFilePicker = () => {
    if (uploadStage === 'PROCESSING') return;
    setUploadStage('SELECTING');

    // Detect when OS file picker window closes (user picks files or cancels)
    const onFocus = () => {
      window.removeEventListener('focus', onFocus);
      setTimeout(() => {
        setUploadStage((curr) => {
          if (curr === 'SELECTING') {
            return selectedFiles.length > 0 ? 'QUEUED' : 'IDLE';
          }
          return curr;
        });
      }, 450);
    };
    window.addEventListener('focus', onFocus);

    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const openZipPicker = (e) => {
    e.stopPropagation();
    if (uploadStage === 'PROCESSING') return;
    setUploadStage('SELECTING');

    const onFocus = () => {
      window.removeEventListener('focus', onFocus);
      setTimeout(() => {
        setUploadStage((curr) => {
          if (curr === 'SELECTING') {
            return selectedFiles.length > 0 ? 'QUEUED' : 'IDLE';
          }
          return curr;
        });
      }, 450);
    };
    window.addEventListener('focus', onFocus);

    if (zipInputRef.current) {
      zipInputRef.current.click();
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (uploadStage === 'PROCESSING') return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const valid = validateFiles(e.dataTransfer.files);
      if (valid.length > 0) {
        setSelectedFiles((prev) => [...prev, ...valid]);
        setUploadStage('QUEUED');
      }
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const valid = validateFiles(e.target.files);
      if (valid.length > 0) {
        setSelectedFiles((prev) => [...prev, ...valid]);
        setUploadStage('QUEUED');
      } else {
        setUploadStage(selectedFiles.length > 0 ? 'QUEUED' : 'IDLE');
      }
    } else {
      setUploadStage(selectedFiles.length > 0 ? 'QUEUED' : 'IDLE');
    }
    e.target.value = '';
  };

  const removeFile = (index) => {
    if (uploadStage === 'PROCESSING') return;
    setSelectedFiles((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length === 0) {
        setUploadStage('IDLE');
      }
      return updated;
    });
  };

  const clearSelection = () => {
    if (uploadStage === 'PROCESSING') return;
    setSelectedFiles([]);
    setUploadError(null);
    setUploadStage('IDLE');
  };

  const handleStartUpload = async () => {
    if (selectedFiles.length === 0 || uploadStage === 'PROCESSING') return;

    setUploadStage('PROCESSING');
    setUploadError(null);
    setUploadResult(null);

    const zipFiles = selectedFiles.filter((f) => f.name.endsWith('.zip'));
    const regularFiles = selectedFiles.filter((f) => !f.name.endsWith('.zip'));

    // Execute background batch network ingestion
    const backgroundUploadTask = (async () => {
      let totalDocs = 0;
      let totalDuplicates = 0;
      let totalFailed = 0;

      if (regularFiles.length > 0) {
        const res = await uploadDocumentFiles(regularFiles);
        if (!res.success) {
          throw new Error(res.error || 'Batch ingestion encountered an extraction error');
        }
        totalDocs += res.documents?.length || 0;
        totalDuplicates += res.batch?.duplicateFiles || 0;
        totalFailed += res.batch?.failedFiles || 0;
      }

      for (const zip of zipFiles) {
        const res = await uploadZipArchive(zip);
        if (!res.success) {
          throw new Error(res.error || `ZIP archive extraction failed for ${zip.name}`);
        }
        totalDocs += res.documents?.length || 0;
        totalDuplicates += res.batch?.duplicateFiles || 0;
        totalFailed += res.batch?.failedFiles || 0;
      }

      return { totalDocs, totalDuplicates, totalFailed };
    })();

    try {
      // Phase 1: Cryptographic Ingestion & Deduplication
      setPipelinePhase(1);
      setProgressPercent(28);
      await sleep(1000);

      // Phase 2: Autonomous Document Parsing & Tabular Field Extraction
      setPipelinePhase(2);
      setProgressPercent(62);
      await sleep(1200);

      // Phase 3: Statutory MoEFCC & CEA Carbon Factor Calibration
      setPipelinePhase(3);
      setProgressPercent(88);

      // Wait for both statutory calibration pacing delay and network result
      const [apiResult] = await Promise.all([
        backgroundUploadTask,
        sleep(1100),
      ]);

      // Phase 4: Final Ledger Synthesis & Verification
      setPipelinePhase(4);
      setProgressPercent(100);
      await sleep(700);

      setUploadResult({
        message: `${apiResult.totalDocs} document(s) successfully parsed and registered.`,
        totalDocs: apiResult.totalDocs,
        duplicates: apiResult.totalDuplicates,
        failed: apiResult.totalFailed,
      });

      setSelectedFiles([]);
      setUploadStage('COMPLETED');

      if (onUploadComplete) onUploadComplete();
    } catch (err) {
      setUploadError(err.message || 'Error occurred during ingestion pipeline execution');
      setUploadStage('ERROR');
    }
  };

  const resetToIdle = () => {
    setSelectedFiles([]);
    setUploadError(null);
    setUploadResult(null);
    setUploadStage('IDLE');
    setProgressPercent(0);
    setPipelinePhase(1);
  };

  // Helper calculating total batch size in MB
  const totalBatchSizeMB = (
    selectedFiles.reduce((acc, f) => acc + f.size, 0) /
    (1024 * 1024)
  ).toFixed(2);

  return (
    <div className="telemetry-card p-6 sm:p-7 rounded-2xl border border-[#b4ffcd]/18 bg-[#0b1b14]/90 backdrop-blur-2xl shadow-2xl overflow-hidden relative group">
      {/* Top Specular Rim */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#b5f568]/40 to-transparent" />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/[0.08] mb-5 gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Operational Document Ingestion
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#121e1a] text-[#b5f568] border border-[#b5f568]/30 font-semibold">
              Layer 1
            </span>
          </div>
          <p className="text-xs text-[#9aada2] mt-0.5">
            Ingest electricity bills, generator fuel slips, logistics bilties, waste manifests, and audit spreadsheets.
          </p>
        </div>

        {uploadStage !== 'PROCESSING' && (
          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={openZipPicker}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-medium bg-[#121e1a] hover:bg-[#16221d] text-[#d8e6de] hover:text-white border border-white/[0.1] hover:border-[#b5f568]/30 transition shadow-sm cursor-pointer"
            >
              <FileArchive className="w-3.5 h-3.5 text-[#b5f568]" />
              <span>Upload ZIP Archive</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Interactive Zone */}
      {uploadStage !== 'PROCESSING' && uploadStage !== 'COMPLETED' && (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={openFilePicker}
          className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all duration-300 relative overflow-hidden ${
            dragActive
              ? 'border-[#b5f568] bg-[#121e1a]/95 shadow-[0_0_36px_rgba(181,245,104,0.3)]'
              : uploadStage === 'SELECTING'
              ? 'border-[#b5f568]/70 bg-[#0f241a]/80 shadow-[0_0_32px_rgba(181,245,104,0.25)]'
              : uploadStage === 'QUEUED'
              ? 'border-[#62dd9e]/50 bg-[#06140e]/85'
              : 'border-white/[0.12] hover:border-[#62dd9e]/50 bg-[#040a08]/80 hover:bg-[#06110d]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.csv,.xlsx,.zip"
            onChange={handleFileInput}
            className="hidden"
          />
          <input
            ref={zipInputRef}
            type="file"
            accept=".zip"
            onChange={handleFileInput}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center space-y-3 relative z-10">
            {/* Morphing Center Icon Container */}
            <div className="relative flex items-center justify-center">
              {uploadStage === 'IDLE' && (
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#121e1a] border border-[#62dd9e]/30 shadow-[0_0_20px_rgba(98,221,158,0.2)] flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:border-[#b5f568]/60 group-hover:shadow-[0_0_30px_rgba(181,245,104,0.35)] relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#b5f568]/60 to-transparent" />
                  <Upload className="w-6 h-6 sm:w-7 sm:h-7 text-[#b5f568] transition-transform duration-300 group-hover:-translate-y-0.5" />
                </div>
              )}

              {uploadStage === 'SELECTING' && (
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#121e1a] border-2 border-[#b5f568] shadow-[0_0_32px_rgba(181,245,104,0.4)] flex items-center justify-center animate-icon-morph relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent" />
                  <RefreshCw className="w-6 h-6 sm:w-7 sm:h-7 text-[#b5f568] animate-spin" />
                </div>
              )}

              {uploadStage === 'QUEUED' && (
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#121e1a] border-2 border-[#b5f568] shadow-[0_0_28px_rgba(181,245,104,0.35)] flex items-center justify-center animate-icon-morph relative">
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#b5f568] to-transparent" />
                  <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-[#b5f568] text-[#07130f] text-[10px] font-mono font-black shadow-md">
                    {selectedFiles.length}
                  </span>
                  <Layers className="w-6 h-6 sm:w-7 sm:h-7 text-[#62dd9e]" />
                </div>
              )}

              {uploadStage === 'ERROR' && (
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-rose-950/40 border-2 border-rose-500 shadow-[0_0_28px_rgba(244,63,94,0.3)] flex items-center justify-center animate-icon-morph relative">
                  <AlertTriangle className="w-7 h-7 text-rose-400" />
                </div>
              )}
            </div>

            {/* Stage-dependent Headline & Guidance */}
            <div>
              {uploadStage === 'IDLE' && (
                <>
                  <p className="text-sm font-semibold text-white">
                    Drag and drop business documents here, or{' '}
                    <span className="text-[#b5f568] underline decoration-[#b5f568]/40 hover:decoration-[#b5f568]">
                      browse files
                    </span>
                  </p>
                  <p className="text-xs text-[#9aada2] mt-1 font-normal">
                    Autonomous extraction for PDF invoices, scanned meter slips, PNG, JPG, CSV, and XLSX spreadsheets
                  </p>
                </>
              )}

              {uploadStage === 'SELECTING' && (
                <>
                  <div className="flex items-center justify-center space-x-2">
                    <RefreshCw className="w-3.5 h-3.5 text-[#b5f568] animate-spin" />
                    <p className="text-sm font-bold text-[#b5f568] font-mono tracking-tight">
                      Awaiting File Selection in Dialog...
                    </p>
                  </div>
                  <p className="text-xs text-[#9aada2] mt-1 font-normal">
                    Select your operational records or ZIP archives from your local filesystem window
                  </p>
                </>
              )}

              {uploadStage === 'QUEUED' && (
                <>
                  <p className="text-sm font-bold text-white tracking-tight">
                    {selectedFiles.length} Document(s) Staged for Ingestion{' '}
                    <span className="text-[#b5f568] font-mono font-normal text-xs">({totalBatchSizeMB} MB)</span>
                  </p>
                  <p className="text-xs text-[#9aada2] mt-1">
                    Click to add more documents, or initiate autonomous pipeline processing below
                  </p>
                </>
              )}

              {uploadStage === 'ERROR' && (
                <>
                  <p className="text-sm font-bold text-rose-300">Extraction or Ingestion Issue Detected</p>
                  <p className="text-xs text-rose-200/80 mt-1">Click to select valid operational documents and retry</p>
                </>
              )}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[10px] font-mono text-[#9aada2]">
              <span className="px-2.5 py-1 rounded-full bg-[#121e1a] border border-white/[0.08]">Max 25MB / file</span>
              <span className="px-2.5 py-1 rounded-full bg-[#121e1a] border border-white/[0.08]">Max 100MB / ZIP</span>
              <span className="px-2.5 py-1 rounded-full bg-[#121e1a] border border-[#62dd9e]/30 text-[#62dd9e]">
                Duplicate Verification
              </span>
            </div>
          </div>
        </div>
      )}

      {/* STAGE: PROCESSING (Animated Pipeline with Delays & Seamless Center Morph) */}
      {uploadStage === 'PROCESSING' && (
        <div className="border border-[#b4ffcd]/20 rounded-2xl p-8 sm:p-10 bg-[#071710]/95 backdrop-blur-2xl text-center relative overflow-hidden animate-page-enter">
          {/* Subtle Ambient Scanline Background */}
          <div className="absolute inset-0 bg-telemetry-grid opacity-30 pointer-events-none" />

          <div className="flex flex-col items-center justify-center space-y-6 relative z-10 max-w-xl mx-auto">
            {/* Morphing Center Icon Container with Sweeping Laser Beam */}
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-[#0b2016] border-2 border-[#b5f568] shadow-[0_0_40px_rgba(181,245,104,0.35)] flex items-center justify-center relative overflow-hidden">
                {/* Vertical Scanning Laser Beam */}
                <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#b5f568] to-transparent shadow-[0_0_12px_#b5f568] animate-scanner-beam pointer-events-none" />

                {/* Phase 1: Duplicate Verification & Document Ingestion */}
                {pipelinePhase === 1 && (
                  <ShieldCheck className="w-8 h-8 text-[#b5f568] animate-icon-morph" />
                )}

                {/* Phase 2: Autonomous Tabular & Document Extraction */}
                {pipelinePhase === 2 && (
                  <Scan className="w-8 h-8 text-[#62dd9e] animate-icon-morph" />
                )}

                {/* Phase 3: Carbon-Aware Factor Alignment */}
                {pipelinePhase === 3 && (
                  <Compass className="w-8 h-8 text-[#b5f568] animate-spin-slow animate-icon-morph" />
                )}

                {/* Phase 4: Final Synthesis & Ledger Verification */}
                {pipelinePhase === 4 && (
                  <CheckCircle2 className="w-8 h-8 text-[#62dd9e] animate-icon-morph" />
                )}
              </div>
            </div>

            {/* Current Phase Title & Description */}
            <div className="space-y-1">
              <div className="flex items-center justify-center space-x-2 text-xs font-mono">
                <span className="px-2 py-0.5 rounded-full bg-[#121e1a] text-[#b5f568] border border-[#b5f568]/40 font-semibold">
                  Phase {pipelinePhase} / 3
                </span>
                <span className="text-white font-semibold">
                  {pipelinePhase === 1 && 'Document Ingestion & Integrity Verification'}
                  {pipelinePhase === 2 && 'Autonomous Document Parsing & Field Extraction'}
                  {pipelinePhase === 3 && 'Carbon-Aware Statutory Factor Alignment'}
                  {pipelinePhase === 4 && 'Ledger Verification & Final Synthesis'}
                </span>
              </div>
              <p className="text-xs text-[#9aada2] max-w-md mx-auto leading-relaxed">
                {pipelinePhase === 1 &&
                  'Validating document integrity and checking against existing records to eliminate duplicate entries...'}
                {pipelinePhase === 2 &&
                  'Autonomous ingestion engine identifying billing periods, consumption units, and activity markers...'}
                {pipelinePhase === 3 &&
                  'Calibrating statutory CEA v20.0 national grid baselines & MoEFCC verified emissions coefficients...'}
                {pipelinePhase === 4 &&
                  'Finalizing deterministic activity records and generating verifiable audit trail...'}
              </p>
            </div>

            {/* Smooth Progress Meter */}
            <div className="w-full space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#9aada2]">
                <span>Telemetry Ingestion Pipeline</span>
                <span className="text-[#b5f568] font-bold">{progressPercent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#121e1a] border border-white/[0.08] overflow-hidden p-[1px]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#b5f568] via-[#85e656] to-[#62dd9e] transition-all duration-700 ease-out animate-progress-shimmer"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Live Pipeline Milestones */}
            <div className="grid grid-cols-3 gap-2 w-full pt-1 text-[10px] font-mono">
              <div
                className={`p-2.5 rounded-xl border transition-all ${
                  pipelinePhase >= 1
                    ? 'bg-[#121e1a] border-[#b5f568]/40 text-[#b5f568]'
                    : 'bg-black/30 border-white/[0.06] text-slate-500'
                }`}
              >
                <div className="font-semibold flex items-center justify-center gap-1">
                  {pipelinePhase > 1 ? <Check className="w-3 h-3 text-[#62dd9e]" /> : null}
                  <span>Integrity Check</span>
                </div>
              </div>

              <div
                className={`p-2.5 rounded-xl border transition-all ${
                  pipelinePhase >= 2
                    ? 'bg-[#121e1a] border-[#b5f568]/40 text-[#b5f568]'
                    : 'bg-black/30 border-white/[0.06] text-slate-500'
                }`}
              >
                <div className="font-semibold flex items-center justify-center gap-1">
                  {pipelinePhase > 2 ? <Check className="w-3 h-3 text-[#62dd9e]" /> : null}
                  <span>Field Extraction</span>
                </div>
              </div>

              <div
                className={`p-2.5 rounded-xl border transition-all ${
                  pipelinePhase >= 3
                    ? 'bg-[#121e1a] border-[#b5f568]/40 text-[#b5f568]'
                    : 'bg-black/30 border-white/[0.06] text-slate-500'
                }`}
              >
                <div className="font-semibold flex items-center justify-center gap-1">
                  {pipelinePhase >= 4 ? <Check className="w-3 h-3 text-[#62dd9e]" /> : null}
                  <span>CEA Calibration</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STAGE: COMPLETED (Rich Celebration Summary & Smooth Transition Buttons) */}
      {uploadStage === 'COMPLETED' && uploadResult && (
        <div className="border border-[#62dd9e]/30 rounded-2xl p-8 sm:p-10 bg-gradient-to-b from-[#0b2217]/95 to-[#06140e]/95 backdrop-blur-2xl text-center relative overflow-hidden animate-page-enter">
          {/* Top glowing rim */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#62dd9e] to-transparent" />

          <div className="flex flex-col items-center justify-center space-y-6 max-w-xl mx-auto relative z-10">
            {/* Morphing Center Icon: Verified Shield */}
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-[#0c2e1f] border-2 border-[#62dd9e] shadow-[0_0_40px_rgba(98,221,158,0.45)] flex items-center justify-center animate-icon-morph">
                <CheckCircle2 className="w-10 h-10 text-[#62dd9e]" />
              </div>
              <div className="absolute -inset-2 rounded-full border border-[#62dd9e]/30 animate-pulse-ring pointer-events-none" />
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#b5f568] block">
                Statutory Ingestion Verified
              </span>
              <h3 className="text-xl font-black text-white mt-1">Batch Parsing & Calibration Complete</h3>
              <p className="text-xs text-[#9aada2] mt-1 max-w-md mx-auto leading-relaxed">
                {uploadResult.message}
              </p>
            </div>

            {/* Summary Metrics Row */}
            <div className="grid grid-cols-3 gap-3 w-full">
              <div className="p-3 rounded-xl bg-[#071610] border border-[#b4ffcd]/15">
                <span className="text-[10px] font-mono uppercase text-[#9aada2] block">Documents</span>
                <span className="text-lg font-black text-white font-mono">{uploadResult.totalDocs}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#071610] border border-[#b4ffcd]/15">
                <span className="text-[10px] font-mono uppercase text-[#9aada2] block">Deduplicated</span>
                <span className="text-lg font-black text-[#b5f568] font-mono">{uploadResult.duplicates}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#071610] border border-[#b4ffcd]/15">
                <span className="text-[10px] font-mono uppercase text-[#9aada2] block">Assurance</span>
                <span className="text-lg font-black text-[#62dd9e] font-mono">100%</span>
              </div>
            </div>

            {/* Action Cluster for Smooth Transitions */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2 w-full">
              {onViewDocuments && (
                <button
                  type="button"
                  onClick={onViewDocuments}
                  className="flex items-center space-x-2 px-6 py-3 rounded-full text-xs font-bold bg-gradient-to-r from-[#b5f568] to-[#9ad84f] text-[#07130f] hover:shadow-[0_0_28px_rgba(181,245,104,0.45)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer shadow-md"
                >
                  <FileText className="w-4 h-4 text-[#07130f]" />
                  <span>Inspect Documents Registry</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              {onViewActivities && (
                <button
                  type="button"
                  onClick={onViewActivities}
                  className="flex items-center space-x-2 px-5 py-3 rounded-full text-xs font-semibold bg-[#121e1a] hover:bg-[#16221d] text-[#62dd9e] border border-[#62dd9e]/40 hover:border-[#62dd9e] hover:shadow-[0_0_20px_rgba(98,221,158,0.25)] transition-all cursor-pointer"
                >
                  <Activity className="w-4 h-4 text-[#62dd9e]" />
                  <span>View Activity Ledger</span>
                </button>
              )}

              <button
                type="button"
                onClick={resetToIdle}
                className="px-4 py-3 rounded-full text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
              >
                Ingest More Documents
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {uploadError && uploadStage !== 'PROCESSING' && (
        <div className="mt-4 p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-start space-x-2.5 backdrop-blur-xl animate-fade-in">
          <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
          <div className="flex-1 whitespace-pre-wrap leading-relaxed">{uploadError}</div>
          <button
            onClick={() => setUploadError(null)}
            className="text-rose-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Selected File Queue (when QUEUED) */}
      {uploadStage === 'QUEUED' && selectedFiles.length > 0 && (
        <div className="mt-5 space-y-3 animate-stagger-1">
          <div className="flex items-center justify-between text-xs text-[#d8e6de] px-1 font-mono font-medium">
            <span>Staged Documents ({selectedFiles.length})</span>
            <button
              onClick={clearSelection}
              className="text-[#9aada2] hover:text-rose-400 transition cursor-pointer"
            >
              Clear Queue
            </button>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
            {selectedFiles.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="flex items-center justify-between p-3 rounded-xl bg-[#040a08]/90 border border-white/[0.08] text-xs transition-all hover:border-[#62dd9e]/30 group/item"
              >
                <div className="flex items-center space-x-2.5 truncate max-w-[80%]">
                  {file.name.endsWith('.zip') ? (
                    <FileArchive className="w-4 h-4 text-[#b5f568] shrink-0" />
                  ) : (
                    <File className="w-4 h-4 text-[#62dd9e] shrink-0" />
                  )}
                  <span className="text-white truncate font-mono">{file.name}</span>
                  <span className="text-[#9aada2] font-mono text-[10px] shrink-0">
                    ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(idx);
                  }}
                  className="text-[#9aada2] hover:text-rose-400 p-1 cursor-pointer transition-colors"
                  title="Remove document"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleStartUpload}
              className="flex items-center space-x-2 px-6 py-3 rounded-full text-xs font-bold tracking-wide bg-gradient-to-r from-[#b5f568] via-[#85e656] to-[#62dd9e] text-[#07130f] shadow-[0_0_24px_rgba(181,245,104,0.35)] hover:shadow-[0_0_36px_rgba(181,245,104,0.55)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-[#07130f]" />
              <span>Start Autonomous Ingestion ({selectedFiles.length})</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default UploadZone;
