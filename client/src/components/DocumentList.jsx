import React, { useState } from 'react';
import {
  FileText,
  Eye,
  Edit3,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Search,
  ExternalLink,
  Sparkles,
  Download,
} from 'lucide-react';
import { ProcessingStatusBadge, ReviewStatusBadge, RelevanceBadge, ScopeBadge } from './StatusBadge.jsx';
import { downloadDocumentReportPDF } from '../services/api.js';

export function DocumentList({
  documents,
  loading,
  onSelectDocument,
  onPreviewDocument,
}) {
  const [statusFilter, setStatusFilter] = useState('');
  const [relevanceFilter, setRelevanceFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadingDocId, setDownloadingDocId] = useState(null);

  const handleDownloadDocPdf = async (doc, e) => {
    e.stopPropagation();
    try {
      setDownloadingDocId(doc._id);
      await downloadDocumentReportPDF(doc._id, doc.originalFileName);
    } catch (err) {
      console.error('Failed to download document PDF certificate:', err);
      alert(err.message || 'Failed to download certificate');
    } finally {
      setDownloadingDocId(null);
    }
  };

  const filteredDocs = documents.filter((doc) => {
    if (statusFilter && doc.processingStatus !== statusFilter) return false;
    if (relevanceFilter && doc.carbonRelevance !== relevanceFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = doc.originalFileName.toLowerCase().includes(q);
      const matchType = doc.documentType?.toLowerCase().includes(q);
      const matchReason = doc.classificationReason?.toLowerCase().includes(q);
      const matchSupplier = doc.extractedFields?.supplierName?.toLowerCase().includes(q);
      if (!matchName && !matchType && !matchReason && !matchSupplier) return false;
    }
    return true;
  });

  return (
    <div className="telemetry-card p-6 sm:p-7 rounded-2xl border border-[#b4ffcd]/18 bg-[#0b1b14]/90 backdrop-blur-2xl shadow-2xl relative overflow-hidden space-y-5">
      {/* Top Specular Rim */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#b5f568]/40 to-transparent" />

      {/* Filters & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Ingested Documents Registry</h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#121e1a] text-[#62dd9e] border border-[#62dd9e]/30 font-semibold">
              {filteredDocs.length} of {documents.length}
            </span>
          </div>
          <p className="text-xs text-[#9aada2] mt-0.5">
            Deterministic OCR extraction with audit traceability and automated scope boundary allocation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9aada2]" />
            <input
              type="text"
              placeholder="Search filename or supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 rounded-full bg-[#040a08]/90 border border-white/[0.12] text-xs text-white placeholder-[#9aada2]/40 focus:outline-none focus:border-[#b5f568] focus:shadow-[0_0_16px_rgba(181,245,104,0.2)] w-48 sm:w-60 transition"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-full bg-[#040a08]/90 border border-white/[0.12] text-xs text-[#d8e6de] focus:outline-none focus:border-[#b5f568] transition cursor-pointer"
          >
            <option value="" className="bg-[#0b1b14]">All Statuses</option>
            <option value="NEEDS_REVIEW" className="bg-[#0b1b14]">Needs Review</option>
            <option value="COMPLETED" className="bg-[#0b1b14]">Completed</option>
            <option value="DUPLICATE" className="bg-[#0b1b14]">Duplicate</option>
            <option value="REJECTED" className="bg-[#0b1b14]">Rejected</option>
            <option value="FAILED" className="bg-[#0b1b14]">Failed</option>
          </select>

          {/* Relevance filter */}
          <select
            value={relevanceFilter}
            onChange={(e) => setRelevanceFilter(e.target.value)}
            className="px-3 py-2 rounded-full bg-[#040a08]/90 border border-white/[0.12] text-xs text-[#d8e6de] focus:outline-none focus:border-[#b5f568] transition cursor-pointer"
          >
            <option value="" className="bg-[#0b1b14]">All Relevance</option>
            <option value="RELEVANT" className="bg-[#0b1b14]">Carbon Relevant</option>
            <option value="IRRELEVANT" className="bg-[#0b1b14]">Irrelevant</option>
            <option value="UNCERTAIN" className="bg-[#0b1b14]">Uncertain</option>
          </select>
        </div>
      </div>

      {/* Documents Table */}
      {loading ? (
        <div className="py-20 text-center text-[#9aada2] text-sm flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-7 h-7 animate-spin text-[#b5f568]" />
          <span className="font-mono text-xs">Loading ingested documents registry...</span>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-white/[0.08] rounded-2xl bg-[#040a08]/60 p-8">
          <FileText className="w-10 h-10 text-slate-600 mx-auto mb-2 opacity-50" />
          <p className="text-white font-medium text-sm">No documents found matching criteria</p>
          <p className="text-[#9aada2] text-xs mt-1">Ingest operational receipts or clear the active search filter.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] text-[#9aada2] uppercase tracking-wider font-semibold text-[10px] font-mono bg-[#040a08]/60">
                <th className="py-3 px-3.5">Document</th>
                <th className="py-3 px-3.5">Classification</th>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5">Review</th>
                <th className="py-3 px-3.5">Extracted Summary</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {filteredDocs.map((doc, idx) => {
                const isDuplicate = doc.processingStatus === 'DUPLICATE';
                const isIrrelevant = doc.carbonRelevance === 'IRRELEVANT';
                const hasErrors = doc.validationErrors && doc.validationErrors.length > 0;

                return (
                  <tr
                    key={doc._id}
                    style={{ animationDelay: `${Math.min(idx * 45, 360)}ms` }}
                    className="hover:bg-[#121e1a]/80 transition-colors group cursor-pointer animate-item-enter"
                    onClick={() => onSelectDocument(doc)}
                  >
                    {/* Document Name & Meta */}
                    <td className="py-3.5 px-3.5 max-w-xs">
                      <div className="flex items-start space-x-2.5">
                        <FileText className="w-4 h-4 text-[#62dd9e] mt-0.5 shrink-0 group-hover:text-[#b5f568] transition-colors" />
                        <div className="truncate">
                          <div className="font-medium text-white truncate group-hover:text-[#b5f568] transition-colors" title={doc.originalFileName}>
                            {doc.originalFileName}
                          </div>
                          <div className="text-[10px] text-[#9aada2] flex items-center space-x-1.5 mt-0.5 font-mono">
                            <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
                            <span>&bull;</span>
                            <span>{doc.extractionMethod}</span>
                            {doc.parentDocumentId && (
                              <span className="text-[#b5f568] font-bold">(Replacement)</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Classification & Scope */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                          <RelevanceBadge relevance={doc.carbonRelevance} />
                          {doc.scope && (
                            <ScopeBadge scope={doc.scope} multiScopeSummary={doc.multiScopeSummary} />
                          )}
                        </div>
                        <div className="text-[11px] text-[#d8e6de] font-medium">
                          {doc.documentType?.replace(/_/g, ' ')}
                        </div>
                        {doc.classificationReason && (
                          <div className="text-[10px] text-[#9aada2] truncate max-w-xs" title={doc.classificationReason}>
                            {doc.classificationReason}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Processing Status */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      <div className="space-y-1">
                        <ProcessingStatusBadge status={doc.processingStatus} />
                        {hasErrors && (
                          <div className="text-[10px] text-rose-400 flex items-center space-x-1 mt-0.5 font-mono">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span>{doc.validationErrors.length} warning(s)</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Review Status */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      <ReviewStatusBadge status={doc.reviewStatus} />
                    </td>

                    {/* Extracted Summary */}
                    <td className="py-3.5 px-3.5">
                      {isDuplicate ? (
                        <span className="text-amber-300 italic font-mono text-[11px]">Identical duplicate file</span>
                      ) : isIrrelevant ? (
                        <span className="text-[#9aada2] italic text-[11px]">Non-carbon document</span>
                      ) : doc.scope === 'MULTI_SCOPE' || (doc.lineItems && doc.lineItems.length > 0) ? (
                        <div className="font-mono text-[#d8e6de] space-y-1">
                          <div className="flex items-center space-x-1.5 flex-wrap">
                            <span className="px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/40 text-[10px] font-bold">
                              {doc.multiScopeSummary?.totalRows || doc.lineItems?.length || 0} Ledger Items
                            </span>
                            {doc.multiScopeSummary?.distinctScopes?.length > 0 && (
                              <span className="text-[10px] text-[#9aada2]">
                                ({doc.multiScopeSummary.distinctScopes.map(s => s.replace('SCOPE_', 'S')).join(', ')})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 flex-wrap">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#121e1a] text-[#b5f568] border border-[#b5f568]/40">
                              &asymp; {doc.multiScopeSummary?.netKg != null ? `+${doc.multiScopeSummary.netKg}` : (doc.suggestedEmissions?.emissionsKg != null ? `+${doc.suggestedEmissions.emissionsKg}` : 0)} kg CO2e
                            </span>
                            {doc.multiScopeSummary?.offsetKg > 0 && (
                              <span className="text-[9px] text-emerald-400 font-mono">
                                (-{doc.multiScopeSummary.offsetKg} kg offset)
                              </span>
                            )}
                          </div>
                        </div>
                      ) : doc.extractedFields?.quantity ? (
                        <div className="font-mono text-[#d8e6de]">
                          <span className="font-bold text-white">{doc.extractedFields.quantity}</span>{' '}
                          <span className="text-[#b5f568]">{doc.extractedFields.unit}</span>
                          {doc.extractedFields.supplierName && (
                            <span className="block text-[#9aada2] text-[10px] truncate">
                              {doc.extractedFields.supplierName}
                            </span>
                          )}
                          {doc.suggestedEmissions?.emissionsKg != null && (
                            <div className="mt-1">
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${
                                  doc.suggestedEmissions.isNegativeOffset
                                    ? 'bg-[#121e1a] text-[#b5f568] border border-[#b5f568]/40'
                                    : 'bg-[#121e1a] text-[#62dd9e] border border-[#62dd9e]/30'
                                }`}
                                title={doc.suggestedEmissions.calculationFormula || 'Suggested emissions'}
                              >
                                &asymp; {doc.suggestedEmissions.emissionsKg > 0 ? `+${doc.suggestedEmissions.emissionsKg}` : doc.suggestedEmissions.emissionsKg} kg CO2e
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-amber-400/80 italic text-[11px]">Unextracted / Missing</span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3.5 px-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => onPreviewDocument(doc)}
                          className="p-2 rounded-xl bg-[#121e1a] hover:bg-[#16221d] text-[#d8e6de] hover:text-white border border-white/[0.08] hover:border-[#b5f568]/30 transition cursor-pointer"
                          title="Preview Original Document"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#62dd9e]" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleDownloadDocPdf(doc, e)}
                          disabled={downloadingDocId === doc._id}
                          className="p-2 rounded-xl bg-[#121e1a] hover:bg-[#16221d] text-[#62dd9e] hover:text-[#b5f568] border border-[#62dd9e]/30 hover:border-[#b5f568]/50 transition cursor-pointer"
                          title="Download Carbon Footprint Certificate & Audit Report (PDF)"
                        >
                          {downloadingDocId === doc._id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#b5f568]" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => onSelectDocument(doc)}
                          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition cursor-pointer border ${
                            doc.reviewStatus === 'APPROVED'
                              ? 'bg-[#121e1a] text-[#62dd9e] border-[#62dd9e]/40'
                              : doc.reviewStatus === 'REJECTED'
                              ? 'bg-rose-950/40 text-rose-300 border-rose-800/50'
                              : 'bg-gradient-to-r from-[#b5f568] to-[#85e656] text-[#07130f] font-bold shadow-[0_0_14px_rgba(181,245,104,0.3)]'
                          }`}
                          title={
                            doc.reviewStatus === 'APPROVED' || doc.reviewStatus === 'REJECTED'
                              ? `Permanently ${doc.reviewStatus.toLowerCase()} (Read-only)`
                              : 'Review & Verify Extracted Fields'
                          }
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>
                            {doc.reviewStatus === 'APPROVED' ? 'Approved' : doc.reviewStatus === 'REJECTED' ? 'Rejected' : 'Review'}
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default DocumentList;
