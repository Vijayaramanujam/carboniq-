import React, { useState } from 'react';
import { Layers, FileText, UserCheck, Calendar, Filter, Search, Sparkles } from 'lucide-react';
import { ScopeBadge } from './StatusBadge.jsx';

export function ActivityRecordsList({ activities, loading, onSelectDocumentById }) {
  const [categoryFilter, setCategoryFilter] = useState('');
  const [scopeFilter, setScopeFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [search, setSearch] = useState('');

  const filtered = activities.filter((act) => {
    if (categoryFilter && act.category !== categoryFilter) return false;
    if (scopeFilter && act.scope !== scopeFilter) return false;
    if (sourceFilter && act.recordSource !== sourceFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchSupp = act.supplierName?.toLowerCase().includes(q);
      const matchDesc = act.description?.toLowerCase().includes(q);
      const matchDoc = act.documentId?.originalFileName?.toLowerCase().includes(q);
      if (!matchSupp && !matchDesc && !matchDoc) return false;
    }
    return true;
  });

  return (
    <div className="telemetry-card p-6 sm:p-7 rounded-2xl border border-[#b4ffcd]/18 bg-[#0b1b14]/90 backdrop-blur-2xl shadow-2xl relative overflow-hidden space-y-5">
      {/* Top Specular Rim */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#b5f568]/40 to-transparent" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Verified Activity Records</h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#121e1a] text-[#b5f568] border border-[#b5f568]/30 font-semibold">
              {filtered.length} Stored
            </span>
          </div>
          <p className="text-xs text-[#9aada2] mt-0.5">
            Structured operational activity records stored with deterministic mathematical factor links.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9aada2]" />
            <input
              type="text"
              placeholder="Search supplier or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 rounded-full bg-[#040a08]/90 border border-white/[0.12] text-xs text-white placeholder-[#9aada2]/40 focus:outline-none focus:border-[#b5f568] focus:shadow-[0_0_16px_rgba(181,245,104,0.2)] w-48 sm:w-56 transition"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-full bg-[#040a08]/90 border border-white/[0.12] text-xs text-[#d8e6de] focus:outline-none focus:border-[#b5f568] transition cursor-pointer"
          >
            <option value="" className="bg-[#0b1b14]">All Categories</option>
            <option value="ELECTRICITY" className="bg-[#0b1b14]">Electricity</option>
            <option value="FUEL" className="bg-[#0b1b14]">Fuel</option>
            <option value="TRANSPORTATION" className="bg-[#0b1b14]">Transportation</option>
            <option value="WASTE" className="bg-[#0b1b14]">Waste</option>
            <option value="SUPPLIER_INVOICE" className="bg-[#0b1b14]">Supplier Invoices</option>
          </select>

          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value)}
            className="px-3 py-2 rounded-full bg-[#040a08]/90 border border-white/[0.12] text-xs text-[#d8e6de] focus:outline-none focus:border-[#b5f568] transition cursor-pointer font-mono"
          >
            <option value="" className="bg-[#0b1b14]">All Scopes</option>
            <option value="SCOPE_1" className="bg-[#0b1b14]">Scope 1</option>
            <option value="SCOPE_2" className="bg-[#0b1b14]">Scope 2</option>
            <option value="SCOPE_3" className="bg-[#0b1b14]">Scope 3</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2 rounded-full bg-[#040a08]/90 border border-white/[0.12] text-xs text-[#d8e6de] focus:outline-none focus:border-[#b5f568] transition cursor-pointer"
          >
            <option value="" className="bg-[#0b1b14]">All Sources</option>
            <option value="EXTRACTED" className="bg-[#0b1b14]">Extracted from Document</option>
            <option value="MANUAL" className="bg-[#0b1b14]">Direct Manual Entry</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-[#9aada2] text-xs font-mono">Loading activity records...</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-white/[0.08] rounded-2xl bg-[#040a08]/60 p-8">
          <Layers className="w-10 h-10 text-slate-600 mx-auto mb-2 opacity-50" />
          <p className="text-white font-medium text-sm">No activity records stored yet</p>
          <p className="text-[#9aada2] text-xs mt-1">
            Review and approve uploaded documents or use the Manual Entry tab to create records.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] text-[#9aada2] uppercase tracking-wider font-semibold text-[10px] font-mono bg-[#040a08]/60">
                <th className="py-3 px-3.5">Date</th>
                <th className="py-3 px-3.5">Scope</th>
                <th className="py-3 px-3.5">Category</th>
                <th className="py-3 px-3.5">Quantity</th>
                <th className="py-3 px-3.5">Emissions (kg CO2e)</th>
                <th className="py-3 px-3.5">Supplier / Description</th>
                <th className="py-3 px-3.5">Source & Traceability</th>
                <th className="py-3 px-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05] font-mono">
              {filtered.map((act, idx) => {
                const dateStr = act.activityDate ? new Date(act.activityDate).toLocaleDateString() : 'N/A';
                const hasEmissions = act.carbonEmissions && act.carbonEmissions.emissionsKg != null;
                const isOffset = act.carbonEmissions?.isNegativeOffset;

                return (
                  <tr
                    key={act._id}
                    style={{ animationDelay: `${Math.min(idx * 45, 360)}ms` }}
                    className="hover:bg-[#121e1a]/80 transition-colors animate-item-enter border-b border-white/[0.05]"
                  >
                    <td className="py-3.5 px-3.5 text-[#d8e6de] font-sans">{dateStr}</td>
                    <td className="py-3.5 px-3.5">
                      <ScopeBadge scope={act.scope} />
                    </td>
                    <td className="py-3.5 px-3.5 font-sans">
                      <span className="font-semibold text-white">{act.category}</span>
                      {act.categoryData?.fuelType && (
                        <span className="block text-[10px] text-[#9aada2] font-mono">{act.categoryData.fuelType}</span>
                      )}
                      {act.categoryData?.transportMode && (
                        <span className="block text-[10px] text-[#9aada2] font-mono">{act.categoryData.transportMode}</span>
                      )}
                      {act.categoryData?.wasteType && (
                        <span className="block text-[10px] text-[#9aada2] font-mono">{act.categoryData.wasteType}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3.5">
                      <span className="text-[#b5f568] font-bold text-sm">{act.quantity}</span>{' '}
                      <span className="text-[#9aada2] text-[11px]">{act.unit}</span>
                    </td>
                    <td className="py-3.5 px-3.5">
                      {hasEmissions ? (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                            isOffset
                              ? 'bg-[#121e1a] text-[#b5f568] border border-[#b5f568]/40'
                              : 'bg-[#121e1a] text-[#62dd9e] border border-[#62dd9e]/30'
                          }`}
                          title={act.carbonEmissions.calculationFormula || 'Calculated emissions'}
                        >
                          {act.carbonEmissions.emissionsKg > 0 ? `+${act.carbonEmissions.emissionsKg}` : act.carbonEmissions.emissionsKg} kg
                        </span>
                      ) : (
                        <span className="text-[#9aada2] text-xs">&mdash;</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3.5 font-sans max-w-xs">
                      <div className="font-medium text-white">{act.supplierName || '—'}</div>
                      <div className="text-[11px] text-[#9aada2] truncate">{act.description}</div>
                    </td>
                    <td className="py-3.5 px-3.5 font-sans">
                      {act.recordSource === 'EXTRACTED' ? (
                        <div
                          onClick={() => act.documentId?._id && onSelectDocumentById && onSelectDocumentById(act.documentId._id)}
                          className="flex items-center space-x-1.5 text-[#62dd9e] hover:text-[#b5f568] cursor-pointer transition"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span className="text-[11px] truncate max-w-[150px] font-mono">
                            {act.documentId?.originalFileName || 'Linked Document'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1.5 text-[#9aada2]">
                          <UserCheck className="w-3.5 h-3.5 text-[#b5f568]" />
                          <span className="text-[11px] font-mono">Manual SME Entry</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-3.5 text-right font-sans">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#121e1a] text-[#62dd9e] border border-[#62dd9e]/30">
                        {act.verificationStatus}
                      </span>
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

export default ActivityRecordsList;
