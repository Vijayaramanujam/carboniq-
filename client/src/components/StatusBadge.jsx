import React from 'react';

export function ProcessingStatusBadge({ status }) {
  const configs = {
    UPLOADED: { bg: 'bg-[#0f1f2e] text-[#38bdf8] border-[#38bdf8]/40', label: 'Uploaded' },
    HASH_CHECK: { bg: 'bg-[#0e272b] text-[#2dd4bf] border-[#2dd4bf]/40', label: 'Integrity Check' },
    CLASSIFYING: { bg: 'bg-[#181a38] text-[#818cf8] border-[#818cf8]/40', label: 'Classifying' },
    EXTRACTING: { bg: 'bg-[#1e1536] text-[#c084fc] border-[#c084fc]/40', label: 'Extracting' },
    NEEDS_REVIEW: { bg: 'bg-[#291e0a] text-[#facc15] border-[#facc15]/40', label: 'Needs Review' },
    COMPLETED: { bg: 'bg-[#0c2419] text-[#62dd9e] border-[#62dd9e]/40', label: 'Completed' },
    DUPLICATE: { bg: 'bg-[#1c1830] text-[#a78bfa] border-[#a78bfa]/40', label: 'Duplicate' },
    REJECTED: { bg: 'bg-[#2b0c10] text-[#f87171] border-[#f87171]/40', label: 'Rejected' },
    FAILED: { bg: 'bg-[#330f14] text-[#fb7185] border-[#fb7185]/40', label: 'Failed' },
  };

  const config = configs[status] || { bg: 'bg-[#121e1a] text-[#9aada2] border-white/[0.1]', label: status };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium border ${config.bg}`}>
      {config.label}
    </span>
  );
}

export function ReviewStatusBadge({ status }) {
  const configs = {
    PENDING: { bg: 'bg-[#121e1a] text-[#9aada2] border-white/[0.1]', label: 'Review Pending' },
    REQUIRED: { bg: 'bg-[#2d150c] text-[#fb923c] border-[#fb923c]/40', label: 'Review Required' },
    APPROVED: { bg: 'bg-[#0c2419] text-[#b5f568] border-[#b5f568]/40', label: 'Approved' },
    REJECTED: { bg: 'bg-[#2b0c10] text-[#f87171] border-[#f87171]/40', label: 'Rejected' },
  };

  const config = configs[status] || { bg: 'bg-[#121e1a] text-[#9aada2] border-white/[0.1]', label: status };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium border ${config.bg}`}>
      {config.label}
    </span>
  );
}

export function RelevanceBadge({ relevance }) {
  const configs = {
    RELEVANT: { bg: 'bg-[#0e2a1e] text-[#62dd9e] border-[#62dd9e]/40', label: 'Carbon Relevant' },
    IRRELEVANT: { bg: 'bg-[#141b18] text-[#71857c] border-white/[0.08]', label: 'Irrelevant' },
    UNCERTAIN: { bg: 'bg-[#291e0a] text-[#facc15] border-[#facc15]/40', label: 'Uncertain' },
  };

  const config = configs[relevance] || { bg: 'bg-[#121e1a] text-[#71857c] border-white/[0.08]', label: relevance };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium border ${config.bg}`}>
      {config.label}
    </span>
  );
}

export function ScopeBadge({ scope, multiScopeSummary }) {
  if (scope === 'MULTI_SCOPE') {
    return (
      <span
        className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-gradient-to-r from-emerald-500/20 via-sky-500/20 to-purple-500/20 text-white border border-teal-500/40 shadow-sm"
        title="Consolidated Multi-Scope Ledger (Scope 1, Scope 2, Scope 3 activities)"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
        <span className="text-emerald-400">S1</span>
        <span className="text-white/40">/</span>
        <span className="text-sky-400">S2</span>
        <span className="text-white/40">/</span>
        <span className="text-purple-400">S3</span>
        <span className="text-teal-300 font-semibold tracking-wider uppercase text-[9px] ml-0.5">Multi</span>
      </span>
    );
  }

  const configs = {
    SCOPE_1: { bg: 'bg-[#0d2417] text-[#62dd9e] border-[#62dd9e]/40', label: 'Scope 1' },
    SCOPE_2: { bg: 'bg-[#0a232b] text-[#38bdf8] border-[#38bdf8]/40', label: 'Scope 2' },
    SCOPE_3: { bg: 'bg-[#1c142b] text-[#c084fc] border-[#c084fc]/40', label: 'Scope 3' },
    NOT_APPLICABLE: { bg: 'bg-[#141b18] text-[#71857c] border-white/[0.08]', label: 'N/A' },
    UNKNOWN: { bg: 'bg-[#141b18] text-[#71857c] border-white/[0.08]', label: 'Unassigned' },
  };

  const config = configs[scope] || { bg: 'bg-[#141b18] text-[#71857c] border-white/[0.08]', label: scope || 'Scope ?' };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase border ${config.bg}`}>
      {config.label}
    </span>
  );
}
