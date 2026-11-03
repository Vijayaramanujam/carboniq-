import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Upload,
  RefreshCw,
  FileText,
  Eye,
  Info,
  Calendar,
  Layers,
  Lock,
  Zap,
  Flame,
  Truck,
  Recycle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Calculator,
  ShieldCheck,
  TrendingDown,
  ExternalLink,
  Download,
  CheckSquare,
  Square,
  Search,
  Filter,
} from 'lucide-react';
import { getPreviewUrl, submitDocumentReview, downloadDocumentReportPDF } from '../services/api.js';
import { ProcessingStatusBadge, ReviewStatusBadge, RelevanceBadge, ScopeBadge } from './StatusBadge.jsx';
import { calculateLocalEmissions } from '../utils/carbonEmissionCalculator.js';
import { ReductionPlanner } from './ReductionPlanner.jsx';

function defaultScopeForCategory(cat) {
  switch (cat) {
    case 'ELECTRICITY': return 'SCOPE_2';
    case 'FUEL': return 'SCOPE_1';
    case 'TRANSPORTATION': return 'SCOPE_3';
    case 'WASTE': return 'SCOPE_3';
    default: return 'SCOPE_3';
  }
}

function defaultUnitForCategory(cat) {
  switch (cat) {
    case 'ELECTRICITY': return 'kWh';
    case 'FUEL': return 'Liters';
    case 'TRANSPORTATION': return 'km';
    case 'WASTE': return 'kg';
    default: return 'units';
  }
}

export function DocumentReviewModal({
  document,
  isOpen,
  onClose,
  onSaved,
  onTriggerReupload,
  onTriggerReprocess,
}) {
  const isPermanentlyReviewed = document ? (document.reviewStatus === 'APPROVED' || document.reviewStatus === 'REJECTED') : false;

  // The document data is unclear / not discoverable if:
  const isDataUnclearOrUndiscoverable =
    Boolean(document) && !isPermanentlyReviewed && (
      document.processingStatus === 'NEEDS_REVIEW' ||
      document.processingStatus === 'FAILED' ||
      document.reviewStatus === 'REQUIRED' ||
      document.carbonRelevance === 'UNCERTAIN' ||
      !document.extractedFields?.quantity ||
      !document.extractedFields?.unit ||
      Boolean(document.validationErrors && document.validationErrors.length > 0) ||
      !document.extractedText ||
      document.extractedText.trim().length === 0
    );

  const [category, setCategory] = useState('ELECTRICITY');
  const [scope, setScope] = useState('SCOPE_2');
  const [activityDate, setActivityDate] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [description, setDescription] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [transportMode, setTransportMode] = useState('');
  const [wasteType, setWasteType] = useState('');
  const [disposalMethod, setDisposalMethod] = useState('');

  const isMultiScope = Boolean(document?.scope === 'MULTI_SCOPE' || (document?.lineItems && document.lineItems.length > 0));
  const [lineItems, setLineItems] = useState([]);
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerScopeFilter, setLedgerScopeFilter] = useState('');

  const [saving, setSaving] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [activeTab, setActiveTab] = useState(isMultiScope ? 'LEDGER' : 'FIELDS'); // 'LEDGER' | 'FIELDS' | 'TEXT' | 'PREVIEW'
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [suggestedEmissions, setSuggestedEmissions] = useState(null);

  const handleDownloadPdf = async () => {
    if (!document?._id) return;
    try {
      setDownloadingPdf(true);
      await downloadDocumentReportPDF(document._id, document.originalFileName);
    } catch (err) {
      console.error('Failed to download document PDF certificate:', err);
      alert(err.message || 'Failed to download certificate');
    } finally {
      setDownloadingPdf(false);
    }
  };

  useEffect(() => {
    if (document) {
      if (document.lineItems && document.lineItems.length > 0) {
        setLineItems(JSON.parse(JSON.stringify(document.lineItems)));
        setActiveTab('LEDGER');
      } else {
        setLineItems([]);
        setActiveTab('FIELDS');
      }

      const f = document.extractedFields || {};
      const cat = f.category || (document.documentType === 'FUEL_RECEIPT' ? 'FUEL' : 'ELECTRICITY');
      setCategory(cat);
      setScope(f.scope || (document.scope && document.scope.startsWith('SCOPE_') ? document.scope : defaultScopeForCategory(cat)));
      setQuantity(f.quantity != null ? String(f.quantity) : '');
      setUnit(f.unit || defaultUnitForCategory(cat));
      setSupplierName(f.supplierName || '');
      setDescription(f.description || '');

      if (f.activityDate) {
        const d = new Date(f.activityDate);
        if (!isNaN(d.getTime())) {
          setActivityDate(d.toISOString().split('T')[0]);
        }
      } else {
        setActivityDate(new Date().toISOString().split('T')[0]);
      }

      const cd = f.categoryData || {};
      setFuelType(cd.fuelType || '');
      setTransportMode(cd.transportMode || '');
      setWasteType(cd.wasteType || '');
      setDisposalMethod(cd.disposalMethod || '');

      setValidationErrors(document.validationErrors || []);
      setErrorMessage(null);
    }
  }, [document]);

  // Dynamically recalculate suggested carbon emissions according to verified emission factor models
  useEffect(() => {
    const calc = calculateLocalEmissions({
      category,
      scope,
      quantity,
      unit,
      fuelType,
      transportMode,
      wasteType,
      disposalMethod,
      supplierName,
      description,
    });
    setSuggestedEmissions(calc);
  }, [category, scope, quantity, unit, fuelType, transportMode, wasteType, disposalMethod, supplierName, description]);

  const multiScopeMetrics = React.useMemo(() => {
    if (!isMultiScope || !lineItems || lineItems.length === 0) {
      return { s1: 0, s2: 0, s3: 0, offset: 0, net: 0, includedCount: 0, total: 0 };
    }
    let s1 = 0, s2 = 0, s3 = 0, offset = 0, includedCount = 0;
    for (const item of lineItems) {
      if (item.isIncluded !== false) {
        includedCount++;
        const e = item.emissions || {};
        const kg = Number(e.emissionsKg || 0);
        if (e.isNegativeOffset || kg < 0) {
          offset += Math.abs(kg);
        } else {
          if (item.scope === 'SCOPE_1') s1 += kg;
          else if (item.scope === 'SCOPE_2') s2 += kg;
          else s3 += kg;
        }
      }
    }
    const net = Math.max(0, (s1 + s2 + s3) - offset);
    return {
      s1: Number(s1.toFixed(2)),
      s2: Number(s2.toFixed(2)),
      s3: Number(s3.toFixed(2)),
      offset: Number(offset.toFixed(2)),
      net: Number(net.toFixed(2)),
      includedCount,
      total: lineItems.length,
    };
  }, [isMultiScope, lineItems]);

  const handleToggleRowIncluded = (index) => {
    if (isPermanentlyReviewed) return;
    setLineItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        isIncluded: next[index].isIncluded === false ? true : false,
      };
      return next;
    });
  };

  const handleToggleAllRows = (includeAll) => {
    if (isPermanentlyReviewed) return;
    setLineItems((prev) =>
      prev.map((item) => ({ ...item, isIncluded: includeAll }))
    );
  };

  const handleRowFieldChange = (index, field, value) => {
    if (isPermanentlyReviewed) return;
    setLineItems((prev) => {
      const next = [...prev];
      const item = { ...next[index], [field]: value };

      if (field === 'category') {
        item.scope = defaultScopeForCategory(value);
        if (!item.unit || item.unit === 'unit' || item.unit === 'units') {
          item.unit = defaultUnitForCategory(value);
        }
      }

      const qtyNum = parseFloat(field === 'quantity' ? value : item.quantity);
      if (!isNaN(qtyNum) && qtyNum > 0) {
        const calc = calculateLocalEmissions({
          category: item.category,
          scope: item.scope,
          quantity: qtyNum,
          unit: item.unit,
          fuelType: item.categoryData?.fuelType,
          transportMode: item.categoryData?.transportMode,
          wasteType: item.categoryData?.wasteType,
          disposalMethod: item.categoryData?.disposalMethod,
          supplierName: item.supplierName,
          description: item.description,
        });

        if (calc && calc.isValid) {
          item.emissions = {
            emissionsKg: calc.emissionsKg,
            emissionsTonnes: calc.emissionsTonnes,
            factorUsed: calc.factorUsed,
            factorUnit: calc.factorUnit,
            calculationFormula: calc.formula,
            isNegativeOffset: calc.isNegativeOffset,
            tier: calc.tier,
          };
          item.validationErrors = [];
        }
      }

      next[index] = item;
      return next;
    });
  };

  const getCategoryIcon = () => {
    if (category === 'WASTE') {
      return disposalMethod === 'Recycled' ? (
        <Recycle className="w-4 h-4 text-[#62dd9e]" />
      ) : (
        <Recycle className="w-4 h-4 text-purple-400" />
      );
    }
    if (category === 'FUEL') return <Flame className="w-4 h-4 text-amber-400" />;
    if (category === 'TRANSPORTATION') return <Truck className="w-4 h-4 text-sky-400" />;
    if (category === 'ELECTRICITY') return <Zap className="w-4 h-4 text-[#b5f568]" />;
    return <Calculator className="w-4 h-4 text-[#62dd9e]" />;
  };

  const handleCategoryChange = (newCat) => {
    setCategory(newCat);
    setUnit(defaultUnitForCategory(newCat));
    setScope(defaultScopeForCategory(newCat));
  };

  const handleApprove = async () => {
    if (isPermanentlyReviewed) return;
    setSaving(true);
    setErrorMessage(null);

    try {
      let payload;
      if (isMultiScope) {
        if (multiScopeMetrics.includedCount === 0) {
          setErrorMessage('Cannot record 0 activities. Please include at least one valid row in the ledger.');
          setSaving(false);
          return;
        }
        payload = {
          action: 'APPROVED',
          lineItems,
        };
      } else {
        const correctedFields = {
          category,
          scope,
          activityDate: activityDate ? new Date(activityDate) : null,
          quantity: parseFloat(quantity),
          unit: unit.trim(),
          supplierName: supplierName.trim(),
          description: description.trim(),
          categoryData: {
            fuelType,
            transportMode,
            wasteType,
            disposalMethod,
          },
        };
        payload = {
          action: 'APPROVED',
          correctedFields,
        };
      }

      const res = await submitDocumentReview(document._id, payload);

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to verify and record activity');
        if (res.validationErrors) {
          setValidationErrors(res.validationErrors);
        }
        return;
      }

      if (onSaved) onSaved(res.document);
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Error recording activity to ledger');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!window.confirm('Are you sure you want to reject this document from carbon accounting?')) {
      return;
    }

    setSaving(true);
    try {
      const res = await submitDocumentReview(document._id, {
        action: 'REJECTED',
      });
      if (onSaved) onSaved(res.document);
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Error rejecting document');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !document) return null;

  const previewUrl = getPreviewUrl(document._id);
  const isImage = document.mimeType?.startsWith('image/');
  const isPdf = document.mimeType === 'application/pdf';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[#030906]/90 backdrop-blur-md overflow-y-auto">
      <div className={`bg-[#071610] border-2 border-[#62dd9e]/40 rounded-2xl w-full ${isMultiScope ? 'max-w-7xl' : 'max-w-6xl'} shadow-[0_24px_80px_rgba(0,0,0,0.9),0_0_48px_rgba(98,221,158,0.2)] flex flex-col max-h-[92vh] overflow-hidden relative animate-modal-enter`}>
        {/* Top Specular Rim */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#b5f568] to-transparent z-20 pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:px-6 border-b border-[#62dd9e]/20 bg-[#091f16] backdrop-blur-xl">
          <div className="flex items-center space-x-3.5 min-w-0">
            <div className="p-2.5 rounded-xl bg-[#0e2a1e] border border-[#b5f568]/50 text-[#b5f568] shadow-[0_0_16px_rgba(181,245,104,0.3)] shrink-0">
              <FileText className="w-5 h-5 text-[#b5f568]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-white truncate max-w-md font-mono tracking-tight">
                {document.originalFileName}
              </h3>
              <div className="flex items-center space-x-2 mt-1 flex-wrap gap-1">
                <RelevanceBadge relevance={document.carbonRelevance} />
                {document.reviewStatus === 'REQUIRED' ? (
                  <ReviewStatusBadge status="REQUIRED" />
                ) : (
                  <ProcessingStatusBadge status={document.processingStatus} />
                )}
                <ScopeBadge scope={isMultiScope ? 'MULTI_SCOPE' : scope} multiScopeSummary={document.multiScopeSummary || multiScopeMetrics} />
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {isDataUnclearOrUndiscoverable && (
              <>
                <button
                  type="button"
                  onClick={() => onTriggerReupload(document)}
                  className="hidden sm:flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-[#142d1f] hover:bg-[#1b3d2b] text-[#b5f568] border border-[#b5f568]/50 shadow-[0_0_12px_rgba(181,245,104,0.2)] transition cursor-pointer"
                  title="Upload a clearer file replacement"
                >
                  <Upload className="w-3.5 h-3.5 text-[#b5f568]" />
                  <span>Re-upload Clearer</span>
                </button>
                <button
                  type="button"
                  onClick={() => onTriggerReprocess(document)}
                  className="hidden sm:flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-[#0d2218] hover:bg-[#143324] text-[#62dd9e] hover:text-white border border-[#62dd9e]/40 transition cursor-pointer"
                  title="Re-run automated extraction"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#62dd9e]" />
                  <span>Re-extract</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-[#9aada2] hover:text-white hover:bg-white/[0.08] transition cursor-pointer"
              aria-label="Close review dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {isMultiScope ? (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-[#05110c]">
            {/* Multi-Scope Tabs */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-[#62dd9e]/20 bg-[#071a12]">
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('LEDGER')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                    activeTab === 'LEDGER'
                      ? 'bg-[#122e1f] text-[#b5f568] border border-[#b5f568]/50 shadow-[0_0_14px_rgba(181,245,104,0.25)]'
                      : 'text-[#9aada2] hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-[#62dd9e]" />
                  <span>Consolidated Ledger ({lineItems.length} Activities)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('PREVIEW')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                    activeTab === 'PREVIEW'
                      ? 'bg-[#122e1f] text-[#b5f568] border border-[#b5f568]/50 shadow-[0_0_14px_rgba(181,245,104,0.25)]'
                      : 'text-[#9aada2] hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5 text-[#62dd9e]" />
                  <span>Document Preview</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('TEXT')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                    activeTab === 'TEXT'
                      ? 'bg-[#122e1f] text-[#b5f568] border border-[#b5f568]/50 shadow-[0_0_14px_rgba(181,245,104,0.25)]'
                      : 'text-[#9aada2] hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-[#62dd9e]" />
                  <span>Raw Extracted Data</span>
                </button>
              </div>

              <div className="flex items-center space-x-2 text-xs font-mono text-[#9aada2]">
                <span className="hidden sm:inline">Active Boundary:</span>
                <span className="text-[#b5f568] font-bold">
                  {multiScopeMetrics.includedCount} of {multiScopeMetrics.total} Rows Included
                </span>
              </div>
            </div>

            {/* Permanent Decision Lock Banner */}
            {isPermanentlyReviewed && (
              <div className="mx-6 mt-4 p-3.5 rounded-xl bg-[#0d261a] border border-[#62dd9e]/40 text-[#d8e6de] text-xs font-mono flex items-center space-x-2.5 shadow-sm">
                <Lock className="w-4 h-4 text-[#62dd9e] shrink-0" />
                <span>
                  This consolidated multi-scope document has been permanently <strong>{document.reviewStatus}</strong>. Decisions cannot be altered.
                </span>
              </div>
            )}

            {errorMessage && (
              <div className="mx-6 mt-4 p-3.5 rounded-xl bg-[#260e12] border border-rose-500/50 text-rose-200 text-xs font-mono">
                {errorMessage}
              </div>
            )}

            {/* Multi-Scope Body Area */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5">
              {activeTab === 'LEDGER' && (
                <>
                  {/* Executive Metric Cards: Scope 1, Scope 2, Scope 3, Offset, Net Footprint */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {/* Scope 1 */}
                    <div className="p-3.5 rounded-xl bg-[#092217] border border-emerald-500/30 relative overflow-hidden group">
                      <div className="flex items-center justify-between text-[11px] font-mono text-emerald-300 font-semibold mb-1">
                        <span className="flex items-center space-x-1">
                          <Flame className="w-3.5 h-3.5 text-amber-400" />
                          <span>Scope 1 (Direct)</span>
                        </span>
                      </div>
                      <div className="text-lg sm:text-xl font-bold font-mono text-white">
                        +{multiScopeMetrics.s1.toLocaleString()} <span className="text-xs text-emerald-400">kg</span>
                      </div>
                      <div className="text-[10px] text-[#9aada2] mt-0.5 truncate">
                        Fleet & On-site Fuels
                      </div>
                    </div>

                    {/* Scope 2 */}
                    <div className="p-3.5 rounded-xl bg-[#072027] border border-sky-500/30 relative overflow-hidden group">
                      <div className="flex items-center justify-between text-[11px] font-mono text-sky-300 font-semibold mb-1">
                        <span className="flex items-center space-x-1">
                          <Zap className="w-3.5 h-3.5 text-sky-400" />
                          <span>Scope 2 (Grid)</span>
                        </span>
                      </div>
                      <div className="text-lg sm:text-xl font-bold font-mono text-white">
                        +{multiScopeMetrics.s2.toLocaleString()} <span className="text-xs text-sky-400">kg</span>
                      </div>
                      <div className="text-[10px] text-[#9aada2] mt-0.5 truncate">
                        CEA Grid (0.82 kg/kWh)
                      </div>
                    </div>

                    {/* Scope 3 */}
                    <div className="p-3.5 rounded-xl bg-[#1b122e] border border-purple-500/30 relative overflow-hidden group">
                      <div className="flex items-center justify-between text-[11px] font-mono text-purple-300 font-semibold mb-1">
                        <span className="flex items-center space-x-1">
                          <Truck className="w-3.5 h-3.5 text-purple-400" />
                          <span>Scope 3 (Supply)</span>
                        </span>
                      </div>
                      <div className="text-lg sm:text-xl font-bold font-mono text-white">
                        +{multiScopeMetrics.s3.toLocaleString()} <span className="text-xs text-purple-400">kg</span>
                      </div>
                      <div className="text-[10px] text-[#9aada2] mt-0.5 truncate">
                        Freight & Spend
                      </div>
                    </div>

                    {/* Offsets */}
                    <div className="p-3.5 rounded-xl bg-[#0c2419] border border-teal-500/30 relative overflow-hidden group">
                      <div className="flex items-center justify-between text-[11px] font-mono text-teal-300 font-semibold mb-1">
                        <span className="flex items-center space-x-1">
                          <Recycle className="w-3.5 h-3.5 text-teal-400" />
                          <span>Avoided Offsets</span>
                        </span>
                      </div>
                      <div className="text-lg sm:text-xl font-bold font-mono text-emerald-400">
                        -{multiScopeMetrics.offset.toLocaleString()} <span className="text-xs text-emerald-300">kg</span>
                      </div>
                      <div className="text-[10px] text-[#9aada2] mt-0.5 truncate">
                        Recycling Savings
                      </div>
                    </div>

                    {/* Net Total */}
                    <div className="col-span-2 md:col-span-1 p-3.5 rounded-xl bg-gradient-to-br from-[#0c2e1f] to-[#081a13] border-2 border-[#b5f568]/50 shadow-[0_0_20px_rgba(181,245,104,0.15)] relative overflow-hidden group">
                      <div className="flex items-center justify-between text-[11px] font-mono text-[#b5f568] font-bold mb-1">
                        <span className="flex items-center space-x-1">
                          <Sparkles className="w-3.5 h-3.5 text-[#b5f568]" />
                          <span>Net Footprint</span>
                        </span>
                      </div>
                      <div className="text-lg sm:text-xl font-black font-mono text-[#b5f568]">
                        +{multiScopeMetrics.net.toLocaleString()} <span className="text-xs text-white">kg</span>
                      </div>
                      <div className="text-[10px] text-[#9aada2] mt-0.5">
                        Net CO2e Total
                      </div>
                    </div>
                  </div>

                  {/* Filter and Control Toolbar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#071a13] border border-white/[0.08]">
                    <div className="flex items-center space-x-2 flex-wrap gap-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9aada2]" />
                        <input
                          type="text"
                          placeholder="Filter rows by vendor or description..."
                          value={ledgerSearch}
                          onChange={(e) => setLedgerSearch(e.target.value)}
                          className="pl-8 pr-3 py-1.5 rounded-lg bg-[#030c08] border border-white/[0.1] text-xs text-white placeholder-[#9aada2]/50 w-56 focus:outline-none focus:border-[#b5f568]"
                        />
                      </div>

                      <select
                        value={ledgerScopeFilter}
                        onChange={(e) => setLedgerScopeFilter(e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#030c08] border border-white/[0.1] text-xs text-white focus:outline-none focus:border-[#b5f568]"
                      >
                        <option value="">All Scopes (S1/S2/S3)</option>
                        <option value="SCOPE_1">Scope 1 (Direct)</option>
                        <option value="SCOPE_2">Scope 2 (Electricity)</option>
                        <option value="SCOPE_3">Scope 3 (Supply/Spend)</option>
                      </select>
                    </div>

                    {!isPermanentlyReviewed && (
                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleAllRows(true)}
                          className="px-2.5 py-1 rounded-lg bg-[#122e1f] text-[#b5f568] hover:bg-[#1b422d] border border-[#b5f568]/30 text-[11px] font-mono transition cursor-pointer"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleAllRows(false)}
                          className="px-2.5 py-1 rounded-lg bg-[#1f1216] text-[#fca5a5] hover:bg-[#2e1920] border border-rose-500/30 text-[11px] font-mono transition cursor-pointer"
                        >
                          Deselect All
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Interactive Ledger Table */}
                  <div className="border border-[#62dd9e]/20 rounded-xl overflow-hidden bg-[#030c08]">
                    <div className="overflow-x-auto max-h-[440px]">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-[#091f16] text-[#9aada2] uppercase text-[10px] font-mono tracking-wider sticky top-0 z-10 border-b border-[#62dd9e]/20">
                          <tr>
                            <th className="py-2.5 px-3 w-10 text-center">Inc.</th>
                            <th className="py-2.5 px-2 w-10 text-center">#</th>
                            <th className="py-2.5 px-3">Scope Boundary</th>
                            <th className="py-2.5 px-3">Activity Category</th>
                            <th className="py-2.5 px-3">Description & Counterparty</th>
                            <th className="py-2.5 px-3">Quantity & Unit</th>
                            <th className="py-2.5 px-3 text-right">Calculated CO2e</th>
                            <th className="py-2.5 px-3 w-16 text-center">Audit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.06]">
                          {lineItems
                            .filter((item) => {
                              if (ledgerScopeFilter && item.scope !== ledgerScopeFilter) return false;
                              if (ledgerSearch) {
                                const q = ledgerSearch.toLowerCase();
                                const mDesc = item.description?.toLowerCase().includes(q);
                                const mSupp = item.supplierName?.toLowerCase().includes(q);
                                if (!mDesc && !mSupp) return false;
                              }
                              return true;
                            })
                            .map((item, originalIdx) => {
                              const isIncluded = item.isIncluded !== false;
                              const isOffset = item.emissions?.isNegativeOffset || (item.emissions?.emissionsKg != null && item.emissions.emissionsKg < 0);
                              const hasErrors = item.validationErrors && item.validationErrors.length > 0;

                              return (
                                <tr
                                  key={item.rowNumber || originalIdx}
                                  className={`transition-colors ${
                                    !isIncluded
                                      ? 'opacity-40 bg-[#060e0a]'
                                      : originalIdx % 2 === 0
                                      ? 'bg-[#040d09] hover:bg-[#0c2419]'
                                      : 'bg-[#030906] hover:bg-[#0c2419]'
                                  }`}
                                >
                                  {/* Checkbox Toggle */}
                                  <td className="py-3 px-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={isIncluded}
                                      disabled={isPermanentlyReviewed}
                                      onChange={() => handleToggleRowIncluded(originalIdx)}
                                      className="rounded bg-[#081a13] border-white/20 text-[#b5f568] focus:ring-0 focus:ring-offset-0 cursor-pointer w-4 h-4"
                                    />
                                  </td>

                                  {/* Row # */}
                                  <td className="py-3 px-2 text-center font-mono text-[11px] text-[#9aada2]">
                                    {item.rowNumber || originalIdx + 1}
                                  </td>

                                  {/* Scope Dropdown */}
                                  <td className="py-3 px-3 whitespace-nowrap">
                                    <select
                                      value={item.scope || 'SCOPE_3'}
                                      disabled={isPermanentlyReviewed || !isIncluded}
                                      onChange={(e) => handleRowFieldChange(originalIdx, 'scope', e.target.value)}
                                      className="bg-[#0b2419] border border-[#62dd9e]/30 rounded-lg px-2 py-1 text-[11px] font-mono font-bold text-white focus:outline-none focus:border-[#b5f568] cursor-pointer disabled:opacity-50"
                                    >
                                      <option value="SCOPE_1">Scope 1 (Direct)</option>
                                      <option value="SCOPE_2">Scope 2 (Electricity)</option>
                                      <option value="SCOPE_3">Scope 3 (Supply Chain)</option>
                                    </select>
                                  </td>

                                  {/* Category Dropdown */}
                                  <td className="py-3 px-3 whitespace-nowrap">
                                    <select
                                      value={item.category || 'SUPPLIER_INVOICE'}
                                      disabled={isPermanentlyReviewed || !isIncluded}
                                      onChange={(e) => handleRowFieldChange(originalIdx, 'category', e.target.value)}
                                      className="bg-[#0b2419] border border-[#62dd9e]/30 rounded-lg px-2 py-1 text-[11px] font-mono text-[#d8e6de] focus:outline-none focus:border-[#b5f568] cursor-pointer disabled:opacity-50"
                                    >
                                      <option value="ELECTRICITY">Electricity</option>
                                      <option value="FUEL">Fuel</option>
                                      <option value="TRANSPORTATION">Transportation</option>
                                      <option value="WASTE">Waste & Recycling</option>
                                      <option value="SUPPLIER_INVOICE">Supplier Spend</option>
                                    </select>
                                  </td>

                                  {/* Description & Counterparty */}
                                  <td className="py-3 px-3 min-w-[200px]">
                                    <input
                                      type="text"
                                      value={item.description || ''}
                                      disabled={isPermanentlyReviewed || !isIncluded}
                                      onChange={(e) => handleRowFieldChange(originalIdx, 'description', e.target.value)}
                                      placeholder="Description..."
                                      className="w-full bg-[#030906] border border-white/[0.1] rounded px-2 py-1 text-xs text-white truncate focus:outline-none focus:border-[#b5f568] disabled:bg-transparent disabled:border-0"
                                    />
                                    <div className="flex items-center space-x-1.5 mt-1">
                                      <input
                                        type="text"
                                        value={item.supplierName || ''}
                                        disabled={isPermanentlyReviewed || !isIncluded}
                                        onChange={(e) => handleRowFieldChange(originalIdx, 'supplierName', e.target.value)}
                                        placeholder="Vendor/Supplier"
                                        className="w-full bg-transparent border-0 text-[10px] text-[#9aada2] px-1 py-0 truncate focus:outline-none focus:text-white"
                                      />
                                    </div>
                                  </td>

                                  {/* Quantity & Unit */}
                                  <td className="py-3 px-3 whitespace-nowrap">
                                    <div className="flex items-center space-x-1">
                                      <input
                                        type="number"
                                        step="any"
                                        value={item.quantity != null ? item.quantity : ''}
                                        disabled={isPermanentlyReviewed || !isIncluded}
                                        onChange={(e) => handleRowFieldChange(originalIdx, 'quantity', e.target.value)}
                                        className="w-20 bg-[#030906] border border-white/[0.12] rounded px-2 py-1 text-xs font-mono text-white text-right focus:outline-none focus:border-[#b5f568] disabled:bg-transparent disabled:border-0"
                                      />
                                      <input
                                        type="text"
                                        value={item.unit || ''}
                                        disabled={isPermanentlyReviewed || !isIncluded}
                                        onChange={(e) => handleRowFieldChange(originalIdx, 'unit', e.target.value)}
                                        className="w-16 bg-[#030906] border border-white/[0.12] rounded px-1.5 py-1 text-[11px] font-mono text-[#b5f568] focus:outline-none focus:border-[#b5f568] disabled:bg-transparent disabled:border-0"
                                      />
                                    </div>
                                  </td>

                                  {/* Emissions Pill */}
                                  <td className="py-3 px-3 text-right whitespace-nowrap">
                                    <span
                                      className={`inline-flex items-center px-2 py-1 rounded text-xs font-mono font-bold ${
                                        isOffset
                                          ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/50'
                                          : 'bg-[#0f2e20] text-[#b5f568] border border-[#b5f568]/40'
                                      }`}
                                      title={item.emissions?.calculationFormula || ''}
                                    >
                                      {item.emissions?.emissionsKg != null
                                        ? `${item.emissions.emissionsKg > 0 ? '+' : ''}${item.emissions.emissionsKg} kg`
                                        : '0 kg'}
                                    </span>
                                    {isOffset && (
                                      <span className="block text-[9px] text-emerald-400 font-mono mt-0.5">
                                        Offset Credit
                                      </span>
                                    )}
                                  </td>

                                  {/* Status / Warnings */}
                                  <td className="py-3 px-3 text-center whitespace-nowrap">
                                    {hasErrors ? (
                                      <span
                                        className="text-amber-400 cursor-help"
                                        title={item.validationErrors.join(', ')}
                                      >
                                        <AlertTriangle className="w-4 h-4 inline" />
                                      </span>
                                    ) : (
                                      <span className="text-emerald-400">
                                        <CheckCircle className="w-4 h-4 inline opacity-60" />
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {/* Preview Tab for Multi-Scope */}
              {activeTab === 'PREVIEW' && (
                <div className="flex flex-col items-center justify-center min-h-[460px] bg-[#020704] border-2 border-[#62dd9e]/40 p-4 relative">
                  {isImage ? (
                    <img src={previewUrl} alt={document.originalFileName} className="max-h-[500px] object-contain" />
                  ) : isPdf ? (
                    <iframe src={previewUrl} title="PDF Preview" className="w-full h-[520px] bg-white border-0" />
                  ) : (
                    <div className="text-center p-8 text-[#9aada2] text-xs font-mono">
                      <FileText className="w-12 h-12 text-[#62dd9e]/40 mx-auto mb-2" />
                      <p>Multi-scope file preview ({document.mimeType}).</p>
                      <p className="mt-1 text-[#71857c]">Inspect all structured row ledger data in the Consolidated Ledger tab.</p>
                      <a
                        href={previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center space-x-1 text-[#b5f568] hover:underline"
                      >
                        <span>Download/Open Original File</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Raw Extracted Data Tab for Multi-Scope */}
              {activeTab === 'TEXT' && (
                <div className="bg-[#030c08] border border-[#62dd9e]/30 rounded-xl p-4 font-mono text-xs text-[#a8bcaf] whitespace-pre-wrap max-h-[500px] overflow-y-auto">
                  {document.extractedText || JSON.stringify(document.extractedFields, null, 2)}
                </div>
              )}
            </div>
          </div>
        ) : (
        /* Content Body: Split View */
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-[#05110c]">
          {/* Left Column: Original Document Preview (6 cols) */}
          <div className="lg:col-span-6 border-b lg:border-b-0 lg:border-r border-[#62dd9e]/20 p-4 sm:p-5 bg-[#030c08] flex flex-col overflow-y-auto min-h-0 space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-[#62dd9e]/20 text-xs font-mono text-[#9aada2]">
              <div className="flex items-center space-x-2">
                <Eye className="w-4 h-4 text-[#62dd9e]" />
                <span className="font-bold text-white uppercase tracking-wider text-[11px]">Technical Document Preview</span>
              </div>
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[#b5f568] hover:underline flex items-center space-x-1 text-[11px] font-mono font-medium"
              >
                <span>Open in new tab</span>
                <ExternalLink className="w-3 h-3 text-[#b5f568]" />
              </a>
            </div>

            {/* Document Preview Frame: SHARP EDGES FOR THIS SITUATION */}
            <div className="flex-1 flex items-center justify-center min-h-[380px] bg-[#020704] rounded-none border-2 border-[#62dd9e]/40 shadow-[0_0_24px_rgba(98,221,158,0.15)] p-0 overflow-hidden relative group">
              {/* Corner Reticle Accents for Technical Drafting Effect */}
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#b5f568] z-10 pointer-events-none" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#b5f568] z-10 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#b5f568] z-10 pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#b5f568] z-10 pointer-events-none" />

              {isImage ? (
                <img
                  src={previewUrl}
                  alt={document.originalFileName}
                  className="max-h-[520px] w-auto max-w-full object-contain rounded-none block"
                />
              ) : isPdf ? (
                <iframe
                  src={previewUrl}
                  title="PDF Preview"
                  className="w-full h-[520px] rounded-none border-0 bg-white block"
                />
              ) : (
                <div className="text-center p-8 text-[#9aada2] text-xs font-mono">
                  <FileText className="w-12 h-12 text-[#62dd9e]/40 mx-auto mb-2" />
                  <p>Document preview not supported for {document.mimeType}.</p>
                  <p className="mt-1 text-[#71857c]">Inspect parsed contents in the Raw Extracted Text tab.</p>
                </div>
              )}
            </div>

            {/* Classification explanation */}
            {document.classificationReason && (
              <div className="p-3.5 rounded-xl bg-[#092217] border border-[#62dd9e]/30 text-xs text-[#d8e6de] shadow-sm shrink-0">
                <div className="flex items-center space-x-1.5 text-[#b5f568] font-mono font-bold uppercase tracking-wider text-[11px] mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#b5f568]" />
                  <span>Classification Determination</span>
                </div>
                <p className="leading-relaxed text-[#a8bcaf]">{document.classificationReason}</p>
              </div>
            )}
          </div>

          {/* Right Column: Editable Extracted Fields & Validation (6 cols) */}
          <div className="lg:col-span-6 p-4 sm:p-6 overflow-y-auto min-h-0 space-y-4 bg-[#071911]">
            {/* Tab Selector */}
            <div className="flex space-x-2 border-b border-[#62dd9e]/20 pb-3">
              <button
                type="button"
                onClick={() => setActiveTab('FIELDS')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  activeTab === 'FIELDS'
                    ? 'bg-[#122e1f] text-[#b5f568] border border-[#b5f568]/50 shadow-[0_0_14px_rgba(181,245,104,0.25)]'
                    : 'text-[#9aada2] hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                Extracted Fields & Verification
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('TEXT')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  activeTab === 'TEXT'
                    ? 'bg-[#122e1f] text-[#b5f568] border border-[#b5f568]/50 shadow-[0_0_14px_rgba(181,245,104,0.25)]'
                    : 'text-[#9aada2] hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                Raw Extracted Text
              </button>
            </div>

            {/* Permanent Decision Lock Banner */}
            {isPermanentlyReviewed && (
              <div className="p-3.5 rounded-xl bg-[#0d261a] border border-[#62dd9e]/40 text-[#d8e6de] text-xs font-mono flex items-center space-x-2.5 shadow-sm">
                <Lock className="w-4 h-4 text-[#62dd9e] shrink-0" />
                <span>
                  This document has been permanently <strong>{document.reviewStatus}</strong>. Decisions cannot be altered.
                </span>
              </div>
            )}

            {/* Unified Verification Advisory Alert Banner */}
            {!isPermanentlyReviewed && (isDataUnclearOrUndiscoverable || validationErrors.length > 0) && (
              <div className="p-4 rounded-xl bg-[#14281c] border border-amber-500/50 text-amber-200 text-xs shadow-lg space-y-2.5 animate-fade-in">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-bold text-amber-300 font-mono tracking-tight uppercase text-[11px]">
                        Verification Advisory
                      </div>
                      <p className="text-amber-200/85 text-[11px] mt-0.5 leading-relaxed">
                        Review highlighted activity fields below. If the scan is blurry or skewed, upload a clearer replacement or re-run autonomous extraction.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 sm:hidden">
                    <button
                      type="button"
                      onClick={() => onTriggerReupload(document)}
                      className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      title="Re-upload"
                    >
                      <Upload className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {validationErrors.length > 0 && (
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-300/95 pl-1 font-mono">
                    {validationErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-[#260e12] border border-rose-500/50 text-rose-200 text-xs font-mono">
                {errorMessage}
              </div>
            )}

            {activeTab === 'FIELDS' ? (
              <fieldset disabled={isPermanentlyReviewed} className="space-y-4 disabled:opacity-75">
                {/* Category & Scope Selector Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-[#7dd9a3] mb-1.5 font-semibold">
                      Activity Category <span className="text-[#b5f568]">*</span>
                    </label>
                    <select
                      value={category}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#030c08] border border-[#62dd9e]/30 text-xs font-mono text-white focus:outline-none focus:border-[#b5f568] focus:ring-2 focus:ring-[#b5f568]/40 transition-all disabled:opacity-50"
                    >
                      <option value="ELECTRICITY">Electricity / Power (Scope 2)</option>
                      <option value="FUEL">Stationary / Mobile Fuel (Scope 1)</option>
                      <option value="TRANSPORTATION">Transportation & Freight (Scope 1 / 3)</option>
                      <option value="WASTE">Waste & Disposal (Scope 3)</option>
                      <option value="SUPPLIER_INVOICE">General Supplier Invoice / Spend</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-[#7dd9a3] mb-1.5 font-semibold">
                      GHG Protocol Scope <span className="text-[#b5f568]">*</span>
                    </label>
                    <select
                      value={scope}
                      onChange={(e) => setScope(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#030c08] border border-[#62dd9e]/30 text-xs font-mono text-[#b5f568] font-bold focus:outline-none focus:border-[#b5f568] focus:ring-2 focus:ring-[#b5f568]/40 transition-all disabled:opacity-50"
                    >
                      <option value="SCOPE_1">Scope 1 (Direct Fuel / Fleet Emissions)</option>
                      <option value="SCOPE_2">Scope 2 (Indirect Electricity Emissions)</option>
                      <option value="SCOPE_3">Scope 3 (Supply Chain, Freight, Waste)</option>
                    </select>
                  </div>
                </div>

                {/* Date & Quantity Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-[#7dd9a3] mb-1.5 font-semibold">
                      Activity Date / Period <span className="text-[#b5f568]">*</span>
                    </label>
                    <input
                      type="date"
                      value={activityDate}
                      onChange={(e) => setActivityDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#030c08] border border-[#62dd9e]/30 text-xs font-mono text-white focus:outline-none focus:border-[#b5f568] focus:ring-2 focus:ring-[#b5f568]/40 transition-all disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-[#7dd9a3] mb-1.5 font-semibold">
                      Quantity & Unit <span className="text-[#b5f568]">*</span>
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        step="any"
                        placeholder="e.g. 1450"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="w-2/3 px-3.5 py-2.5 rounded-xl bg-[#030c08] border border-[#62dd9e]/30 text-xs font-mono text-white focus:outline-none focus:border-[#b5f568] focus:ring-2 focus:ring-[#b5f568]/40 transition-all disabled:opacity-50"
                      />
                      <input
                        type="text"
                        placeholder="kWh, L"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        className="w-1/3 px-3.5 py-2.5 rounded-xl bg-[#030c08] border border-[#62dd9e]/30 text-xs font-mono text-[#b5f568] font-bold uppercase focus:outline-none focus:border-[#b5f568] focus:ring-2 focus:ring-[#b5f568]/40 transition-all disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>

                {/* Supplier & Description */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-[#7dd9a3] mb-1.5 font-semibold">
                      Supplier / Vendor Name {category === 'SUPPLIER_INVOICE' && <span className="text-[#b5f568]">*</span>}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Tata Power / Indian Oil"
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#030c08] border border-[#62dd9e]/30 text-xs font-mono text-white focus:outline-none focus:border-[#b5f568] focus:ring-2 focus:ring-[#b5f568]/40 transition-all disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-[#7dd9a3] mb-1.5 font-semibold">
                      Description / Notes
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Factory monthly consumption"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#030c08] border border-[#62dd9e]/30 text-xs font-mono text-white focus:outline-none focus:border-[#b5f568] focus:ring-2 focus:ring-[#b5f568]/40 transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Category-Specific Dynamic Fields */}
                {category === 'FUEL' && (
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-[#7dd9a3] mb-1.5 font-semibold">
                      Fuel Type <span className="text-[#b5f568]">*</span>
                    </label>
                    <select
                      value={fuelType}
                      onChange={(e) => setFuelType(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#030c08] border border-[#62dd9e]/30 text-xs font-mono text-white focus:outline-none focus:border-[#b5f568] focus:ring-2 focus:ring-[#b5f568]/40 transition-all disabled:opacity-50"
                    >
                      <option value="">Select fuel type...</option>
                      <option value="Diesel">Diesel (High Speed Diesel)</option>
                      <option value="Petrol / Gasoline">Petrol / Gasoline</option>
                      <option value="Natural Gas (CNG)">Natural Gas (CNG)</option>
                      <option value="LPG">LPG</option>
                      <option value="Heavy Fuel Oil">Furnace Oil / HFO</option>
                    </select>
                  </div>
                )}

                {category === 'TRANSPORTATION' && (
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-[#7dd9a3] mb-1.5 font-semibold">
                      Transportation Mode <span className="text-[#b5f568]">*</span>
                    </label>
                    <select
                      value={transportMode}
                      onChange={(e) => setTransportMode(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#030c08] border border-[#62dd9e]/30 text-xs font-mono text-white focus:outline-none focus:border-[#b5f568] focus:ring-2 focus:ring-[#b5f568]/40 transition-all disabled:opacity-50"
                    >
                      <option value="">Select mode...</option>
                      <option value="Road / Truck">Road Freight / Truck</option>
                      <option value="Air Freight">Air Freight</option>
                      <option value="Sea Freight">Sea Freight</option>
                      <option value="Rail">Rail Cargo</option>
                    </select>
                  </div>
                )}

                {category === 'WASTE' && (
                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-mono uppercase tracking-wider text-[#7dd9a3] mb-1.5 font-semibold">
                        Waste Type <span className="text-[#b5f568]">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Hazardous, Scrap"
                        value={wasteType}
                        onChange={(e) => setWasteType(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#030c08] border border-[#62dd9e]/30 text-xs font-mono text-white focus:outline-none focus:border-[#b5f568] focus:ring-2 focus:ring-[#b5f568]/40 transition-all disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono uppercase tracking-wider text-[#7dd9a3] mb-1.5 font-semibold">
                        Disposal Method
                      </label>
                      <select
                        value={disposalMethod}
                        onChange={(e) => setDisposalMethod(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#030c08] border border-[#62dd9e]/30 text-xs font-mono text-white focus:outline-none focus:border-[#b5f568] focus:ring-2 focus:ring-[#b5f568]/40 transition-all disabled:opacity-50"
                      >
                        <option value="Landfill">Landfill</option>
                        <option value="Recycled">Recycled</option>
                        <option value="Incineration">Incineration</option>
                        <option value="Composted">Composted</option>
                      </select>
                    </div>
                  </div>
                )}
              </fieldset>
            ) : (
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[#7dd9a3] mb-2 font-semibold">
                  Raw Extracted Text (Autonomous OCR)
                </label>
                <textarea
                  readOnly
                  value={document.extractedText || 'No text content available.'}
                  rows={12}
                  className="w-full p-3.5 rounded-xl bg-[#030c08] font-mono text-xs text-[#d8e6de] border border-[#62dd9e]/30 focus:outline-none leading-relaxed"
                />
              </div>
            )}

            {/* SUGGESTED CARBON EMISSIONS PANEL */}
            <div
              className={`rounded-2xl border-2 p-4 sm:p-5 shadow-xl transition-all duration-300 relative overflow-hidden shrink-0 ${
                suggestedEmissions?.isNegativeOffset
                  ? 'border-[#62dd9e] bg-gradient-to-br from-[#0e2a1d] to-[#06140e]'
                  : 'border-[#62dd9e]/40 bg-gradient-to-br from-[#0a2317] via-[#071910] to-[#040d08]'
              }`}
            >
              {/* Top rim */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#b5f568] to-transparent" />

              {/* Panel Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#62dd9e]/20 mb-3">
                <div className="flex items-center space-x-2.5">
                  <div
                    className={`p-2 rounded-xl border ${
                      suggestedEmissions?.isNegativeOffset
                        ? 'bg-[#0f2d1e] border-[#62dd9e]/50 text-[#62dd9e]'
                        : 'bg-[#102d1e] border-[#b5f568]/50 text-[#b5f568] shadow-[0_0_12px_rgba(181,245,104,0.3)]'
                    }`}
                  >
                    {getCategoryIcon()}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center space-x-1.5 font-mono">
                      <span>Suggested Carbon Footprint</span>
                    </h4>
                    <p className="text-[10px] text-[#7dd9a3] font-mono">
                      {suggestedEmissions?.standard || 'GHG Protocol & CEA India Baseline'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {suggestedEmissions?.isNegativeOffset ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#122b1f] text-[#62dd9e] border border-[#62dd9e]/40">
                      Avoided Emissions
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#102d1e] text-[#d8e6de] border border-[#62dd9e]/30">
                      {suggestedEmissions?.tier || 'IPCC Tier 1'}
                    </span>
                  )}
                  <ScopeBadge scope={scope} />
                </div>
              </div>

              {/* Main Emission Metric */}
              {suggestedEmissions?.isValid ? (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                    <div className="flex items-baseline space-x-2">
                      <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-[#b5f568] drop-shadow-[0_0_12px_rgba(181,245,104,0.3)]">
                        {(suggestedEmissions?.emissionsKg || 0) > 0
                          ? `+${Number(suggestedEmissions?.emissionsKg || 0).toLocaleString()}`
                          : Number(suggestedEmissions?.emissionsKg || 0).toLocaleString()}
                      </span>
                      <span className="text-xs font-bold text-[#b5f568] font-mono">kg CO₂e</span>
                      <span className="text-xs text-[#7dd9a3] font-mono">
                        ({(suggestedEmissions?.emissionsTonnes || 0) > 0
                          ? `+${suggestedEmissions.emissionsTonnes}`
                          : (suggestedEmissions?.emissionsTonnes || 0)} tCO₂e)
                      </span>
                    </div>

                    {suggestedEmissions.isNegativeOffset ? (
                      <div className="text-[11px] font-mono text-[#62dd9e] flex items-center space-x-1">
                        <TrendingDown className="w-3.5 h-3.5" />
                        <span>Net footprint offset</span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-[#7dd9a3] font-mono">
                        Factor:{' '}
                        <span className="text-white font-semibold">
                          {suggestedEmissions.factorUsed} {suggestedEmissions.factorUnit}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Formula Pill */}
                  <div className="px-3.5 py-2 rounded-xl bg-[#030c08] border border-[#62dd9e]/30 text-[11px] font-mono text-[#d8e6de] flex items-center justify-between gap-2 overflow-x-auto">
                    <div className="flex items-center space-x-2">
                      <Calculator className="w-3.5 h-3.5 text-[#b5f568] shrink-0" />
                      <span className="text-[#7dd9a3]">Formula:</span>
                      <span className="text-[#b5f568] font-medium">{suggestedEmissions.formula}</span>
                    </div>
                  </div>

                  {/* Layer 2 EEIO Breakdown (Direct vs Upstream) */}
                  {suggestedEmissions.directKg != null && suggestedEmissions.upstreamKg != null && (
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono p-2.5 rounded-xl bg-[#030c08] border border-[#62dd9e]/30">
                      <div className="flex flex-col">
                        <span className="text-[#71857c] text-[10px]">Direct Sector Footprint:</span>
                        <span className="text-[#38bdf8] font-semibold">{Number(suggestedEmissions.directKg).toLocaleString()} kg CO₂e</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[#71857c] text-[10px]">Upstream Leontief Tier N:</span>
                        <span className="text-[#62dd9e] font-semibold">{Number(suggestedEmissions.upstreamKg).toLocaleString()} kg CO₂e</span>
                      </div>
                    </div>
                  )}

                  {/* Layer 3 LCA Refinement Hotspot Alert */}
                  {suggestedEmissions.isHotspotCandidate && (
                    <div className="flex items-start space-x-2 text-[11px] text-amber-300 bg-[#14281c] border border-amber-500/50 p-2.5 rounded-xl font-mono">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-amber-200">Layer 3 LCA Refinement Hotspot Candidate</div>
                        <div className="text-[10px] text-amber-300/80 mt-0.5 leading-snug">
                          This spend item exceeds Scope 3 Pareto thresholds. Replace financial proxy with supplier EPD (Environmental Product Declaration) or Bill of Materials when available.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sustainability Insight / Tip */}
                  {suggestedEmissions.insights && !suggestedEmissions.isHotspotCandidate && (
                    <div className="flex items-start space-x-2 text-[11px] text-[#7dd9a3] bg-[#0c2419] border border-[#62dd9e]/30 px-3 py-2 rounded-xl font-mono">
                      <Sparkles className="w-3.5 h-3.5 text-[#b5f568] shrink-0 mt-0.5" />
                      <span className="leading-snug">{suggestedEmissions.insights}</span>
                    </div>
                  )}
                  {/* Expandable Methodology Drawer */}
                  <div className="pt-0.5">
                    <button
                      type="button"
                      onClick={() => setDetailsExpanded(!detailsExpanded)}
                      className="text-[10px] font-mono text-[#7dd9a3] hover:text-white flex items-center space-x-1 transition cursor-pointer"
                    >
                      <span>Statutory Factor Provenance & IPCC Alignment</span>
                      {detailsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    {detailsExpanded && (
                      <div className="mt-2 p-3 rounded-xl bg-[#030c08] border border-[#62dd9e]/30 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono">
                        <div>
                          <span className="text-[#71857c] block">Authoritative Source:</span>
                          <span className="text-[#d8e6de] font-medium">{suggestedEmissions.sourceName}</span>
                        </div>
                        <div>
                          <span className="text-[#71857c] block">Accounting Tier:</span>
                          <span className="text-[#d8e6de] font-medium">{suggestedEmissions.tier}</span>
                        </div>
                        <div>
                          <span className="text-[#71857c] block">Applicable Standard:</span>
                          <span className="text-[#d8e6de] font-medium">{suggestedEmissions.standard}</span>
                        </div>
                        <div>
                          <span className="text-[#71857c] block">Ledger Target:</span>
                          <span className="text-[#62dd9e] font-medium flex items-center space-x-1">
                            <ShieldCheck className="w-3 h-3 text-[#62dd9e]" />
                            <span>Verified Sovereign ESG Activity Record</span>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-3 text-xs text-[#7dd9a3] py-1 font-mono">
                  <Info className="w-4 h-4 text-[#b5f568] shrink-0" />
                  <p className="text-[11px] leading-relaxed">
                    Enter activity quantity (e.g.{' '}
                    <strong className="text-white">518 kWh</strong> for electricity,{' '}
                    <strong className="text-white">100 Liters</strong> for fuel) to view real-time statutory carbon emissions calculated against national baselines.
                  </p>
                </div>
              )}
            </div>

            {/* Decarbonization & Emission Reduction Planner */}
            <ReductionPlanner
              category={category}
              scope={scope}
              quantity={quantity}
              unit={unit}
              emissionsKg={suggestedEmissions?.emissionsKg || 0}
              fuelType={fuelType}
              transportMode={transportMode}
              wasteType={wasteType}
              disposalMethod={disposalMethod}
              supplierName={supplierName}
            />
          </div>
        </div>
        )}

        {/* Modal Actions Footer: Full-Width Pinned Footer Bar */}
        <div className="p-4 sm:px-6 border-t-2 border-[#62dd9e]/30 bg-[#091f16] flex flex-wrap items-center justify-between gap-3 shrink-0 z-20">
          <div className="flex items-center space-x-2.5">
            {isPermanentlyReviewed ? (
              <div className="flex items-center space-x-2 text-[#7dd9a3] text-xs font-mono mr-2">
                <Lock className="w-3.5 h-3.5 text-[#62dd9e]" />
                <span>Permanent status: <strong className="text-white">{document.reviewStatus}</strong></span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleReject}
                disabled={saving}
                className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-[#2b0d11] hover:bg-[#3d1318] text-[#fca5a5] border border-rose-500/40 text-xs font-mono font-bold transition cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject Document</span>
              </button>
            )}

            {/* Individual Document Verification Certificate (PDF) */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-[#12281e] hover:bg-[#1a382b] text-[#b5f568] hover:text-white border border-[#b5f568]/40 hover:border-[#b5f568] text-xs font-mono font-semibold transition shadow-md cursor-pointer"
              title="Download Individual Document GHG Verification Certificate (PDF)"
            >
              {downloadingPdf ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#b5f568]" />
              ) : (
                <Download className="w-3.5 h-3.5 text-[#b5f568]" />
              )}
              <span>Audit Certificate (PDF)</span>
            </button>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl bg-[#0d2218] hover:bg-[#143324] text-[#d8e6de] hover:text-white border border-[#62dd9e]/30 text-xs font-mono font-medium transition cursor-pointer"
            >
              {isPermanentlyReviewed ? 'Close' : 'Cancel'}
            </button>
            {!isPermanentlyReviewed && (
              <button
                type="button"
                onClick={handleApprove}
                disabled={saving || (isMultiScope && multiScopeMetrics.includedCount === 0)}
                className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#b5f568] to-[#62dd9e] hover:from-[#c5fa82] hover:to-[#73e8ac] text-[#05110c] hover:shadow-[0_0_28px_rgba(181,245,104,0.5)] hover:scale-[1.02] active:scale-[0.98] text-xs font-mono font-extrabold transition shadow-md cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#05110c]" />
                    <span>Recording...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 text-[#05110c]" />
                    <span>
                      {isMultiScope
                        ? `Verify & Record All ${multiScopeMetrics.includedCount} Activities`
                        : 'Verify & Record Activity'}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DocumentReviewModal;
