import React, { useState, useEffect } from 'react';
import {
  Leaf,
  Target,
  FileText,
  Settings,
  ChevronRight,
  Zap,
  Flame,
  Truck,
  Package,
  Lightbulb,
  Route,
  TrendingDown,
  Building2,
  FileSpreadsheet,
  ShieldCheck,
  CheckCircle2,
  Plus,
  Inbox,
  AlertCircle,
} from 'lucide-react';

export function EnterpriseDashboard({
  company,
  documents = [],
  activities = [],
  onOpenUpload,
  onNavigateTab,
  onSelectDocument,
  onOpenStatutoryReports,
}) {
  const [selectedPeriod] = useState(() => {
    const d = new Date();
    return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
  });
  const [hoveredSlice, setHoveredSlice] = useState(null);
  const [isAnimated, setIsAnimated] = useState(false);
  const [displayEmissions, setDisplayEmissions] = useState(0);

  // Helper to reliably extract carbon emissions in kg from any activity record or document
  const getEmissionsKg = (item) => {
    if (!item) return 0;
    // 1. Nested carbonEmissions object (standard in ActivityRecord)
    if (item.carbonEmissions) {
      if (typeof item.carbonEmissions.emissionsKg === 'number' && !isNaN(item.carbonEmissions.emissionsKg)) {
        return item.carbonEmissions.emissionsKg;
      }
      if (typeof item.carbonEmissions.emissionsTonnes === 'number' && !isNaN(item.carbonEmissions.emissionsTonnes)) {
        return item.carbonEmissions.emissionsTonnes * 1000;
      }
      const parsedKg = parseFloat(item.carbonEmissions.emissionsKg);
      if (!isNaN(parsedKg)) return parsedKg;
      const parsedT = parseFloat(item.carbonEmissions.emissionsTonnes);
      if (!isNaN(parsedT)) return parsedT * 1000;
    }
    // 2. Nested suggestedEmissions object (standard in Document)
    if (item.suggestedEmissions) {
      if (typeof item.suggestedEmissions.emissionsKg === 'number' && !isNaN(item.suggestedEmissions.emissionsKg)) {
        return item.suggestedEmissions.emissionsKg;
      }
      if (typeof item.suggestedEmissions.emissionsTonnes === 'number' && !isNaN(item.suggestedEmissions.emissionsTonnes)) {
        return item.suggestedEmissions.emissionsTonnes * 1000;
      }
      const parsedKg = parseFloat(item.suggestedEmissions.emissionsKg);
      if (!isNaN(parsedKg)) return parsedKg;
    }
    // 3. Direct property variants
    if (typeof item.carbonEmissionsKg === 'number' && !isNaN(item.carbonEmissionsKg)) {
      return item.carbonEmissionsKg;
    }
    if (typeof item.emissionsKg === 'number' && !isNaN(item.emissionsKg)) {
      return item.emissionsKg;
    }
    if (typeof item.emissionsTonnes === 'number' && !isNaN(item.emissionsTonnes)) {
      return item.emissionsTonnes * 1000;
    }
    return 0;
  };

  // REAL DATA CALCULATION - ZERO SIMULATED NUMBERS
  // Consolidate activities and include any approved documents seamlessly
  const effectiveActivities = [...(activities || [])];
  (documents || []).forEach((doc) => {
    if (doc.reviewStatus === 'APPROVED' && doc.processingStatus === 'COMPLETED') {
      const docIdStr = String(doc._id || '');
      const alreadyIncluded = effectiveActivities.some((a) => {
        const actDocIdStr = a.documentId?._id ? String(a.documentId._id) : String(a.documentId || '');
        return actDocIdStr === docIdStr || String(a._id || '') === docIdStr;
      });
      if (!alreadyIncluded) {
        effectiveActivities.push({
          _id: doc._id,
          documentId: doc._id,
          scope: doc.scope && doc.scope !== 'UNKNOWN' ? doc.scope : 'SCOPE_2',
          category: doc.documentType?.replace('_BILL', '').replace('_RECEIPT', '') || 'ELECTRICITY',
          activityDate: doc.extractedFields?.activityDate || doc.createdAt,
          quantity: doc.extractedFields?.quantity,
          unit: doc.extractedFields?.unit,
          supplierName: doc.extractedFields?.supplierName || '',
          carbonEmissions: doc.suggestedEmissions || {},
          verificationStatus: 'APPROVED',
        });
      }
    }
  });

  const hasActivities = effectiveActivities.length > 0;
  const hasDocuments = Boolean(documents && documents.length > 0);

  const realScope1Kg = effectiveActivities
    .filter((a) => a.scope === 'SCOPE_1')
    .reduce((sum, a) => sum + getEmissionsKg(a), 0);
  const realScope2Kg = effectiveActivities
    .filter((a) => a.scope === 'SCOPE_2')
    .reduce((sum, a) => sum + getEmissionsKg(a), 0);
  const realScope3Kg = effectiveActivities
    .filter((a) => a.scope === 'SCOPE_3')
    .reduce((sum, a) => sum + getEmissionsKg(a), 0);
  const realTotalKg = realScope1Kg + realScope2Kg + realScope3Kg;

  // Real values in tonnes CO2e (zero if no activities exist)
  const totalEmissionsT = hasActivities ? +(realTotalKg / 1000).toFixed(2) : 0;
  const scope1T = hasActivities ? +(realScope1Kg / 1000).toFixed(2) : 0;
  const scope2T = hasActivities ? +(realScope2Kg / 1000).toFixed(2) : 0;
  const scope3T = hasActivities ? +(realScope3Kg / 1000).toFixed(2) : 0;

  const scope1Pct = realTotalKg > 0 ? Math.round((realScope1Kg / realTotalKg) * 100) : 0;
  const scope2Pct = realTotalKg > 0 ? Math.round((realScope2Kg / realTotalKg) * 100) : 0;
  const scope3Pct = realTotalKg > 0 ? Math.round((realScope3Kg / realTotalKg) * 100) : 0;

  // Real Categories Breakdown (derived directly from activities)
  const categoryColors = ['#f59e0b', '#38bdf8', '#c084fc', '#62dd9e', '#fb7185', '#94a3b8', '#a3e635'];
  const categoryMap = {};
  effectiveActivities.forEach((a) => {
    const catName = a.category || a.activityType || 'Operational Activity';
    categoryMap[catName] = (categoryMap[catName] || 0) + getEmissionsKg(a);
  });

  const categoryData = Object.entries(categoryMap)
    .filter(([_, kg]) => kg > 0 || Object.keys(categoryMap).length === 1)
    .map(([name, kg], idx) => {
      const tonnes = +(kg / 1000).toFixed(2);
      const pct = realTotalKg > 0 ? Math.round((kg / realTotalKg) * 100) : 0;
      return {
        name,
        pct,
        tonnes,
        color: categoryColors[idx % categoryColors.length],
      };
    })
    .sort((a, b) => b.tonnes - a.tonnes);

  // Real Top 5 Emission Sources
  const activitySourceMap = {};
  effectiveActivities.forEach((a) => {
    const srcName = a.supplierName || a.category || a.activityName || 'Operational Emission';
    if (!activitySourceMap[srcName]) {
      activitySourceMap[srcName] = {
        name: srcName,
        kg: 0,
        scope: a.scope,
      };
    }
    activitySourceMap[srcName].kg += getEmissionsKg(a);
  });

  const topSources = Object.values(activitySourceMap)
    .sort((a, b) => b.kg - a.kg)
    .slice(0, 5)
    .map((s, idx) => {
      const tonnes = +(s.kg / 1000).toFixed(2);
      const pct = realTotalKg > 0 ? Math.round((s.kg / realTotalKg) * 100) : 0;
      const IconComp = s.scope === 'SCOPE_1' ? Flame : s.scope === 'SCOPE_2' ? Zap : Truck;
      const color = s.scope === 'SCOPE_1' ? '#f59e0b' : s.scope === 'SCOPE_2' ? '#38bdf8' : '#c084fc';
      return {
        rank: idx + 1,
        name: s.name,
        tonnes,
        pct,
        color,
        icon: IconComp,
      };
    });

  // Real Monthly Aggregations (Past 6 months based on actual activity dates)
  const now = new Date();
  const monthLabels = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthLabels.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('en-US', { month: 'short' }),
    });
  }

  const monthlyTotals = {};
  monthLabels.forEach((m) => { monthlyTotals[m.key] = 0; });

  effectiveActivities.forEach((a) => {
    const rawDate = a.activityDate || a.createdAt;
    if (rawDate) {
      const d = new Date(rawDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyTotals[key] !== undefined) {
        monthlyTotals[key] += getEmissionsKg(a) / 1000;
      }
    }
  });

  const maxMonthlyVal = Math.max(...Object.values(monthlyTotals), 0.1);
  const trendMonths = monthLabels.map((m, idx) => {
    const val = +(monthlyTotals[m.key] || 0).toFixed(2);
    const x = 30 + idx * 60; // 30, 90, 150, 210, 270, 330
    const y = hasActivities && val > 0 ? +(130 - (val / maxMonthlyVal) * 90).toFixed(1) : 130;
    return { month: m.label, val, x, y };
  });

  const trendPathD = trendMonths.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x},${p.y}` : `${acc} L ${p.x},${p.y}`;
  }, '');
  const trendAreaD = `${trendPathD} L ${trendMonths[trendMonths.length - 1].x},140 L ${trendMonths[0].x},140 Z`;

  // Real Supplier Intelligence (derived strictly from verified vendor/supplier entries in uploaded documents)
  const supplierMap = {};
  effectiveActivities.forEach((a) => {
    const vName = a.supplierName?.trim() || a.vendorName?.trim();
    if (!vName) return; // STRICT: Never insert fallback dummy text
    if (!supplierMap[vName]) {
      supplierMap[vName] = {
        name: vName,
        count: 0,
        kg: 0,
        scope: a.scope,
      };
    }
    supplierMap[vName].count += 1;
    supplierMap[vName].kg += getEmissionsKg(a);
  });

  const supplierIntelligence = Object.values(supplierMap).map((s) => ({
    name: s.name,
    type: `${s.count} verified record${s.count > 1 ? 's' : ''}`,
    status: s.kg > 0 ? 'Verified Ingestion' : 'Pending Ingestion',
    statusColor: 'bg-[#0f2d1e] text-[#62dd9e] border-[#62dd9e]/40',
    intensity: `${(s.kg / 1000).toFixed(2)} t CO₂e`,
  }));

  // Dynamic Decarbonization Levers (tailored to company's actual largest emission scope)
  const recommendedActions = [];
  if (hasActivities) {
    if (realScope2Kg >= realScope1Kg && realScope2Kg >= realScope3Kg) {
      recommendedActions.push({
        title: 'Procure On-site Solar Rooftop PPA',
        subtitle: `Direct abatement of Scope 2 electricity emissions (~${(scope2T * 0.35).toFixed(1)} t CO₂e potential)`,
        icon: Zap,
        color: '#38bdf8',
      });
    }
    if (realScope1Kg > 0) {
      recommendedActions.push({
        title: 'Optimize Fleet Logistics & Generator Fuel',
        subtitle: `Target Scope 1 combustion reduction (~${(scope1T * 0.2).toFixed(1)} t CO₂e potential)`,
        icon: Flame,
        color: '#f59e0b',
      });
    }
    if (realScope3Kg > 0) {
      recommendedActions.push({
        title: 'Engage Tier-1 Suppliers for EPD Data',
        subtitle: 'Replace spend proxies with activity-based vendor emissions data',
        icon: Package,
        color: '#c084fc',
      });
    }
  } else {
    recommendedActions.push(
      {
        title: 'Ingest Utility Electricity Invoices',
        subtitle: 'Quantify Scope 2 electricity consumption using CEA v20.0 grid factors',
        icon: Zap,
        color: '#38bdf8',
      },
      {
        title: 'Record Fuel Purchases & Generator Slips',
        subtitle: 'Calculate direct Scope 1 emissions from stationary and mobile fuel',
        icon: Flame,
        color: '#f59e0b',
      },
      {
        title: 'Upload Freight Bilties & Vendor Bills',
        subtitle: 'Automate Scope 3 upstream transportation and supply chain accounting',
        icon: Truck,
        color: '#c084fc',
      }
    );
  }

  // Animated mount trigger & number counter
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimated(true);
    }, 60);

    let startTimestamp = null;
    const duration = 1000;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = +(easeProgress * totalEmissionsT).toFixed(2);
      setDisplayEmissions(current);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    const animId = window.requestAnimationFrame(step);

    return () => {
      clearTimeout(timer);
      window.cancelAnimationFrame(animId);
    };
  }, [totalEmissionsT]);

  // Donut Path helpers
  const donutRadius = 60;
  const donutCircumference = 2 * Math.PI * donutRadius;
  let accumulatedOffset = 0;

  return (
    <div className="space-y-6 animate-page-switch">
      {/* Welcome Hero Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>Welcome back,</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#b5f568] via-[#7dd9a3] to-[#62dd9e]">
              {company?.companyName || 'Enterprise Partner'}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-[#9aada2] font-mono mt-1">
            Realtime verified carbon telemetry for {selectedPeriod} &bull; Deterministic Statutory Ledger
          </p>
        </div>

        {/* Action Controls (Clean ESG export + Baseline indicator, duplicate upload button eliminated) */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#0b1b14] border border-[#62dd9e]/25 text-xs font-mono text-[#d8e6de] shadow-inner">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#62dd9e] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#62dd9e]"></span>
            </span>
            <span className="text-[10px] text-[#9aada2]">Baseline:</span>
            <span className="text-[#b5f568] font-semibold text-[11px]">CEA v20.0</span>
          </div>

          <button
            type="button"
            onClick={onOpenStatutoryReports}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-mono font-bold bg-[#122e1f] text-[#b5f568] border border-[#b5f568]/40 hover:bg-[#163825] hover:shadow-[0_0_20px_rgba(181,245,104,0.3)] hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
            title="Generate Statutory SEBI BRSR and EU CBAM Disclosures"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#b5f568]" />
            <span>Generate ESG Report</span>
          </button>
        </div>
      </div>

      {/* Row 1: Top 4 KPI Metric Cards with Staggered Entrance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Emissions */}
        <div className="telemetry-card p-5 rounded-2xl border border-[#b4ffcd]/18 bg-[#0b1b14]/90 backdrop-blur-xl relative overflow-hidden group animate-kpi-enter-1">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#b5f568] to-transparent" />
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#9aada2] block">
                Total Realtime Footprint
              </span>
              <div className="flex items-baseline space-x-1.5 mt-1">
                <span className="text-3xl font-black font-mono text-white tracking-tight">
                  {displayEmissions}
                </span>
                <span className="text-xs font-mono font-bold text-[#b5f568]">t CO₂e</span>
              </div>
              <div className="flex items-center space-x-1 text-[11px] font-mono mt-2">
                {hasActivities ? (
                  <span className="text-[#62dd9e] flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Calculated from verified records</span>
                  </span>
                ) : (
                  <span className="text-[#9aada2]">Awaiting activity entries</span>
                )}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#122e1f] border border-[#b5f568]/40 flex items-center justify-center text-[#b5f568] shadow-[0_0_20px_rgba(181,245,104,0.25)] group-hover:scale-110 transition-transform">
              <Leaf className="w-6 h-6 text-[#b5f568]" />
            </div>
          </div>
        </div>

        {/* Card 2: Scope 1 */}
        <div className="telemetry-card p-5 rounded-2xl border border-amber-500/25 bg-[#0b1b14]/90 backdrop-blur-xl relative overflow-hidden group animate-kpi-enter-2">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#9aada2] block">
                Scope 1 (Direct Fuel)
              </span>
              <div className="flex items-baseline space-x-1.5 mt-1">
                <span className="text-3xl font-black font-mono text-white tracking-tight">
                  {scope1T}
                </span>
                <span className="text-xs font-mono font-bold text-amber-400">t CO₂e</span>
              </div>
              <div className="mt-3 flex items-center space-x-2">
                <div className="w-24 h-1.5 rounded-full bg-[#142318] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-1000 ease-out"
                    style={{ width: isAnimated ? `${scope1Pct}%` : '0%' }}
                  />
                </div>
                <span className="text-[10px] font-mono font-bold text-amber-300">{scope1Pct}%</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#2b1808] border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)] group-hover:scale-110 transition-transform">
              <Flame className="w-6 h-6 text-amber-400" />
            </div>
          </div>
        </div>

        {/* Card 3: Scope 2 */}
        <div className="telemetry-card p-5 rounded-2xl border border-sky-500/25 bg-[#0b1b14]/90 backdrop-blur-xl relative overflow-hidden group animate-kpi-enter-3">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-sky-400 to-transparent" />
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#9aada2] block">
                Scope 2 (Electricity)
              </span>
              <div className="flex items-baseline space-x-1.5 mt-1">
                <span className="text-3xl font-black font-mono text-white tracking-tight">
                  {scope2T}
                </span>
                <span className="text-xs font-mono font-bold text-sky-400">t CO₂e</span>
              </div>
              <div className="mt-3 flex items-center space-x-2">
                <div className="w-24 h-1.5 rounded-full bg-[#142318] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-500 transition-all duration-1000 ease-out"
                    style={{ width: isAnimated ? `${scope2Pct}%` : '0%' }}
                  />
                </div>
                <span className="text-[10px] font-mono font-bold text-sky-300">{scope2Pct}%</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#091e2b] border border-sky-500/40 flex items-center justify-center text-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.25)] group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6 text-sky-400" />
            </div>
          </div>
        </div>

        {/* Card 4: Scope 3 */}
        <div className="telemetry-card p-5 rounded-2xl border border-purple-500/25 bg-[#0b1b14]/90 backdrop-blur-xl relative overflow-hidden group animate-kpi-enter-4">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-400 to-transparent" />
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#9aada2] block">
                Scope 3 (Supply Chain)
              </span>
              <div className="flex items-baseline space-x-1.5 mt-1">
                <span className="text-3xl font-black font-mono text-white tracking-tight">
                  {scope3T}
                </span>
                <span className="text-xs font-mono font-bold text-purple-400">t CO₂e</span>
              </div>
              <div className="mt-3 flex items-center space-x-2">
                <div className="w-24 h-1.5 rounded-full bg-[#142318] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-400 to-violet-500 transition-all duration-1000 ease-out"
                    style={{ width: isAnimated ? `${scope3Pct}%` : '0%' }}
                  />
                </div>
                <span className="text-[10px] font-mono font-bold text-purple-300">{scope3Pct}%</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#1e132b] border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-[0_0_20px_rgba(192,132,252,0.25)] group-hover:scale-110 transition-transform">
              <Package className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Middle Analytics Row (Breakdown Donut, Emissions Trend Area, Top Sources) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Col 1: Emissions Breakdown (4 cols) */}
        <div className="lg:col-span-4 telemetry-card p-5 sm:p-6 rounded-2xl border border-[#b4ffcd]/15 bg-[#0b1b14]/90 backdrop-blur-xl flex flex-col justify-between animate-stagger-2">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h2 className="text-sm font-bold text-white font-mono tracking-tight">Emissions Breakdown</h2>
              <div className="px-2.5 py-1 rounded-lg bg-[#040a08] border border-white/[0.1] text-[10px] font-mono text-[#9aada2]">
                Realtime Data
              </div>
            </div>

            {/* Interactive SVG Donut Chart with Pure SVG Mathematical Centering */}
            <div className="py-6 flex items-center justify-center">
              <div className="relative w-44 h-44 flex items-center justify-center">
                <svg className="w-full h-full animate-donut-enter overflow-visible" viewBox="0 0 160 160">
                  {/* Slices group rotated by -90deg starting at 12 o'clock */}
                  <g transform="rotate(-90 80 80)">
                    <circle cx="80" cy="80" r={donutRadius} fill="none" stroke="#040a08" strokeWidth="22" />
                    {categoryData.length > 0 ? (
                      categoryData.map((cat, idx) => {
                        const targetDash = (cat.pct / 100) * donutCircumference;
                        const dashLength = isAnimated ? targetDash : 0;
                        const currentOffset = accumulatedOffset;
                        accumulatedOffset += targetDash;
                        return (
                          <circle
                            key={cat.name}
                            cx="80"
                            cy="80"
                            r={donutRadius}
                            fill="none"
                            stroke={cat.color}
                            strokeWidth={hoveredSlice === idx ? '26' : '22'}
                            strokeDasharray={`${dashLength} ${donutCircumference}`}
                            strokeDashoffset={-currentOffset}
                            style={{
                              transition: 'stroke-dasharray 1.2s cubic-bezier(0.16, 1, 0.3, 1), stroke-width 0.25s ease',
                              transitionDelay: `${idx * 100}ms`,
                            }}
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredSlice(idx)}
                            onMouseLeave={() => setHoveredSlice(null)}
                          />
                        );
                      })
                    ) : (
                      <circle cx="80" cy="80" r={donutRadius} fill="none" stroke="#122e1f" strokeWidth="22" strokeDasharray="4 4" />
                    )}
                  </g>

                  {/* Center Donut Cutout Text - Mathematical SVG Sub-Pixel Centering at cx=80, cy=80 */}
                  <text
                    x="80"
                    y="74"
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="fill-white font-mono font-black select-none pointer-events-none"
                    style={{ fontSize: '22px', fontWeight: 900 }}
                  >
                    {hoveredSlice !== null
                      ? categoryData[hoveredSlice]?.tonnes
                      : (Number(displayEmissions) || 0).toFixed(2)}
                  </text>
                  <text
                    x="80"
                    y="92"
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="fill-[#b5f568] font-mono font-bold uppercase select-none pointer-events-none"
                    style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.06em' }}
                  >
                    {hoveredSlice !== null
                      ? (categoryData[hoveredSlice]?.name.length > 16
                          ? categoryData[hoveredSlice]?.name.slice(0, 15) + '…'
                          : categoryData[hoveredSlice]?.name)
                      : 't CO₂e Total'}
                  </text>
                </svg>
              </div>
            </div>

            {/* Category Legend List */}
            <div className="space-y-2 pt-2 border-t border-white/[0.06]">
              {categoryData.length > 0 ? (
                categoryData.map((cat, idx) => (
                  <div
                    key={cat.name}
                    onMouseEnter={() => setHoveredSlice(idx)}
                    onMouseLeave={() => setHoveredSlice(null)}
                    className={`flex items-center justify-between text-xs font-mono p-1.5 rounded-lg transition cursor-pointer ${
                      hoveredSlice === idx ? 'bg-white/[0.06]' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-[#d8e6de] text-[11px] truncate max-w-[140px]">{cat.name}</span>
                    </div>
                    <div className="flex items-center space-x-3 text-right">
                      <span className="text-white font-bold text-[11px]">{cat.pct}%</span>
                      <span className="text-[#9aada2] text-[11px]">{cat.tonnes} t</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-2 text-center text-xs font-mono text-[#71857c]">
                  No category entries logged yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Col 2: Emissions Trend Area Chart with Drawing Line Animation (4 cols) */}
        <div className="lg:col-span-4 telemetry-card p-5 sm:p-6 rounded-2xl border border-[#b4ffcd]/15 bg-[#0b1b14]/90 backdrop-blur-xl flex flex-col justify-between animate-stagger-3">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h2 className="text-sm font-bold text-white font-mono tracking-tight">Emissions Trend</h2>
              <div className="px-2.5 py-1 rounded-lg bg-[#040a08] border border-white/[0.1] text-[10px] font-mono text-[#9aada2]">
                Monthly Verified
              </div>
            </div>

            <div className="pt-3">
              <span className="text-[10px] font-mono text-[#9aada2] block">Verified Monthly Records (t CO₂e)</span>

              {/* Animated SVG Area Chart */}
              <div className="py-4">
                <svg className="w-full h-44 overflow-visible" viewBox="0 0 360 160">
                  <defs>
                    <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#62dd9e" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#62dd9e" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  <line x1="20" y1="40" x2="340" y2="40" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  <line x1="20" y1="80" x2="340" y2="80" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  <line x1="20" y1="130" x2="340" y2="130" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />

                  {/* Area fill */}
                  {hasActivities && (
                    <path
                      className={isAnimated ? 'animate-area-fade' : 'opacity-0'}
                      d={trendAreaD}
                      fill="url(#trendGradient)"
                    />
                  )}

                  {/* Animated Stroke line */}
                  <path
                    className={isAnimated ? 'animate-line-draw' : 'opacity-0'}
                    d={trendPathD}
                    fill="none"
                    stroke="#62dd9e"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  {/* Trajectory Nodes */}
                  {trendMonths.map((p, i) => (
                    <g
                      key={p.month}
                      className={isAnimated ? 'animate-node-pop' : 'opacity-0'}
                      style={{ animationDelay: `${300 + i * 120}ms` }}
                    >
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={i === trendMonths.length - 1 ? 5 : 3.5}
                        fill={i === trendMonths.length - 1 ? '#b5f568' : '#06110d'}
                        stroke="#62dd9e"
                        strokeWidth="2"
                      />
                      <text
                        x={p.x}
                        y="155"
                        textAnchor="middle"
                        fill="#71857c"
                        fontSize="10"
                        fontFamily="monospace"
                      >
                        {p.month}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono pt-3 border-t border-white/[0.06]">
                <span className="text-[#9aada2]">Calculated Activity Output:</span>
                <span className="text-[#b5f568] font-bold px-2 py-0.5 rounded bg-[#122e1f] border border-[#b5f568]/40">
                  {displayEmissions} t CO₂e
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Col 3: Top Emission Sources Ranked (4 cols) */}
        <div className="lg:col-span-4 telemetry-card p-5 sm:p-6 rounded-2xl border border-[#b4ffcd]/15 bg-[#0b1b14]/90 backdrop-blur-xl flex flex-col justify-between animate-stagger-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h2 className="text-sm font-bold text-white font-mono tracking-tight">Top Emission Sources</h2>
              <button
                type="button"
                onClick={() => onNavigateTab && onNavigateTab('ACTIVITIES')}
                className="text-[#b5f568] hover:underline flex items-center space-x-1 text-xs font-mono cursor-pointer"
              >
                <span>Inspect</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3.5 pt-4">
              {topSources.length > 0 ? (
                topSources.map((source, idx) => {
                  const IconComponent = source.icon;
                  return (
                    <div key={source.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <div className="flex items-center space-x-2 truncate max-w-[70%]">
                          <span className="w-5 h-5 rounded-full bg-[#121e1a] border border-white/[0.1] text-slate-400 text-[10px] flex items-center justify-center shrink-0">
                            {source.rank}
                          </span>
                          <IconComponent className="w-3.5 h-3.5 shrink-0" style={{ color: source.color }} />
                          <span className="text-white text-[11px] truncate">{source.name}</span>
                        </div>
                        <div className="flex items-center space-x-2 shrink-0">
                          <span className="text-[#d8e6de] font-semibold text-[11px]">{source.tonnes} t</span>
                          <span className="text-[#9aada2] text-[10px] w-7 text-right">{source.pct}%</span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#040a08] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000 ease-out"
                          style={{
                            width: isAnimated ? `${source.pct}%` : '0%',
                            backgroundColor: source.color,
                            transitionDelay: `${300 + idx * 100}ms`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs font-mono text-[#71857c] space-y-2">
                  <Inbox className="w-7 h-7 mx-auto opacity-40 text-[#9aada2]" />
                  <p>No activity sources recorded yet.</p>
                  <p className="text-[10px]">Ingest bills or add manual entries to populate rankings.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Bottom Actionable Row (Recent Documents, Supplier Intelligence, Recommended Actions) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Col 1: Recent Documents (4 cols) */}
        <div className="lg:col-span-4 telemetry-card p-5 sm:p-6 rounded-2xl border border-[#b4ffcd]/15 bg-[#0b1b14]/90 backdrop-blur-xl flex flex-col justify-between animate-stagger-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h2 className="text-sm font-bold text-white font-mono tracking-tight">Recent Ingested Records</h2>
              <button
                type="button"
                onClick={() => onNavigateTab && onNavigateTab('DOCUMENTS')}
                className="text-[#b5f568] hover:underline text-xs font-mono cursor-pointer"
              >
                View Registry
              </button>
            </div>

            <div className="space-y-3 pt-3">
              {hasDocuments ? (
                documents.slice(0, 4).map((doc) => (
                  <button
                    key={doc._id}
                    type="button"
                    onClick={() => onSelectDocument && onSelectDocument(doc)}
                    className="w-full text-left p-3 rounded-xl bg-[#040a08]/90 border border-white/[0.08] hover:border-[#62dd9e]/40 transition flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center space-x-2.5 truncate max-w-[70%]">
                      <div className="p-2 rounded-lg bg-[#121e1a] text-[#b5f568] shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-mono text-white truncate font-medium group-hover:text-[#b5f568]">
                          {doc.originalFileName}
                        </div>
                        <div className="text-[10px] font-mono text-[#9aada2] mt-0.5">
                          {doc.extractedFields?.category || 'Utility Record'} &bull;{' '}
                          {doc.extractedFields?.quantity ? `${doc.extractedFields.quantity} ${doc.extractedFields.unit || ''}` : 'Pending Extraction'}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                        doc.reviewStatus === 'APPROVED'
                          ? 'bg-[#0f2d1e] text-[#62dd9e]'
                          : 'bg-[#291e0a] text-[#facc15]'
                      }`}
                    >
                      {doc.reviewStatus === 'APPROVED' ? 'Verified' : 'Extracted'}
                    </span>
                  </button>
                ))
              ) : (
                <div className="py-8 text-center rounded-xl bg-[#040a08]/60 border border-white/[0.06] space-y-2 font-mono">
                  <Inbox className="w-7 h-7 mx-auto opacity-40 text-[#9aada2]" />
                  <div className="text-xs text-white font-semibold">No Documents Ingested</div>
                  <p className="text-[10px] text-[#9aada2] px-4">
                    Upload electricity bills, fuel receipts, or freight manifests to initiate automated OCR extraction.
                  </p>
                  <button
                    type="button"
                    onClick={onOpenUpload}
                    className="mt-1 px-3 py-1.5 rounded-lg bg-[#122e1f] text-[#b5f568] border border-[#b5f568]/40 text-xs font-bold hover:bg-[#163825] transition cursor-pointer"
                  >
                    + Upload Invoices
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Col 2: Supplier Intelligence (4 cols) */}
        <div className="lg:col-span-4 telemetry-card p-5 sm:p-6 rounded-2xl border border-[#b4ffcd]/15 bg-[#0b1b14]/90 backdrop-blur-xl flex flex-col justify-between animate-stagger-5">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h2 className="text-sm font-bold text-white font-mono tracking-tight">Supplier Intelligence</h2>
              <button
                type="button"
                onClick={() => onNavigateTab && onNavigateTab('ACTIVITIES')}
                className="text-[#b5f568] hover:underline text-xs font-mono cursor-pointer"
              >
                Scope 3 Ledger
              </button>
            </div>

            <div className="space-y-3 pt-3">
              {supplierIntelligence.length > 0 ? (
                supplierIntelligence.map((supp) => (
                  <div
                    key={supp.name}
                    className="p-3 rounded-xl bg-[#040a08]/90 border border-white/[0.08] flex items-center justify-between font-mono"
                  >
                    <div className="truncate max-w-[65%]">
                      <div className="text-xs text-white font-medium truncate">{supp.name}</div>
                      <div className="text-[10px] text-[#9aada2]">{supp.type}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[10px] border ${supp.statusColor}`}>
                        {supp.status}
                      </span>
                      <div className="text-[10px] text-[#7dd9a3] mt-1">{supp.intensity}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center rounded-xl bg-[#040a08]/60 border border-white/[0.06] space-y-2 font-mono">
                  <Package className="w-7 h-7 mx-auto opacity-40 text-[#9aada2]" />
                  <div className="text-xs text-white font-semibold">No Scope 3 Suppliers Logged</div>
                  <p className="text-[10px] text-[#9aada2] px-4">
                    Inbound transport and raw material manifests will automatically populate vendor carbon metrics.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Col 3: Recommended Actions (4 cols) */}
        <div className="lg:col-span-4 telemetry-card p-5 sm:p-6 rounded-2xl border border-[#b4ffcd]/15 bg-[#0b1b14]/90 backdrop-blur-xl flex flex-col justify-between animate-stagger-6">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h2 className="text-sm font-bold text-white font-mono tracking-tight">Decarbonization Levers</h2>
              <button
                type="button"
                onClick={onOpenStatutoryReports}
                className="text-[#b5f568] hover:underline text-xs font-mono cursor-pointer"
              >
                Statutory Reports
              </button>
            </div>

            <div className="space-y-3 pt-3">
              {recommendedActions.map((rec) => {
                const IconComp = rec.icon;
                return (
                  <button
                    key={rec.title}
                    type="button"
                    onClick={() => onNavigateTab && onNavigateTab(hasActivities ? 'ACTIVITIES' : 'DATA_UPLOAD')}
                    className="w-full text-left p-3.5 rounded-xl bg-[#040a08]/90 border border-white/[0.08] hover:border-[#b5f568]/40 transition flex items-center justify-between group cursor-pointer shadow-sm font-mono"
                  >
                    <div className="flex items-center space-x-3 truncate max-w-[85%]">
                      <div
                        className="p-2.5 rounded-xl bg-[#121e1a] border border-white/[0.08] shrink-0"
                        style={{ color: rec.color }}
                      >
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs text-white font-bold group-hover:text-[#b5f568] truncate">
                          {rec.title}
                        </div>
                        <div className="text-[10px] text-[#9aada2] mt-0.5 truncate">
                          {rec.subtitle}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#9aada2] group-hover:text-[#b5f568] group-hover:translate-x-0.5 transition-transform" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EnterpriseDashboard;
