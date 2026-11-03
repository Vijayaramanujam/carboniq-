import React, { useState, useEffect, useRef } from 'react';
import {
  Database,
  Search,
  Filter,
  ExternalLink,
  ShieldCheck,
  Zap,
  Flame,
  Truck,
  Trash2,
  Calendar,
  Globe,
  Info,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Calculator,
  ArrowLeft,
  Sparkles,
  LayoutGrid,
  List,
  SlidersHorizontal,
  Building,
  CheckCircle2,
  X,
} from 'lucide-react';
import { fetchEmissionFactors, fetchEmissionFactorSummary } from '../services/api.js';
import { ScopeBadge } from './StatusBadge.jsx';

export function EmissionFactorDataset({ onBackToWorkspace }) {
  // Data state
  const [factors, setFactors] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState({
    totalRecords: 0,
    currentPage: 1,
    pageSize: 12,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Pagination controls state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedScope, setSelectedScope] = useState('ALL');
  const [selectedCountry, setSelectedCountry] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [selectedOrg, setSelectedOrg] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('active'); // 'active' | 'all' | 'inactive'

  // Sorting state
  const [sortBy, setSortBy] = useState('category');
  const [sortOrder, setSortOrder] = useState('asc');

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // View mode: 'cards' | 'table'
  const [viewMode, setViewMode] = useState('cards');

  // Expanded card state
  const [expandedId, setExpandedId] = useState(null);

  // Interactive Calculator state
  const [calcFactor, setCalcFactor] = useState(null);
  const [calcQuantity, setCalcQuantity] = useState(1000);

  // Stale request prevention ref
  const activeRequestIdRef = useRef(0);

  // Load summary statistics once on mount and when reloaded
  const loadSummary = async () => {
    setSummaryLoading(true);
    try {
      const data = await fetchEmissionFactorSummary();
      if (data.success && data.summary) {
        setSummary(data.summary);
      }
    } catch (err) {
      console.warn('Could not load summary statistics:', err.message);
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  // Fetch paginated emission factors
  const loadFactors = async (targetPage = page, targetLimit = pageSize) => {
    const requestId = ++activeRequestIdRef.current;
    setLoading(true);
    setError(null);

    const queryParams = {
      page: targetPage,
      limit: targetLimit,
      category: selectedCategory,
      scope: selectedScope,
      countryCode: selectedCountry,
      reportingYear: selectedYear,
      sourceOrganization: selectedOrg,
      status: selectedStatus,
      search: searchQuery.trim(),
      sortBy,
      sortOrder,
    };

    try {
      const data = await fetchEmissionFactors(queryParams);

      // Prevent stale responses from overwriting newer selections
      if (requestId !== activeRequestIdRef.current) return;

      if (data.success) {
        setFactors(data.factors || []);
        if (data.pagination) {
          setPagination(data.pagination);
        } else {
          setPagination({
            totalRecords: data.factors?.length || 0,
            currentPage: targetPage,
            pageSize: targetLimit,
            totalPages: Math.ceil((data.factors?.length || 0) / targetLimit) || 1,
            hasNextPage: false,
            hasPrevPage: targetPage > 1,
          });
        }
      } else {
        setError(data.error || 'Failed to load emission factors from database.');
      }
    } catch (err) {
      if (requestId !== activeRequestIdRef.current) return;
      setError(err.message || 'Error connecting to database.');
    } finally {
      if (requestId === activeRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  // Trigger data load whenever filters, pagination, or sorting change
  useEffect(() => {
    loadFactors(page, pageSize);
  }, [
    page,
    pageSize,
    selectedCategory,
    selectedScope,
    selectedCountry,
    selectedYear,
    selectedOrg,
    selectedStatus,
    searchQuery,
    sortBy,
    sortOrder,
  ]);

  // Reset to page 1 whenever search, filters, or sorting change
  const handleFilterChange = (setter, value) => {
    setter(value);
    setPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handleSortChange = (newSortBy, newSortOrder) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setSelectedScope('ALL');
    setSelectedCountry('ALL');
    setSelectedYear('ALL');
    setSelectedOrg('ALL');
    setSelectedStatus('active');
    setSortBy('category');
    setSortOrder('asc');
    setPage(1);
  };

  // Helper for category icon
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'ELECTRICITY':
        return <Zap className="w-4 h-4 text-sky-400" />;
      case 'FUEL':
        return <Flame className="w-4 h-4 text-amber-400" />;
      case 'TRANSPORTATION':
        return <Truck className="w-4 h-4 text-emerald-400" />;
      case 'WASTE':
        return <Trash2 className="w-4 h-4 text-rose-400" />;
      default:
        return <Database className="w-4 h-4 text-indigo-400" />;
    }
  };

  // Country Flag helper
  const getCountryBadge = (code) => {
    if (code === 'IN') {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950/70 border border-emerald-600/60 text-emerald-300 font-mono">
          <span>IN</span>
          <span>India</span>
        </span>
      );
    }
    if (code === 'GB') {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-950/70 border border-indigo-600/60 text-indigo-300 font-mono">
          <span>GB</span>
          <span>UK</span>
        </span>
      );
    }
    if (code === 'US') {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-950/70 border border-blue-600/60 text-blue-300 font-mono">
          <span>US</span>
          <span>USA</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 font-mono">
        <Globe className="w-3 h-3 text-slate-400" />
        <span>{code}</span>
      </span>
    );
  };

  // Computed range strings for "Showing X–Y of Z factors"
  const startItem = pagination.totalRecords === 0 ? 0 : (pagination.currentPage - 1) * pagination.pageSize + 1;
  const endItem = Math.min(pagination.totalRecords, pagination.currentPage * pagination.pageSize);

  // Check if any non-default filter is active
  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedCategory !== 'ALL' ||
    selectedScope !== 'ALL' ||
    selectedCountry !== 'ALL' ||
    selectedYear !== 'ALL' ||
    selectedOrg !== 'ALL' ||
    selectedStatus !== 'active' ||
    sortBy !== 'category' ||
    sortOrder !== 'asc';

  return (
    <div className="space-y-8">
      {/* Header Banner with Dynamic KPI Cards */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-80 h-80 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              {onBackToWorkspace && (
                <button
                  type="button"
                  onClick={onBackToWorkspace}
                  className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition mr-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Workspace</span>
                </button>
              )}
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-900/60 text-emerald-300 border border-emerald-600/50">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>Verified Baseline Dataset</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">Collection: emissionfactors</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              CarbonIQ Emission Factor Database
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Audit-traceable greenhouse gas emission factors for corporate carbon accounting. Scalable server-side querying across all activity categories, verified against official publications from the Central Electricity Authority of India (CEA), UK DESNZ, and US EPA.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              loadSummary();
              loadFactors(page, pageSize);
            }}
            disabled={loading}
            className="self-start md:self-center flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold shadow-lg transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || summaryLoading ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Refresh Data</span>
          </button>
        </div>

        {/* Dynamic KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Total Database Factors</div>
            <div className="text-2xl font-black text-white mt-0.5 font-mono">
              {summary ? summary.totalCount : pagination.totalRecords}
            </div>
            <div className="text-[11px] text-emerald-400 mt-1 flex items-center space-x-1">
              <ShieldCheck className="w-3 h-3" />
              <span>{summary ? `${summary.activeCount} Active In Database` : 'Verified Provenance'}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">India Focus (CEA / MoEFCC)</div>
            <div className="text-2xl font-black text-emerald-400 mt-0.5 font-mono">
              {summary ? summary.indiaCount : '—'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">National Grid & HSD/Petrol</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">GHG Protocol Scope Balance</div>
            <div className="text-sm font-bold text-white mt-1.5 flex items-center space-x-1.5 font-mono">
              <span className="text-emerald-400">S1: {summary ? summary.scope1Count : '—'}</span>
              <span className="text-slate-600">|</span>
              <span className="text-sky-400">S2: {summary ? summary.scope2Count : '—'}</span>
              <span className="text-slate-600">|</span>
              <span className="text-purple-400">S3: {summary ? summary.scope3Count : '—'}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Direct, Grid & Value-Chain</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Temporal Dataset Span</div>
            <div className="text-2xl font-black text-white mt-0.5 font-mono">
              {summary && summary.minYear && summary.maxYear
                ? summary.minYear === summary.maxYear
                  ? `FY ${summary.minYear}`
                  : `FY ${summary.minYear}–${summary.maxYear}`
                : 'Multi-Year'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Historical Versioning</div>
          </div>
        </div>
      </div>

      {/* Search, Multi-Filter & Layout Toolbar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        {/* Row 1: Search, Category Quick-Tabs, View Mode Toggle */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search across all factors by name, fuel, or activity key..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleFilterChange(setSearchQuery, '')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Category Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {['ALL', 'ELECTRICITY', 'FUEL', 'TRANSPORTATION', 'WASTE'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => handleFilterChange(setSelectedCategory, cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                  selectedCategory === cat
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                {cat === 'ALL' ? 'All Categories' : cat.charAt(0) + cat.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* View Mode Toggle (Cards vs Table) */}
          <div className="flex items-center space-x-1 p-1 rounded-xl bg-slate-950 border border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'cards'
                  ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-700/60 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'table'
                  ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-700/60 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Compact Table Comparison View"
            >
              <List className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>
        </div>

        {/* Row 2: Granular Filters & Sorting */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs text-slate-400">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Scope Filter */}
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500 font-medium">Scope:</span>
              <select
                value={selectedScope}
                onChange={(e) => handleFilterChange(setSelectedScope, e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-xs"
              >
                <option value="ALL">All Scopes</option>
                <option value="SCOPE_1">Scope 1 (Direct)</option>
                <option value="SCOPE_2">Scope 2 (Electricity)</option>
                <option value="SCOPE_3">Scope 3 (Value Chain)</option>
              </select>
            </div>

            {/* Country Filter */}
            <div className="flex items-center space-x-1.5">
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-500 font-medium">Country:</span>
              <select
                value={selectedCountry}
                onChange={(e) => handleFilterChange(setSelectedCountry, e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-xs"
              >
                <option value="ALL">All Countries</option>
                {summary?.countries?.map((c) => (
                  <option key={c} value={c}>
                    {c === 'IN' ? 'India (IN)' : c === 'GB' ? 'United Kingdom (GB)' : c === 'US' ? 'United States (US)' : c}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Filter */}
            <div className="flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-500 font-medium">Year:</span>
              <select
                value={selectedYear}
                onChange={(e) => handleFilterChange(setSelectedYear, e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-xs"
              >
                <option value="ALL">All Years</option>
                {summary?.years?.map((yr) => (
                  <option key={yr} value={yr}>
                    FY {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Source Organization Filter */}
            {summary?.organizations && summary.organizations.length > 0 && (
              <div className="flex items-center space-x-1.5">
                <Building className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-500 font-medium">Source:</span>
                <select
                  value={selectedOrg}
                  onChange={(e) => handleFilterChange(setSelectedOrg, e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs max-w-[160px] truncate"
                >
                  <option value="ALL">All Organizations</option>
                  {summary.organizations.map((org) => (
                    <option key={org} value={org}>
                      {org}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Sorting */}
            <div className="flex items-center space-x-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-500 font-medium">Sort:</span>
              <select
                value={`${sortBy}:${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split(':');
                  handleSortChange(field, order);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
              >
                <option value="category:asc">Category (Default)</option>
                <option value="name:asc">Activity Name (A–Z)</option>
                <option value="name:desc">Activity Name (Z–A)</option>
                <option value="year:desc">Reporting Year (Newest First)</option>
                <option value="year:asc">Reporting Year (Oldest First)</option>
                <option value="factor:asc">Factor Value (Low to High)</option>
                <option value="factor:desc">Factor Value (High to Low)</option>
              </select>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-emerald-400 hover:text-emerald-300 underline font-medium ml-1"
              >
                Reset filters
              </button>
            )}
          </div>

          {/* Record range display */}
          <div className="text-slate-400 font-mono text-[11px] font-medium">
            Showing <span className="text-white font-bold">{startItem}–{endItem}</span> of{' '}
            <span className="text-emerald-400 font-bold">{pagination.totalRecords}</span> matching factors
          </div>
        </div>
      </div>

      {/* Content Area: Cards View or Compact Table View */}
      {loading ? (
        <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
          <span className="text-sm font-medium">Loading statutory emission factors database...</span>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-red-950/50 border border-red-700/60 text-red-200 text-center space-y-2">
          <div className="font-semibold">{error}</div>
          <p className="text-xs text-red-300">
            Please verify connection to the carbon accounting repository.
          </p>
          <button
            type="button"
            onClick={() => loadFactors(page, pageSize)}
            className="px-4 py-1.5 rounded-lg bg-red-900/60 hover:bg-red-800 text-white text-xs font-semibold mt-2"
          >
            Retry Query
          </button>
        </div>
      ) : factors.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
          <Database className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-300 font-medium text-sm">No emission factors match the selected filters</p>
          <p className="text-slate-500 text-xs mt-1">Try broadening your search term or clearing filters.</p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-4 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold border border-slate-700 transition"
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        /* CARD GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {factors.map((factor) => {
            const isExpanded = expandedId === factor._id;

            return (
              <div
                key={factor._id}
                className="rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700/80 transition-all p-5 shadow-lg flex flex-col justify-between space-y-4"
              >
                <div>
                  {/* Top Badges Row */}
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                    <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                      <ScopeBadge scope={factor.scope} />
                      {getCountryBadge(factor.countryCode)}
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                        FY {factor.reportingYear}
                      </span>
                    </div>

                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                      Basis: {factor.gasBasis}
                    </span>
                  </div>

                  {/* Activity Title & Key */}
                  <div className="flex items-start space-x-2.5">
                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 shrink-0 mt-0.5">
                      {getCategoryIcon(factor.category)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white leading-snug">
                        {factor.activityName}
                      </h3>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Key: <span className="text-emerald-400/90">{factor.activityKey}</span>
                      </div>
                    </div>
                  </div>

                  {/* Factor Value Callout Banner */}
                  <div className="mt-4 p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/40 via-slate-950 to-slate-950 border border-emerald-700/40 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold block">
                        Verified Factor Value
                      </span>
                      <div className="flex items-baseline space-x-1.5 mt-0.5">
                        <span className="text-xl sm:text-2xl font-black text-white font-mono">
                          {factor.factorValue}
                        </span>
                        <span className="text-xs font-semibold text-emerald-300 font-mono">
                          {factor.factorUnit}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setCalcFactor(factor);
                        setCalcQuantity(1000);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/60 text-[11px] font-semibold flex items-center space-x-1 transition shadow-sm"
                      title="Calculate sample emissions with this factor"
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      <span>Illustrate</span>
                    </button>
                  </div>

                  {/* Summary Description */}
                  <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                    {factor.description || factor.methodology}
                  </p>

                  {/* Collapsible Details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-800 space-y-3 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[11px] uppercase tracking-wider font-semibold">
                          Methodology & Standards
                        </span>
                        <p className="text-slate-300 mt-0.5 leading-relaxed">
                          {factor.methodology}
                        </p>
                      </div>

                      {factor.limitations && (
                        <div>
                          <span className="text-slate-500 block text-[11px] uppercase tracking-wider font-semibold">
                            Limitations & Boundaries
                          </span>
                          <p className="text-amber-300/80 mt-0.5 leading-relaxed bg-amber-950/20 p-2 rounded-lg border border-amber-800/30">
                            {factor.limitations}
                          </p>
                        </div>
                      )}

                      <div>
                        <span className="text-slate-500 block text-[11px] uppercase tracking-wider font-semibold">
                          Official Provenance
                        </span>
                        <p className="text-slate-300 font-medium mt-0.5">
                          {factor.sourceOrganization} — <em>{factor.sourceDataset}</em>
                        </p>
                        {factor.sourceReference && (
                          <p className="text-slate-400 text-[11px] mt-0.5">
                            Ref: {factor.sourceReference}
                          </p>
                        )}
                        <a
                          href={factor.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center space-x-1 text-emerald-400 hover:underline mt-1 text-[11px]"
                        >
                          <span>Open Official Publication Source</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="text-[11px] text-slate-500 font-mono truncate max-w-[220px]">
                    Org: {factor.sourceOrganization}
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : factor._id)}
                    className="inline-flex items-center space-x-1 text-slate-400 hover:text-white transition text-[11px] font-medium"
                  >
                    <span>{isExpanded ? 'Less details' : 'Provenance & citations'}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* COMPACT TABLE VIEW */
        <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold text-[11px] bg-slate-950/60 font-mono">
                  <th className="py-3 px-3">Scope</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Activity Name / Key</th>
                  <th className="py-3 px-3">Factor Value & Unit</th>
                  <th className="py-3 px-3">Gas Basis</th>
                  <th className="py-3 px-3">Country</th>
                  <th className="py-3 px-3">Year</th>
                  <th className="py-3 px-3">Source Organization</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {factors.map((factor) => (
                  <tr key={factor._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 whitespace-nowrap">
                      <ScopeBadge scope={factor.scope} />
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5 font-medium text-slate-300">
                        {getCategoryIcon(factor.category)}
                        <span>{factor.category}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 max-w-xs">
                      <div className="font-semibold text-white truncate" title={factor.activityName}>
                        {factor.activityName}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono truncate">{factor.activityKey}</div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap font-mono">
                      <span className="font-bold text-emerald-400 text-sm">{factor.factorValue}</span>{' '}
                      <span className="text-slate-300 text-[11px]">{factor.factorUnit}</span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] text-slate-300">
                      {factor.gasBasis}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {getCountryBadge(factor.countryCode)}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap font-mono text-slate-300">
                      FY {factor.reportingYear}
                    </td>
                    <td className="py-3 px-3 text-slate-400 max-w-[180px] truncate" title={factor.sourceOrganization}>
                      {factor.sourceOrganization}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setCalcFactor(factor);
                          setCalcQuantity(1000);
                        }}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-emerald-950 text-slate-300 hover:text-emerald-300 border border-slate-700 text-[11px] font-semibold transition"
                      >
                        Illustrate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls Bar */}
      {pagination.totalPages > 1 && (
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center space-x-3 text-xs text-slate-400">
            <span>
              Page <strong className="text-white">{pagination.currentPage}</strong> of{' '}
              <strong className="text-white">{pagination.totalPages}</strong>
            </span>

            <span className="text-slate-600">|</span>

            <div className="flex items-center space-x-1.5">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  const newLimit = parseInt(e.target.value, 10);
                  setPageSize(newLimit);
                  setPage(1);
                }}
                className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
              >
                <option value={12}>12</option>
                <option value={24}>24</option>
                <option value={48}>48</option>
              </select>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              disabled={!pagination.hasPrevPage}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700 transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            {/* Smart Page Numbers */}
            <div className="flex items-center space-x-1">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter((p) => {
                  // Keep first, last, and within 1 page of current
                  return p === 1 || p === pagination.totalPages || Math.abs(p - pagination.currentPage) <= 1;
                })
                .map((p, idx, arr) => {
                  const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;

                  return (
                    <React.Fragment key={p}>
                      {showEllipsis && <span className="text-slate-600 px-1 text-xs">...</span>}
                      <button
                        type="button"
                        onClick={() => setPage(p)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition font-mono ${
                          pagination.currentPage === p
                            ? 'bg-emerald-600 text-white shadow'
                            : 'bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}
            </div>

            <button
              type="button"
              disabled={!pagination.hasNextPage}
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700 transition"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Interactive Calculation Modal for Illustration */}
      {calcFactor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-600/50">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Illustrative Calculation</h3>
                  <p className="text-xs text-slate-400 font-mono">{calcFactor.activityKey}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCalcFactor(null)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Sample Business Activity Quantity ({calcFactor.activityUnit})
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    step="any"
                    value={calcQuantity}
                    onChange={(e) => setCalcQuantity(parseFloat(e.target.value) || 0)}
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-xs text-slate-400 font-mono px-3 py-2 bg-slate-800 rounded-lg border border-slate-700">
                    {calcFactor.activityUnit}
                  </span>
                </div>
              </div>

              {/* Formula Card */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 font-mono text-xs">
                <div className="text-slate-400 text-[11px]">Calculation Formula:</div>
                <div className="text-slate-300 flex items-center space-x-2 flex-wrap">
                  <span className="text-white font-bold">{calcQuantity.toLocaleString()} {calcFactor.activityUnit}</span>
                  <span className="text-emerald-400">&times;</span>
                  <span className="text-white font-bold">{calcFactor.factorValue} {calcFactor.factorUnit}</span>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-baseline justify-between">
                  <span className="text-slate-400 text-xs">Resulting Carbon Emissions:</span>
                  <span className="text-xl font-black text-emerald-400">
                    {(calcQuantity * calcFactor.factorValue).toLocaleString(undefined, { maximumFractionDigits: 3 })} kg {calcFactor.gasBasis}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/50 leading-relaxed">
                <strong>Methodology:</strong> {calcFactor.methodology} ({calcFactor.sourceOrganization}, FY {calcFactor.reportingYear}).
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setCalcFactor(null)}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
