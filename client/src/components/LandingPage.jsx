import React, { useState } from 'react';
import {
  Zap,
  Flame,
  Truck,
  Package,
  Layers,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Building2,
  FileCheck2,
  Sliders,
  Sparkles,
  BarChart3,
  Cpu,
  ShieldCheck,
  TrendingDown,
  Activity,
  FileText,
  Check,
  Database,
  Share2,
  LineChart,
  Play,
  Compass,
} from 'lucide-react';

export function LandingPage({
  onOpenAuth,
  onNavigateToDataset,
  company,
  onEnterWorkspace,
}) {
  // 1. Orbital Telemetry Dial State
  const [orbitScope, setOrbitScope] = useState('ALL'); // 'ALL' | 'SCOPE_1' | 'SCOPE_2' | 'SCOPE_3'
  const [hoveredOrbitNode, setHoveredOrbitNode] = useState(null);

  // 2. Expanded Scope Card in Architectural Breadth
  const [inspectedScope, setInspectedScope] = useState(null); // null | 'scope1' | 'scope2' | 'scope3' | 'pipeline'

  // 3. Dashboard Time Filter State (CY 2024 | Trailing 12M | Baseline 2022)
  const [dashboardPeriod, setDashboardPeriod] = useState('CY_2024');

  // Chart Interactive Hover Month (0 to 11, default null)
  const [chartHoverMonth, setChartHoverMonth] = useState(null);

  // Monthly Chart Datasets
  const monthlyData = [
    { month: 'Jan', actual: 112.4, target: 118.0, variance: '-4.7%' },
    { month: 'Feb', actual: 108.6, target: 116.5, variance: '-6.8%' },
    { month: 'Mar', actual: 115.2, target: 115.0, variance: '+0.2%' },
    { month: 'Apr', actual: 104.8, target: 113.5, variance: '-7.7%' },
    { month: 'May', actual: 101.5, target: 112.0, variance: '-9.4%' },
    { month: 'Jun', actual: 106.2, target: 110.5, variance: '-3.9%' },
    { month: 'Jul', actual: 98.4, target: 109.0, variance: '-9.7%' },
    { month: 'Aug', actual: 95.8, target: 107.5, variance: '-10.9%' },
    { month: 'Sep', actual: 92.6, target: 106.0, variance: '-12.6%' },
    { month: 'Oct', actual: 89.4, target: 104.5, variance: '-14.4%' },
    { month: 'Nov', actual: 86.8, target: 103.0, variance: '-15.7%' },
    { month: 'Dec', actual: 83.2, target: 101.5, variance: '-18.0%' },
  ];

  // Dashboard Data Models based on period
  const dashboardData = {
    CY_2024: {
      total: '1,248.5',
      variance: '-14.2% YTD',
      ceiling: '1,420 tCO₂e',
      scope1: '184.2',
      scope1Share: '14.8%',
      scope2: '312.8',
      scope2Share: '25.0%',
      scope3: '751.5',
      scope3Share: '60.2%',
    },
    TRAILING_12M: {
      total: '1,312.0',
      variance: '-9.8% vs LY',
      ceiling: '1,450 tCO₂e',
      scope1: '198.6',
      scope1Share: '15.1%',
      scope2: '328.4',
      scope2Share: '25.0%',
      scope3: '785.0',
      scope3Share: '59.9%',
    },
    BASELINE_2022: {
      total: '1,455.2',
      variance: 'Baseline Datum',
      ceiling: '1,500 tCO₂e',
      scope1: '232.0',
      scope1Share: '15.9%',
      scope2: '381.2',
      scope2Share: '26.2%',
      scope3: '842.0',
      scope3Share: '57.9%',
    },
  };

  const activeMetrics = dashboardData[dashboardPeriod];

  // 4. Scope Mechanics Tab State ('scope1' | 'scope2' | 'scope3')
  const [activeScopeTab, setActiveScopeTab] = useState('scope1');
  const [scopeScenario, setScopeScenario] = useState({
    scope1: 'DIESEL',
    scope2: 'GRID',
    scope3: 'FREIGHT',
  });

  // Hover token in formula
  const [hoveredFormulaToken, setHoveredFormulaToken] = useState(null);

  // 5. Interactive Calculation Simulator State
  const [simCategory, setSimCategory] = useState('ELECTRICITY');
  const [simQuantity, setSimQuantity] = useState(2500);

  // 6. FAQ Accordion State
  const [expandedFaq, setExpandedFaq] = useState(0);

  // Simulation Presets
  const simPresets = {
    ELECTRICITY: {
      title: 'Grid Power (CEA)',
      unit: 'kWh',
      scopeLabel: 'Scope 2: Purchased Electricity',
      factorValue: 0.727,
      factorUnit: 'kg CO2/kWh',
      source: 'Central Electricity Authority (CEA)',
      dataset: 'Power Sector Baseline v20.0',
      min: 200,
      max: 15000,
      step: 100,
      icon: Zap,
    },
    DIESEL: {
      title: 'Generator Diesel',
      unit: 'Liters',
      scopeLabel: 'Scope 1: Direct Combustion',
      factorValue: 2.6444,
      factorUnit: 'kg CO2/liter',
      source: 'MoEFCC / India GHG Program',
      dataset: 'Liquid Petroleum Guidance',
      min: 50,
      max: 3000,
      step: 50,
      icon: Flame,
    },
    FREIGHT: {
      title: 'Road Haulage (HCV)',
      unit: 'Tonne-km',
      scopeLabel: 'Scope 3: Logistics (Cat 4)',
      factorValue: 0.052,
      factorUnit: 'kg CO2e/tonne-km',
      source: 'MoRTH / India GHG Program',
      dataset: 'Fleet Road Logistics Benchmarks',
      min: 500,
      max: 10000,
      step: 250,
      icon: Truck,
    },
    PACKAGING: {
      title: 'Paper Packaging',
      unit: 'kg',
      scopeLabel: 'Scope 3: Goods & Packaging (Cat 1)',
      factorValue: 0.842,
      factorUnit: 'kg CO2e/kg',
      source: 'ICCMA LCA Study',
      dataset: 'Recycled Corrugated Packaging LCA',
      min: 50,
      max: 2000,
      step: 50,
      icon: Package,
    },
  };

  const currentPreset = simPresets[simCategory];
  const calculatedKgCO2e = simQuantity * currentPreset.factorValue;
  const calculatedTonnesCO2e = (calculatedKgCO2e / 1000).toFixed(3);
  const treesRequired = Math.round(calculatedKgCO2e / 21.77);
  const dieselEquivalentLiters = (calculatedKgCO2e / 2.6444).toFixed(1);

  // Scope Mechanics Scenarios & Content
  const scopeDetailData = {
    scope1: {
      title: 'Direct Combustion & Fleet Fuels',
      badge: 'Scope 1: Physical Combustion',
      color: '#62dd9e',
      icon: Flame,
      scenarios: {
        DIESEL: {
          label: 'Diesel Genset',
          sampleName: 'Stationary Backup Diesel Genset',
          sampleIntake: 'Fuel receipt slip (HSD 500 PPM)',
          sampleVolume: '4,500 L',
          sampleFactor: '2.6444 kg/L (MoEFCC)',
          sampleTotal: '11.90 tCO₂e',
          formulaComponents: {
            volume: '4,500 L High-Speed Diesel',
            factor: '2.6444 kg CO₂/L (MoEFCC)',
            gwp: 'Direct stoichiometric mass balance',
          },
        },
        GAS: {
          label: 'Gas Boiler',
          sampleName: 'Industrial Steam Boiler',
          sampleIntake: 'Piped Gas (PNG) Utility Statement',
          sampleVolume: '8,200 SCM',
          sampleFactor: '1.928 kg/SCM',
          sampleTotal: '15.81 tCO₂e',
          formulaComponents: {
            volume: '8,200 SCM Piped Gas',
            factor: '1.928 kg CO₂/SCM',
            gwp: 'Net Calorific: 38.5 MJ/SCM',
          },
        },
      },
      description:
        'Scope 1 covers direct emissions from owned boilers, backup generators, and transport vehicles. CarbonIQ converts raw fuel volume into standard metric tonnes.',
      formula: 'Emissions (tCO₂e) = Volume × Fuel Density × Net Calorific Factor',
      primaryDriver: 'Generator Diesel & Gas',
      potential: '-32% via Electrification',
      pipelineSteps: [
        { title: '1. Intake', desc: 'Scan fuel slips or PNG gas bills' },
        { title: '2. Normalize', desc: 'Calibrate litres or SCM to mass' },
        { title: '3. Factors', desc: 'Match fuel grade to MoEFCC baseline' },
        { title: '4. Output', desc: 'Record audit-traceable Scope 1 total' },
      ],
    },
    scope2: {
      title: 'Dual-Method Electricity Accounting',
      badge: 'Scope 2: Purchased Energy',
      color: '#b5f568',
      icon: Zap,
      scenarios: {
        GRID: {
          label: 'Grid Baseline',
          sampleName: 'Substation 11kV Grid Feed',
          sampleIntake: 'State Discom Monthly Utility Invoice',
          sampleVolume: '62,400 kWh',
          sampleFactor: '0.727 kg/kWh (CEA v20.0)',
          sampleTotal: '45.36 tCO₂e',
          formulaComponents: {
            volume: '62,400 kWh Grid Power',
            factor: '0.727 kg CO₂/kWh (CEA v20.0)',
            gwp: 'Weighted National Grid Factor',
          },
        },
        SOLAR: {
          label: 'Solar PPA',
          sampleName: 'Rooftop Solar & Open Access PPA',
          sampleIntake: 'Renewable Wheeling Credit Invoice',
          sampleVolume: '45,000 kWh',
          sampleFactor: '0.000 kg/kWh (Market Zero)',
          sampleTotal: '0.00 tCO₂e',
          formulaComponents: {
            volume: '45,000 kWh Solar Ingest',
            factor: '0.000 kg CO₂/kWh (Green REC)',
            gwp: 'Contractual Market-Based Zero Scope 2',
          },
        },
      },
      description:
        'Scope 2 measures emissions from purchased electricity and cooling. CarbonIQ computes dual location (CEA national grid) and market-based renewable accounts.',
      formula: 'Emissions (tCO₂e) = kWh Consumption × National Grid Factor × (1 - RECs)',
      primaryDriver: 'Substation Utility Feeds',
      potential: '-85% via Green Energy PPAs',
      pipelineSteps: [
        { title: '1. Ingest', desc: 'Read monthly electricity bills' },
        { title: '2. Parse', desc: 'Isolate active billed kWh units' },
        { title: '3. Match', desc: 'Apply CEA v20.0 national baseline' },
        { title: '4. Dual Math', desc: 'Deliver location & market accounts' },
      ],
    },
    scope3: {
      title: '15-Category Value Chain Mapping',
      badge: 'Scope 3: Supply Chain',
      color: '#7dd9a3',
      icon: Truck,
      scenarios: {
        FREIGHT: {
          label: 'Road Haulage',
          sampleName: 'Inter-State Finished Goods Haulage',
          sampleIntake: 'Transporter Logistics Consignment Bilty',
          sampleVolume: '42,000 t.km',
          sampleFactor: '0.052 kg/t.km (MoRTH)',
          sampleTotal: '2.18 tCO₂e',
          formulaComponents: {
            volume: '42,000 Tonne-km Haulage',
            factor: '0.052 kg CO₂e/t.km (10-Wheeler)',
            gwp: 'Lifecycle Fuel Combustion',
          },
        },
        PACKAGING: {
          label: 'Packaging',
          sampleName: 'Corrugated Paper Packaging',
          sampleIntake: 'Supplier PO & Weight Receipt',
          sampleVolume: '5,000 kg',
          sampleFactor: '0.842 kg/kg (ICCMA)',
          sampleTotal: '4.21 tCO₂e',
          formulaComponents: {
            volume: '5,000 kg Paperboard',
            factor: '0.842 kg CO₂e/kg (Recycled)',
            gwp: 'Cradle-to-Gate Life Cycle',
          },
        },
      },
      description:
        'Scope 3 accounts for up to 80% of your footprint—covering raw packaging, third-party logistics, employee travel, and supply-chain procurement.',
      formula: 'Emissions (tCO₂e) = Quantity × Factor + Spend (₹) × EEIO Proxy',
      primaryDriver: 'Freight Couriers & Materials',
      potential: '-45% Supplier Engagement',
      pipelineSteps: [
        { title: '1. Bilties', desc: 'Ingest shipment weight & distances' },
        { title: '2. Assign', desc: 'Map to GHG Scope 3 Category 1–15' },
        { title: '3. Match', desc: 'Apply specialized LCA activity factors' },
        { title: '4. Certify', desc: 'Export audit files for BRSR & CBAM' },
      ],
    },
  };

  const activeScopeInfo = scopeDetailData[activeScopeTab];
  const activeScenarioKey = scopeScenario[activeScopeTab];
  const activeScenarioData = activeScopeInfo.scenarios[activeScenarioKey];

  const getNeedleAngle = () => {
    switch (orbitScope) {
      case 'SCOPE_1':
        return -45;
      case 'SCOPE_2':
        return 35;
      case 'SCOPE_3':
        return 135;
      case 'ALL':
      default:
        return -18;
    }
  };

  // Crisp FAQs
  const faqs = [
    {
      q: 'Which statutory frameworks does CarbonIQ support?',
      a: 'Natively aligned with GHG Protocol Corporate Standard, ISO 14064, and SEBI BRSR Core. Uses official Central Electricity Authority (CEA v20.0) national grid factors for Scope 2 accounting.',
    },
    {
      q: 'How does CarbonIQ prevent calculation errors?',
      a: 'Every uploaded record undergoes optical unit normalization with confidence scoring. If data is ambiguous, field verification is triggered. No synthetic values are generated.',
    },
    {
      q: 'Can we start without complex ERP integrations?',
      a: 'Yes. Simply upload PDF power bills, diesel slips, or logistics manifests. CarbonIQ extracts activity data autonomously and prepares audit-ready summaries.',
    },
    {
      q: 'How are renewable solar PPAs accounted for?',
      a: 'Dual-accounting under GHG Protocol: location-based accounting applies CEA grid factors (0.727 kg/kWh), while verified solar contracts register contractual zero market-based emissions.',
    },
  ];

  return (
    <div className="w-full relative overflow-hidden bg-[#06110d] selection:bg-[#b5f568] selection:text-[#102000] font-sans">
      {/* AMBIENT DYNAMIC ILLUMINATION & AUDIT GRID */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10rem] left-1/2 -translate-x-1/2 w-[54rem] h-[38rem] bg-gradient-to-b from-[#62dd9e]/15 via-[#b5f568]/10 to-transparent blur-3xl opacity-60" />
        <div className="absolute top-[50rem] -left-48 w-[38rem] h-[38rem] bg-[#16a36a]/10 rounded-full blur-[130px]" />
        <div className="absolute top-[105rem] -right-40 w-[42rem] h-[42rem] bg-[#b5f568]/10 rounded-full blur-[150px]" />

        <svg className="w-full h-full opacity-[0.035]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern height="48" id="audit-telemetry-grid" patternUnits="userSpaceOnUse" width="48">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#B4FFCD" strokeWidth="0.8" />
              <circle cx="0" cy="0" fill="#B4FFCD" r="1" />
            </pattern>
          </defs>
          <rect fill="url(#audit-telemetry-grid)" height="100%" width="100%" />
        </svg>
      </div>

      {/* SECTION 1: HERO SECTION */}
      <section className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 md:pt-14 pb-16 lg:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Crisp Narrative */}
          <div className="lg:col-span-7 flex flex-col items-start gap-5">
            {/* Live Engine Beacon */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#16221d]/90 backdrop-blur-md border border-[#b4ffcd]/15 hover:border-[#b5f568]/40 transition-colors">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#b5f568] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#b5f568]" />
              </span>
              <span className="font-mono text-[11px] text-[#b5f568] tracking-widest uppercase font-semibold">
                AI Carbon Telemetry
              </span>
            </div>

            {/* Headline */}
            <div className="flex flex-col gap-1.5">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#f2f8f3] tracking-tight leading-[1.08]">
                Know Your Carbon.{' '}
                <span className="block bg-gradient-to-r from-[#b5f568] via-[#7dd9a3] to-[#62dd9e] bg-clip-text text-transparent drop-shadow-[0_0_24px_rgba(181,245,104,0.35)]">
                  Change Your Impact.
                </span>
              </h1>
              <p className="text-sm sm:text-base text-[#9aada2] max-w-xl mt-1.5 leading-relaxed">
                Turn operational bills into audit-certified carbon intelligence. Continuously measure, disclose, and decarbonize across Scopes 1, 2, and 3.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1 w-full sm:w-auto">
              {company ? (
                <button
                  type="button"
                  onClick={onEnterWorkspace}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-xs sm:text-sm font-semibold bg-[#b5f568] text-[#102000] shadow-[0_0_24px_rgba(181,245,104,0.35)] hover:bg-[#9ad84f] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Enter Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenAuth && onOpenAuth('REGISTER')}
                  className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full text-xs sm:text-sm font-bold bg-gradient-to-r from-[#b5f568] via-[#a3f34f] to-[#62dd9e] text-[#07130f] shadow-[0_0_24px_rgba(181,245,104,0.4)] hover:shadow-[0_0_36px_rgba(181,245,104,0.65)] transition-all duration-300 hover:scale-[1.03] active:scale-[0.96] cursor-pointer"
                >
                  <span>Start Free</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                </button>
              )}

              <a
                href="#product-dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-xs sm:text-sm font-medium text-white bg-[#16221d]/70 backdrop-blur-2xl hover:bg-[#212c28] hover:border-[#62dd9e]/40 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 border border-[#b4ffcd]/15"
              >
                <Play className="w-3.5 h-3.5 text-[#62dd9e]" />
                <span>Console Tour</span>
              </a>

              {onNavigateToDataset && (
                <button
                  type="button"
                  onClick={onNavigateToDataset}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-full text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.04] hover:border-[#62dd9e]/30 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 border border-white/[0.08]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#62dd9e]" />
                  <span>Factor Directory (149+)</span>
                </button>
              )}
            </div>

            {/* Crisp Trust Signals Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 w-full">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#62dd9e] shrink-0" />
                <span className="font-mono text-xs text-slate-300">Scopes 1, 2 & 3 Suite</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <Cpu className="w-3.5 h-3.5 text-[#62dd9e] shrink-0" />
                <span className="font-mono text-xs text-slate-300">Multimodal Intake</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#62dd9e] shrink-0" />
                <span className="font-mono text-xs text-slate-300">CEA v20.0 Verified</span>
              </div>
            </div>
          </div>

          {/* Right Column: Orbital Telemetry Dial */}
          <div className="lg:col-span-5 relative flex flex-col items-center justify-center">
            {/* Scope Orbit Selector Tabs */}
            <div className="w-full max-w-[400px] flex items-center justify-between gap-1 p-1 mb-2.5 rounded-full bg-[#121e1a]/90 backdrop-blur-xl border border-white/[0.08] text-xs font-mono">
              <button
                type="button"
                onClick={() => setOrbitScope('ALL')}
                className={`flex-1 py-1 px-2 rounded-full text-center transition-all duration-200 ${
                  orbitScope === 'ALL'
                    ? 'bg-[#06110d] text-white border border-[#b4ffcd]/30 shadow-sm'
                    : 'text-[#9aada2] hover:text-white'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setOrbitScope('SCOPE_1')}
                className={`flex-1 py-1 px-2 rounded-full text-center transition-all duration-200 ${
                  orbitScope === 'SCOPE_1'
                    ? 'bg-[#16a36a]/25 text-[#62dd9e] border border-[#62dd9e]/40 shadow-sm'
                    : 'text-[#9aada2] hover:text-white'
                }`}
              >
                Scope 1
              </button>
              <button
                type="button"
                onClick={() => setOrbitScope('SCOPE_2')}
                className={`flex-1 py-1 px-2 rounded-full text-center transition-all duration-200 ${
                  orbitScope === 'SCOPE_2'
                    ? 'bg-[#b5f568]/20 text-[#b5f568] border border-[#b5f568]/40 shadow-sm'
                    : 'text-[#9aada2] hover:text-white'
                }`}
              >
                Scope 2
              </button>
              <button
                type="button"
                onClick={() => setOrbitScope('SCOPE_3')}
                className={`flex-1 py-1 px-2 rounded-full text-center transition-all duration-200 ${
                  orbitScope === 'SCOPE_3'
                    ? 'bg-[#7dd9a3]/20 text-[#7dd9a3] border border-[#7dd9a3]/40 shadow-sm'
                    : 'text-[#9aada2] hover:text-white'
                }`}
              >
                Scope 3
              </button>
            </div>

            {/* Orbital Dial Canvas */}
            <div className="relative w-full max-w-[400px] aspect-square flex items-center justify-center">
              <div
                className={`absolute inset-4 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
                  orbitScope === 'SCOPE_1'
                    ? 'bg-[#16a36a]/25'
                    : orbitScope === 'SCOPE_2'
                    ? 'bg-[#b5f568]/25'
                    : orbitScope === 'SCOPE_3'
                    ? 'bg-[#7dd9a3]/25'
                    : 'bg-[#62dd9e]/20'
                }`}
              />

              <svg className="w-full h-full select-none" fill="none" viewBox="0 0 400 400">
                <g className="animate-radar-sweep origin-center" style={{ transformOrigin: '200px 200px' }}>
                  <path d="M 200 200 L 200 30 A 170 170 0 0 1 320 80 Z" fill="url(#radar-cone-grad)" opacity="0.18" />
                </g>

                <circle
                  className={orbitScope === 'ALL' || orbitScope === 'SCOPE_3' ? 'animate-spin-slow' : ''}
                  cx="200"
                  cy="200"
                  r="165"
                  stroke="#7dd9a3"
                  strokeWidth={orbitScope === 'SCOPE_3' ? '3' : '1.5'}
                  strokeDasharray="6 8"
                  opacity={orbitScope === 'SCOPE_3' ? '0.9' : '0.4'}
                />

                <circle
                  cx="200"
                  cy="200"
                  r="125"
                  stroke="#b5f568"
                  strokeWidth={orbitScope === 'SCOPE_2' ? '3.5' : '1.8'}
                  opacity={orbitScope === 'SCOPE_2' ? '0.95' : '0.45'}
                />

                <circle
                  cx="200"
                  cy="200"
                  r="85"
                  stroke="#62dd9e"
                  strokeWidth={orbitScope === 'SCOPE_1' ? '3.5' : '1.8'}
                  strokeDasharray="4 4"
                  opacity={orbitScope === 'SCOPE_1' ? '0.95' : '0.5'}
                />

                {/* Scope 1 Node */}
                <g className="cursor-pointer group" onClick={() => setOrbitScope('SCOPE_1')}>
                  <circle cx="140" cy="140" r={orbitScope === 'SCOPE_1' ? '18' : '12'} fill="#16a36a" opacity="0.3" />
                  <circle cx="140" cy="140" r={orbitScope === 'SCOPE_1' ? '9' : '6'} fill="#62dd9e" />
                  <text x="115" y="132" fill="#62dd9e" fontSize="10" fontFamily="monospace" fontWeight="bold">S1</text>
                </g>

                {/* Scope 2 Node */}
                <g className="cursor-pointer group" onClick={() => setOrbitScope('SCOPE_2')}>
                  <circle cx="318" cy="160" r={orbitScope === 'SCOPE_2' ? '20' : '14'} fill="#b5f568" opacity="0.3" />
                  <circle cx="318" cy="160" r={orbitScope === 'SCOPE_2' ? '10' : '7'} fill="#b5f568" />
                  <text x="332" y="164" fill="#b5f568" fontSize="10" fontFamily="monospace" fontWeight="bold">S2</text>
                </g>

                {/* Scope 3 Node */}
                <g className="cursor-pointer group" onClick={() => setOrbitScope('SCOPE_3')}>
                  <circle cx="83" cy="317" r={orbitScope === 'SCOPE_3' ? '20' : '14'} fill="#7dd9a3" opacity="0.3" />
                  <circle cx="83" cy="317" r={orbitScope === 'SCOPE_3' ? '10' : '7'} fill="#7dd9a3" />
                  <text x="56" y="322" fill="#7dd9a3" fontSize="10" fontFamily="monospace" fontWeight="bold">S3</text>
                </g>

                {/* Dynamic Telemetry Needle */}
                <g
                  style={{
                    transformOrigin: '200px 200px',
                    transform: `rotate(${getNeedleAngle()}deg)`,
                    transition: 'transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  <path d="M 120 200 L 280 200" filter="drop-shadow(0 0 8px #b5f568)" opacity="0.4" stroke="#b5f568" strokeLinecap="round" strokeWidth="10" />
                  <path d="M 125 200 L 285 200" stroke="#b5f568" strokeLinecap="round" strokeWidth="5" />
                  <circle cx="285" cy="200" r="4" fill="#ffffff" />
                </g>

                {/* Central Crosshair & Pivot */}
                <g>
                  <circle cx="200" cy="200" r="26" fill="#121e1a" stroke="#b5f568" strokeWidth="2" opacity="0.9" />
                  <circle cx="200" cy="200" r="16" fill="#b5f568" />
                  <circle cx="200" cy="200" r="8" fill="#06110d" />
                </g>

                <defs>
                  <linearGradient id="radar-cone-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#b5f568" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#121e1a" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Top Floating Card */}
              <div
                onClick={() => setOrbitScope('SCOPE_2')}
                className="absolute -top-2 -right-2 sm:-right-3 p-3.5 rounded-2xl bg-[#16221d]/85 backdrop-blur-2xl border border-[#b4ffcd]/20 w-48 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-[#b5f568]/50 group"
              >
                <div className="flex items-center justify-between pb-1">
                  <span className="font-mono text-[10px] text-slate-400 uppercase">Footprint</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-[#121e1a] text-[#b5f568] font-mono text-[10px] font-semibold">
                    -18.4%
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-xl font-bold text-white group-hover:text-[#b5f568] transition-colors">12.84</span>
                  <span className="font-mono text-xs text-[#62dd9e]">tCO₂e</span>
                </div>
              </div>

              {/* Lower Floating Card */}
              <div
                onClick={() => setOrbitScope('SCOPE_3')}
                className="absolute -bottom-3 -left-2 sm:-left-4 p-3.5 rounded-2xl bg-[#16221d]/85 backdrop-blur-2xl border border-[#b4ffcd]/20 w-48 flex items-center gap-2.5 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-[#7dd9a3]/50 group"
              >
                <div className="relative w-10 h-10 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path className="text-slate-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.5" />
                    <path className="text-[#7dd9a3]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="64.2, 100" strokeLinecap="round" strokeWidth="3.5" />
                  </svg>
                  <span className="absolute font-mono text-[10px] text-white font-bold">64%</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-mono text-[9px] text-slate-400 uppercase">Scope 3</span>
                  <span className="text-xs text-white font-bold group-hover:text-[#7dd9a3] transition-colors">Value Chain</span>
                </div>
              </div>
            </div>

            {/* Readout Strip */}
            <div className="w-full max-w-[400px] mt-3 p-2.5 rounded-xl bg-[#16221d]/75 backdrop-blur-xl border border-white/[0.08] flex items-center justify-between font-mono text-xs">
              <span className="text-white text-[11px]">
                {orbitScope === 'SCOPE_1' && 'Scope 1: Direct Fuels'}
                {orbitScope === 'SCOPE_2' && 'Scope 2: Grid Power'}
                {orbitScope === 'SCOPE_3' && 'Scope 3: Logistics & Goods'}
                {orbitScope === 'ALL' && 'All Scopes: Integrated'}
              </span>
              <span className="text-[#b5f568] font-bold text-[11px]">
                {orbitScope === 'SCOPE_1' && '184.2 tCO₂e'}
                {orbitScope === 'SCOPE_2' && '312.8 tCO₂e'}
                {orbitScope === 'SCOPE_3' && '751.5 tCO₂e'}
                {orbitScope === 'ALL' && '1,248.5 tCO₂e'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: ARCHITECTURAL BREADTH STRIP */}
      <section className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-[#b4ffcd]/10">
            <div>
              <span className="font-mono text-xs text-[#62dd9e] uppercase tracking-widest font-semibold">
                01 // Architecture
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-0.5">
                Full-spectrum carbon accounting.
              </h2>
            </div>
            <p className="text-xs text-[#9aada2]">
              Click any scope below to inspect documentation boundaries.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1 */}
            <div
              onClick={() => {
                setInspectedScope(inspectedScope === 'scope1' ? null : 'scope1');
                setActiveScopeTab('scope1');
              }}
              className={`telemetry-card p-5 rounded-2xl flex flex-col justify-between group cursor-pointer transition-all duration-200 ${
                inspectedScope === 'scope1' ? 'border-[#62dd9e] scope1-glow bg-[#16221d]/90' : ''
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <span className="font-mono text-[10px] text-[#62dd9e] px-2 py-0.5 bg-[#16a36a]/15 rounded-full font-semibold border border-[#62dd9e]/20">
                    SCOPE 01
                  </span>
                  <Flame className="w-4 h-4 text-slate-400 group-hover:text-[#62dd9e] transition-colors" />
                </div>
                <h3 className="text-sm font-bold text-white mt-4 group-hover:text-[#62dd9e] transition-colors">
                  Direct Combustion
                </h3>
                <p className="text-xs text-[#9aada2] mt-1 leading-relaxed">
                  Backup diesel generators, furnaces, natural gas, and transport fuels.
                </p>
              </div>
              <div className="mt-4 pt-2.5 border-t border-[#b4ffcd]/10 flex items-center justify-between text-[#9aada2] font-mono text-[10px]">
                <span className="text-[#7dd9a3]">Fuel & Mobile</span>
                <span className="flex items-center gap-1 group-hover:text-white">
                  Inspect <ChevronDown className={`w-3 h-3 ${inspectedScope === 'scope1' ? 'rotate-180' : ''}`} />
                </span>
              </div>
            </div>

            {/* Card 2 */}
            <div
              onClick={() => {
                setInspectedScope(inspectedScope === 'scope2' ? null : 'scope2');
                setActiveScopeTab('scope2');
              }}
              className={`telemetry-card p-5 rounded-2xl flex flex-col justify-between group cursor-pointer transition-all duration-200 ${
                inspectedScope === 'scope2' ? 'border-[#b5f568] scope2-glow bg-[#16221d]/90' : ''
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <span className="font-mono text-[10px] text-[#b5f568] px-2 py-0.5 bg-[#b5f568]/15 rounded-full font-semibold border border-[#b5f568]/20">
                    SCOPE 02
                  </span>
                  <Zap className="w-4 h-4 text-slate-400 group-hover:text-[#b5f568] transition-colors" />
                </div>
                <h3 className="text-sm font-bold text-white mt-4 group-hover:text-[#b5f568] transition-colors">
                  Purchased Power
                </h3>
                <p className="text-xs text-[#9aada2] mt-1 leading-relaxed">
                  Substation electricity, CEA national grid baseline, and solar open-access.
                </p>
              </div>
              <div className="mt-4 pt-2.5 border-t border-[#b4ffcd]/10 flex items-center justify-between text-[#9aada2] font-mono text-[10px]">
                <span className="text-[#b5f568]">CEA v20.0</span>
                <span className="flex items-center gap-1 group-hover:text-white">
                  Inspect <ChevronDown className={`w-3 h-3 ${inspectedScope === 'scope2' ? 'rotate-180' : ''}`} />
                </span>
              </div>
            </div>

            {/* Card 3 */}
            <div
              onClick={() => {
                setInspectedScope(inspectedScope === 'scope3' ? null : 'scope3');
                setActiveScopeTab('scope3');
              }}
              className={`telemetry-card p-5 rounded-2xl flex flex-col justify-between group cursor-pointer transition-all duration-200 ${
                inspectedScope === 'scope3' ? 'border-[#7dd9a3] scope3-glow bg-[#16221d]/90' : ''
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <span className="font-mono text-[10px] text-[#7dd9a3] px-2 py-0.5 bg-[#7dd9a3]/15 rounded-full font-semibold border border-[#7dd9a3]/20">
                    SCOPE 03
                  </span>
                  <Truck className="w-4 h-4 text-slate-400 group-hover:text-[#7dd9a3] transition-colors" />
                </div>
                <h3 className="text-sm font-bold text-white mt-4 group-hover:text-[#7dd9a3] transition-colors">
                  Value Chain
                </h3>
                <p className="text-xs text-[#9aada2] mt-1 leading-relaxed">
                  Road haulage, corrugated packaging, raw materials, and couriers.
                </p>
              </div>
              <div className="mt-4 pt-2.5 border-t border-[#b4ffcd]/10 flex items-center justify-between text-[#9aada2] font-mono text-[10px]">
                <span className="text-[#7dd9a3]">15 GHG Cats</span>
                <span className="flex items-center gap-1 group-hover:text-white">
                  Inspect <ChevronDown className={`w-3 h-3 ${inspectedScope === 'scope3' ? 'rotate-180' : ''}`} />
                </span>
              </div>
            </div>

            {/* Card 4 */}
            <div
              onClick={() => setInspectedScope(inspectedScope === 'pipeline' ? null : 'pipeline')}
              className={`telemetry-card p-5 rounded-2xl flex flex-col justify-between group cursor-pointer transition-all duration-200 ${
                inspectedScope === 'pipeline' ? 'border-[#b5f568] glow-lime-sm bg-[#16221d]/90' : ''
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <span className="font-mono text-[10px] text-[#b5f568] px-2 py-0.5 bg-[#b5f568]/15 rounded-full font-semibold border border-[#b5f568]/20">
                    PIPELINE
                  </span>
                  <Cpu className="w-4 h-4 text-slate-400 group-hover:text-[#b5f568] transition-colors" />
                </div>
                <h3 className="text-sm font-bold text-white mt-4 group-hover:text-[#b5f568] transition-colors">
                  Assisted Ingestion
                </h3>
                <p className="text-xs text-[#9aada2] mt-1 leading-relaxed">
                  Autonomous document OCR with confidence safeguards and unit calibration.
                </p>
              </div>
              <div className="mt-4 pt-2.5 border-t border-[#b4ffcd]/10 flex items-center justify-between text-[#9aada2] font-mono text-[10px]">
                <span className="text-[#b5f568]">98.4% Match</span>
                <span className="flex items-center gap-1 group-hover:text-white">
                  Inspect <ChevronDown className={`w-3 h-3 ${inspectedScope === 'pipeline' ? 'rotate-180' : ''}`} />
                </span>
              </div>
            </div>
          </div>

          {/* Quick Inspection Drawer */}
          {inspectedScope && (
            <div className="p-5 rounded-2xl bg-[#121e1a] border border-[#b4ffcd]/25 text-xs font-mono">
              <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.08]">
                <span className="text-white font-bold">
                  {inspectedScope === 'scope1' && 'Scope 1 Ingestion Boundary'}
                  {inspectedScope === 'scope2' && 'Scope 2 Dual-Accounting Guidance'}
                  {inspectedScope === 'scope3' && 'Scope 3 Supply Chain Ingestion'}
                  {inspectedScope === 'pipeline' && 'OCR Extraction Architecture'}
                </span>
                <button
                  type="button"
                  onClick={() => setInspectedScope(null)}
                  className="text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-white/[0.04]"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 text-[11px] text-[#9aada2]">
                <div>
                  <span className="text-[#62dd9e] font-semibold block mb-0.5">Documents:</span>
                  {inspectedScope === 'scope1' && 'Diesel invoices, generator logs, natural gas utility bills.'}
                  {inspectedScope === 'scope2' && 'State Discom electricity bills, solar wheeling credit notes.'}
                  {inspectedScope === 'scope3' && 'Transporter bilties, consignment notes, packaging slips.'}
                  {inspectedScope === 'pipeline' && 'PDF invoices, scanned meter slips, and logistics CSVs.'}
                </div>
                <div>
                  <span className="text-[#b5f568] font-semibold block mb-0.5">Factor Source:</span>
                  {inspectedScope === 'scope1' && 'MoEFCC technical fuel guidance (Diesel: 2.6444 kg/L).'}
                  {inspectedScope === 'scope2' && 'CEA v20.0 National Power Grid factor (0.727 kg/kWh).'}
                  {inspectedScope === 'scope3' && 'MoRTH road transport and ICCMA packaging LCA factors.'}
                  {inspectedScope === 'pipeline' && '149+ verified national factors with vintage matching.'}
                </div>
                <div>
                  <span className="text-[#7dd9a3] font-semibold block mb-0.5">Verification:</span>
                  {inspectedScope === 'scope1' && 'Fuel mass checks and calorific conversions applied.'}
                  {inspectedScope === 'scope2' && 'Dual location- and market-based compliance reporting.'}
                  {inspectedScope === 'scope3' && 'Hybrid EEIO spend proxy estimation for tier-2 items.'}
                  {inspectedScope === 'pipeline' && 'Human-in-the-loop review modal for low confidence.'}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 3: THE PROBLEM SOLVED */}
      <section className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex flex-col gap-8">
          <div className="max-w-2xl">
            <span className="font-mono text-xs text-[#b5f568] uppercase tracking-widest font-semibold">
              02 // The Problem Solved
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
              Carbon accounting shouldn't be complicated.
            </h2>
            <p className="text-xs sm:text-sm text-[#9aada2] mt-1.5 leading-relaxed">
              Turn scattered operations paperwork into an audit-ready, structured emissions console.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative">
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-[2px] bg-gradient-to-r from-[#62dd9e]/10 via-[#b5f568]/30 to-[#62dd9e]/10 -translate-y-12 pointer-events-none z-0" />

            <div className="telemetry-card p-5 rounded-2xl relative z-10 flex flex-col justify-between group">
              <div>
                <div className="w-9 h-9 rounded-xl bg-[#121e1a] flex items-center justify-center text-[#62dd9e] font-mono text-xs font-bold mb-3 shadow-inner border border-[#62dd9e]/30">
                  01
                </div>
                <h3 className="text-sm font-bold text-white group-hover:text-[#62dd9e] transition-colors">
                  Scattered Enterprise Data
                </h3>
                <p className="text-xs text-[#9aada2] mt-1">
                  Utility bills, diesel slips, and logistics manifests ingested without manual rekeying.
                </p>
              </div>

              <div className="mt-4 p-2.5 rounded-xl bg-[#06110d]/80 border border-white/[0.06] flex flex-col gap-1.5 font-mono text-[11px]">
                <div className="flex items-center justify-between px-2 py-1 rounded bg-[#121e1a] text-slate-300">
                  <span className="truncate max-w-[130px]">Discom_Billing.pdf</span>
                  <span className="text-[#b5f568] font-bold">14,200 kWh</span>
                </div>
                <div className="flex items-center justify-between px-2 py-1 rounded bg-[#121e1a] text-slate-300">
                  <span className="truncate max-w-[130px]">Diesel_Fleet.csv</span>
                  <span className="text-[#b5f568] font-bold">1,850 L</span>
                </div>
              </div>
            </div>

            <div className="telemetry-card p-5 rounded-2xl relative z-10 flex flex-col justify-between border-[#b4ffcd]/25 group">
              <div>
                <div className="w-9 h-9 rounded-xl bg-[#b5f568]/15 flex items-center justify-center text-[#b5f568] font-mono text-xs font-bold mb-3 shadow-inner border border-[#b5f568]/40">
                  02
                </div>
                <h3 className="text-sm font-bold text-white group-hover:text-[#b5f568] transition-colors">
                  Intelligent Factor Parsing
                </h3>
                <p className="text-xs text-[#9aada2] mt-1">
                  Auto-matched against verified sovereign factors (CEA v20.0, MoEFCC, DESNZ).
                </p>
              </div>

              <div className="mt-4 p-2.5 rounded-xl bg-[#06110d]/80 border border-white/[0.06] flex flex-col gap-1.5 font-mono text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Match Confidence</span>
                  <span className="text-[#b5f568] font-bold">98.4% Matched</span>
                </div>
                <div className="w-full bg-[#121e1a] rounded-full h-1.5 overflow-hidden">
                  <div className="bg-[#b5f568] h-full rounded-full w-[98%]" />
                </div>
                <span className="text-[10px] text-[#7dd9a3] truncate">CEA v20.0 National Power Grid</span>
              </div>
            </div>

            <div className="telemetry-card p-5 rounded-2xl relative z-10 flex flex-col justify-between group">
              <div>
                <div className="w-9 h-9 rounded-xl bg-[#121e1a] flex items-center justify-center text-[#62dd9e] font-mono text-xs font-bold mb-3 shadow-inner border border-[#62dd9e]/30">
                  03
                </div>
                <h3 className="text-sm font-bold text-white group-hover:text-[#62dd9e] transition-colors">
                  Audit-Ready Actionable Clarity
                </h3>
                <p className="text-xs text-[#9aada2] mt-1">
                  Export filings for BRSR Core, ISO 14064, and simulate decarbonization scenarios.
                </p>
              </div>

              <div className="mt-4 p-2.5 rounded-xl bg-[#06110d]/80 border border-white/[0.06] flex items-center justify-between font-mono">
                <div>
                  <span className="text-[9px] text-slate-400 uppercase block">Target Variance</span>
                  <span className="text-xs font-bold text-[#62dd9e]">-18.2% vs FY22</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#16a36a]/15 text-[#62dd9e] text-[10px] font-semibold border border-[#62dd9e]/30">
                  Audit Ready
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: PRODUCT PREVIEW DASHBOARD */}
      <section className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14" id="product-dashboard">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
            <div>
              <span className="font-mono text-xs text-[#62dd9e] uppercase tracking-widest font-semibold">
                03 // Mission Control
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-0.5">
                Real-time decarbonization telemetry.
              </h2>
            </div>

            <div className="flex items-center gap-1 bg-[#16221d]/80 p-1 rounded-full border border-white/[0.08]">
              <button
                type="button"
                onClick={() => setDashboardPeriod('CY_2024')}
                className={`px-3 py-1 rounded-full font-mono text-xs font-semibold transition-all duration-150 active:scale-95 ${
                  dashboardPeriod === 'CY_2024'
                    ? 'bg-[#06110d] text-[#b5f568] border border-[#b4ffcd]/25 shadow-sm'
                    : 'text-[#9aada2] hover:text-white'
                }`}
              >
                CY 2024
              </button>
              <button
                type="button"
                onClick={() => setDashboardPeriod('TRAILING_12M')}
                className={`px-3 py-1 rounded-full font-mono text-xs font-semibold transition-all duration-150 active:scale-95 ${
                  dashboardPeriod === 'TRAILING_12M'
                    ? 'bg-[#06110d] text-[#b5f568] border border-[#b4ffcd]/25 shadow-sm'
                    : 'text-[#9aada2] hover:text-white'
                }`}
              >
                Trailing 12M
              </button>
              <button
                type="button"
                onClick={() => setDashboardPeriod('BASELINE_2022')}
                className={`px-3 py-1 rounded-full font-mono text-xs font-semibold transition-all duration-150 active:scale-95 ${
                  dashboardPeriod === 'BASELINE_2022'
                    ? 'bg-[#06110d] text-[#b5f568] border border-[#b4ffcd]/25 shadow-sm'
                    : 'text-[#9aada2] hover:text-white'
                }`}
              >
                Baseline 2022
              </button>
            </div>
          </div>

          <div className="p-5 md:p-6 rounded-3xl bg-[#0b1b14]/90 backdrop-blur-2xl shadow-2xl border border-[#b4ffcd]/15 flex flex-col gap-5">
            {/* 4 KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="p-3.5 rounded-xl bg-[#16221d]/70 border border-white/[0.06] flex flex-col">
                <div className="flex items-center justify-between text-[#9aada2]">
                  <span className="font-mono text-[9px] uppercase">Total Emissions</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-[#121e1a] text-[#b5f568] font-mono text-[9px] font-semibold">
                    {activeMetrics.variance}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-mono text-2xl font-extrabold text-white">{activeMetrics.total}</span>
                  <span className="font-mono text-xs text-[#62dd9e]">tCO₂e</span>
                </div>
                <span className="font-mono text-[9px] text-[#9aada2] mt-1">Ceiling: {activeMetrics.ceiling}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#16221d]/70 border border-white/[0.06] flex flex-col">
                <div className="flex items-center justify-between text-[#9aada2]">
                  <span className="font-mono text-[9px] uppercase">Scope 1 (Direct)</span>
                  <span className="font-mono text-[9px] text-[#62dd9e] font-semibold">{activeMetrics.scope1Share}</span>
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-mono text-2xl font-extrabold text-white">{activeMetrics.scope1}</span>
                  <span className="font-mono text-xs text-[#62dd9e]">tCO₂e</span>
                </div>
                <span className="font-mono text-[9px] text-[#9aada2] mt-1">Generators & Fleet</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#16221d]/70 border border-white/[0.06] flex flex-col">
                <div className="flex items-center justify-between text-[#9aada2]">
                  <span className="font-mono text-[9px] uppercase">Scope 2 (Power)</span>
                  <span className="font-mono text-[9px] text-[#b5f568] font-semibold">{activeMetrics.scope2Share}</span>
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-mono text-2xl font-extrabold text-white">{activeMetrics.scope2}</span>
                  <span className="font-mono text-xs text-[#b5f568]">tCO₂e</span>
                </div>
                <span className="font-mono text-[9px] text-[#9aada2] mt-1">CEA Grid Baseline</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#16221d]/70 border border-white/[0.06] flex flex-col">
                <div className="flex items-center justify-between text-[#9aada2]">
                  <span className="font-mono text-[9px] uppercase">Scope 3 (Value Chain)</span>
                  <span className="font-mono text-[9px] text-[#7dd9a3] font-semibold">{activeMetrics.scope3Share}</span>
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-mono text-2xl font-extrabold text-white">{activeMetrics.scope3}</span>
                  <span className="font-mono text-xs text-[#7dd9a3]">tCO₂e</span>
                </div>
                <span className="font-mono text-[9px] text-[#9aada2] mt-1">Freight & Suppliers</span>
              </div>
            </div>

            {/* Trajectory & Categories */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-8 p-5 rounded-2xl bg-[#16221d]/60 border border-white/[0.08] flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white">Monthly Emissions Trajectory</h4>
                    <p className="text-[11px] text-[#9aada2]">
                      {chartHoverMonth !== null ? (
                        <span className="text-[#b5f568] font-mono font-semibold">
                          {monthlyData[chartHoverMonth].month}: {monthlyData[chartHoverMonth].actual} tCO₂e actual ({monthlyData[chartHoverMonth].variance})
                        </span>
                      ) : (
                        'Actual emissions vs SBTi 1.5°C Paris aligned target'
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-[10px]">
                    <span className="flex items-center gap-1 text-white">
                      <span className="w-2.5 h-0.5 bg-[#62dd9e]" /> Actual
                    </span>
                    <span className="flex items-center gap-1 text-[#b5f568]">
                      <span className="w-2.5 h-0.5 border-t border-dashed border-[#b5f568]" /> Target
                    </span>
                  </div>
                </div>

                <div className="w-full h-48 relative">
                  <svg className="w-full h-full" fill="none" viewBox="0 0 700 220">
                    <line stroke="#212c28" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="700" y1="40" y2="40" />
                    <line stroke="#212c28" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="700" y1="90" y2="90" />
                    <line stroke="#212c28" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="700" y1="140" y2="140" />
                    <line stroke="#212c28" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="700" y1="190" y2="190" />

                    <path
                      d="M 30 70 L 90 74 L 150 78 L 210 82 L 270 90 L 330 96 L 390 102 L 450 110 L 510 118 L 570 125 L 630 134 L 680 142"
                      opacity="0.8"
                      stroke="#b5f568"
                      strokeDasharray="6 6"
                      strokeWidth="2"
                    />

                    <path
                      d="M 30 65 L 90 70 L 150 62 L 210 88 L 270 94 L 330 82 L 390 108 L 450 114 L 510 126 L 570 138 L 630 148 L 680 160 L 680 200 L 30 200 Z"
                      fill="url(#carbon-gradient-fill)"
                      opacity="0.35"
                    />

                    <path
                      d="M 30 65 L 90 70 L 150 62 L 210 88 L 270 94 L 330 82 L 390 108 L 450 114 L 510 126 L 570 138 L 630 148 L 680 160"
                      stroke="#62dd9e"
                      strokeLinecap="round"
                      strokeWidth="3"
                    />

                    <circle cx="510" cy="126" fill="#b5f568" r="5" />
                    <circle cx="510" cy="126" opacity="0.6" r="9" stroke="#b5f568" strokeWidth="1.5" />

                    <defs>
                      <linearGradient id="carbon-gradient-fill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#62dd9e" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#06110d" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                  </svg>

                  <div className="flex justify-between font-mono text-[9px] text-[#9aada2] pt-1">
                    {monthlyData.map((d, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onMouseEnter={() => setChartHoverMonth(idx)}
                        onMouseLeave={() => setChartHoverMonth(null)}
                        className={`px-1 rounded transition-colors ${
                          chartHoverMonth === idx ? 'bg-[#b5f568] text-[#102000] font-bold' : 'hover:text-white'
                        }`}
                      >
                        {d.month}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="lg:col-span-4 p-5 rounded-2xl bg-[#16221d]/60 border border-white/[0.08] flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Top Operational Contributors</h4>
                  <p className="text-[11px] text-[#9aada2]">Footprint share by activity</p>
                </div>

                <div className="flex flex-col gap-3 my-3 font-mono text-xs">
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-white">Commercial Grid</span>
                      <span className="text-[#b5f568] font-bold">35%</span>
                    </div>
                    <div className="w-full bg-[#121e1a] rounded-full h-1.5 overflow-hidden">
                      <div className="bg-[#b5f568] h-full rounded-full w-[35%]" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-white">Road Logistics</span>
                      <span className="text-[#62dd9e] font-bold">30%</span>
                    </div>
                    <div className="w-full bg-[#121e1a] rounded-full h-1.5 overflow-hidden">
                      <div className="bg-[#62dd9e] h-full rounded-full w-[30%]" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-white">Generator Fuel</span>
                      <span className="text-[#7dd9a3] font-bold">21%</span>
                    </div>
                    <div className="w-full bg-[#121e1a] rounded-full h-1.5 overflow-hidden">
                      <div className="bg-[#7dd9a3] h-full rounded-full w-[21%]" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-white">Packaging</span>
                      <span className="text-slate-400 font-bold">14%</span>
                    </div>
                    <div className="w-full bg-[#121e1a] rounded-full h-1.5 overflow-hidden">
                      <div className="bg-slate-500 h-full rounded-full w-[14%]" />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#b4ffcd]/10 flex items-center justify-between text-[#9aada2] font-mono text-[9px]">
                  <span>Operational Coverage: 100%</span>
                  <span className="text-[#62dd9e] font-semibold">GHG Protocol</span>
                </div>
              </div>
            </div>

            {/* Ingestion Ledger */}
            <div className="flex flex-col gap-2 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">Live Ingestion Ledger</span>
                <span className="text-[10px] text-[#b5f568] font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#b5f568] animate-pulse" /> Continuous Match
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl bg-[#06110d]/90 border border-white/[0.06]">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-[#121e1a] text-[#9aada2] uppercase text-[9px]">
                    <tr>
                      <th className="px-3 py-2">Activity</th>
                      <th className="px-3 py-2">Scope</th>
                      <th className="px-3 py-2">Quantity</th>
                      <th className="px-3 py-2">Factor Citation</th>
                      <th className="px-3 py-2 text-right">tCO₂e</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05] text-slate-200 text-[11px]">
                    <tr className="hover:bg-[#16221d] transition-colors">
                      <td className="px-3 py-2 font-semibold text-white">Plant 1 HT Power Grid</td>
                      <td className="px-3 py-2 text-slate-400">Scope 2</td>
                      <td className="px-3 py-2">48,200 kWh</td>
                      <td className="px-3 py-2 text-[#7dd9a3]">CEA v20.0 National</td>
                      <td className="px-3 py-2 text-right font-bold text-[#b5f568]">35.04</td>
                    </tr>
                    <tr className="hover:bg-[#16221d] transition-colors">
                      <td className="px-3 py-2 font-semibold text-white">Captive Generator Diesel</td>
                      <td className="px-3 py-2 text-slate-400">Scope 1</td>
                      <td className="px-3 py-2">2,400 L</td>
                      <td className="px-3 py-2 text-[#7dd9a3]">MoEFCC Base</td>
                      <td className="px-3 py-2 text-right font-bold text-[#62dd9e]">6.35</td>
                    </tr>
                    <tr className="hover:bg-[#16221d] transition-colors">
                      <td className="px-3 py-2 font-semibold text-white">Finished Goods Haulage</td>
                      <td className="px-3 py-2 text-slate-400">Scope 3</td>
                      <td className="px-3 py-2">18,500 t.km</td>
                      <td className="px-3 py-2 text-[#7dd9a3]">MoRTH Heavy Truck</td>
                      <td className="px-3 py-2 text-right font-bold text-[#7dd9a3]">0.96</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: HOW IT WORKS STEP TIMELINE */}
      <section className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14" id="how-it-works">
        <div className="flex flex-col gap-8">
          <div className="text-center max-w-2xl mx-auto">
            <span className="font-mono text-xs text-[#62dd9e] uppercase tracking-widest font-semibold">
              04 // Workflow
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
              From raw documents to certified carbon clarity.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="telemetry-card p-5 rounded-2xl flex flex-col justify-between group">
              <div>
                <span className="font-mono text-xl font-bold text-[#b5f568]">01</span>
                <h3 className="text-sm font-bold text-white mt-2 group-hover:text-[#62dd9e]">Ingest</h3>
                <p className="text-xs text-[#9aada2] mt-1">Upload utility bills, diesel slips, or logistics bilties.</p>
              </div>
              <div className="mt-3 pt-2 border-t border-[#b4ffcd]/10 font-mono text-[9px] text-[#7dd9a3]">• Multi-Format Intake</div>
            </div>

            <div className="telemetry-card p-5 rounded-2xl flex flex-col justify-between group">
              <div>
                <span className="font-mono text-xl font-bold text-[#b5f568]">02</span>
                <h3 className="text-sm font-bold text-white mt-2 group-hover:text-[#62dd9e]">Extract</h3>
                <p className="text-xs text-[#9aada2] mt-1">Autonomous unit extraction (kWh, litres, tonne-km).</p>
              </div>
              <div className="mt-3 pt-2 border-t border-[#b4ffcd]/10 font-mono text-[9px] text-[#7dd9a3]">• Zero Rekeying</div>
            </div>

            <div className="telemetry-card p-5 rounded-2xl flex flex-col justify-between group">
              <div>
                <span className="font-mono text-xl font-bold text-[#b5f568]">03</span>
                <h3 className="text-sm font-bold text-white mt-2 group-hover:text-[#62dd9e]">Compute</h3>
                <p className="text-xs text-[#9aada2] mt-1">Factors dynamically matched from official CEA/MoEFCC databases.</p>
              </div>
              <div className="mt-3 pt-2 border-t border-[#b4ffcd]/10 font-mono text-[9px] text-[#7dd9a3]">• Traceable Math</div>
            </div>

            <div className="telemetry-card p-5 rounded-2xl flex flex-col justify-between group">
              <div>
                <span className="font-mono text-xl font-bold text-[#b5f568]">04</span>
                <h3 className="text-sm font-bold text-white mt-2 group-hover:text-[#62dd9e]">Disclose</h3>
                <p className="text-xs text-[#9aada2] mt-1">Export audit-ready reports formatted for BRSR Core and CBAM.</p>
              </div>
              <div className="mt-3 pt-2 border-t border-[#b4ffcd]/10 font-mono text-[9px] text-[#7dd9a3]">• 1-Click Export</div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: INTERACTIVE SCOPE MECHANICS */}
      <section className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14" id="scope-mechanics">
        <div className="p-5 md:p-8 rounded-3xl bg-[#0b1b14]/90 backdrop-blur-2xl shadow-2xl border border-[#b4ffcd]/20 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
            <div>
              <span className="font-mono text-xs text-[#62dd9e] uppercase tracking-widest font-semibold flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5" />
                05 // Scope Mechanics
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-0.5">
                Statutory Scope Calculation Lab
              </h2>
            </div>

            {/* Scope Tabs */}
            <div className="inline-flex p-1 rounded-full bg-[#16221d]/90 border border-white/[0.08]" role="tablist">
              <button
                type="button"
                onClick={() => setActiveScopeTab('scope1')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full font-mono text-xs font-semibold transition-all duration-150 active:scale-95 ${
                  activeScopeTab === 'scope1' ? 'bg-[#62dd9e] text-[#06110d]' : 'text-[#9aada2] hover:text-white'
                }`}
              >
                <Flame className="w-3 h-3" />
                <span>Scope 1</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveScopeTab('scope2')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full font-mono text-xs font-semibold transition-all duration-150 active:scale-95 ${
                  activeScopeTab === 'scope2' ? 'bg-[#b5f568] text-[#102000]' : 'text-[#9aada2] hover:text-white'
                }`}
              >
                <Zap className="w-3 h-3" />
                <span>Scope 2</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveScopeTab('scope3')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full font-mono text-xs font-semibold transition-all duration-150 active:scale-95 ${
                  activeScopeTab === 'scope3' ? 'bg-[#7dd9a3] text-[#06110d]' : 'text-[#9aada2] hover:text-white'
                }`}
              >
                <Truck className="w-3 h-3" />
                <span>Scope 3</span>
              </button>
            </div>
          </div>

          {/* 4-Stage Connected Process Pipeline */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
            {activeScopeInfo.pipelineSteps.map((step, idx) => (
              <div key={idx} className="p-2.5 rounded-xl bg-[#121e1a] border border-white/[0.04]">
                <span className="text-[#62dd9e] font-bold block">{step.title}</span>
                <span className="text-[10px] text-[#9aada2] mt-0.5 block">{step.desc}</span>
              </div>
            ))}
          </div>

          {/* Details & Live Scenario */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-6 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#62dd9e] font-semibold">{activeScopeInfo.badge}</span>
                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#16221d] border border-white/[0.06] font-mono text-[10px]">
                  {Object.keys(activeScopeInfo.scenarios).map((scKey) => {
                    const sc = activeScopeInfo.scenarios[scKey];
                    const isSelected = activeScenarioKey === scKey;
                    return (
                      <button
                        key={scKey}
                        type="button"
                        onClick={() =>
                          setScopeScenario((prev) => ({
                            ...prev,
                            [activeScopeTab]: scKey,
                          }))
                        }
                        className={`px-2 py-0.5 rounded transition-colors ${
                          isSelected ? 'bg-[#06110d] text-white font-bold' : 'text-[#9aada2] hover:text-white'
                        }`}
                      >
                        {sc.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <h3 className="text-lg font-bold text-white">{activeScopeInfo.title}</h3>
              <p className="text-xs text-[#9aada2] leading-relaxed">{activeScopeInfo.description}</p>

              {/* Formula */}
              <div className="p-3 rounded-xl bg-[#16221d] border border-white/[0.08] font-mono text-xs flex flex-col gap-1.5">
                <span className="text-[9px] uppercase text-[#9aada2]">Formula:</span>
                <span className="text-[#b5f568] font-semibold text-[11px]">{activeScopeInfo.formula}</span>
              </div>
            </div>

            {/* Audit Sample Record */}
            <div className="lg:col-span-6 p-5 rounded-2xl bg-[#16221d]/90 border border-[#b4ffcd]/15 flex flex-col gap-3">
              <div className="flex items-center justify-between pb-1.5 border-b border-[#b4ffcd]/10 font-mono text-[10px]">
                <span className="text-[#9aada2] uppercase">Verified Sample</span>
                <span className="text-[#62dd9e] font-semibold">{activeScenarioData.label}</span>
              </div>

              <div>
                <span className="text-sm font-bold text-white block">{activeScenarioData.sampleName}</span>
                <span className="text-[11px] text-[#9aada2]">{activeScenarioData.sampleIntake}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 font-mono text-xs pt-1">
                <div className="p-2 rounded-lg bg-[#06110d]">
                  <span className="text-[9px] text-[#9aada2] block">Input</span>
                  <span className="text-white font-bold block">{activeScenarioData.sampleVolume}</span>
                </div>
                <div className="p-2 rounded-lg bg-[#06110d]">
                  <span className="text-[9px] text-[#9aada2] block">Factor</span>
                  <span className="text-[#7dd9a3] font-bold block truncate">{activeScenarioData.sampleFactor}</span>
                </div>
                <div className="p-2 rounded-lg bg-[#06110d]">
                  <span className="text-[9px] text-[#9aada2] block">Output</span>
                  <span className="text-[#b5f568] font-bold block">{activeScenarioData.sampleTotal}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7: INTERACTIVE CALCULATION SIMULATOR */}
      <section className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14" id="interactive-simulator">
        <div className="p-5 md:p-8 rounded-3xl bg-[#0b1b14]/90 backdrop-blur-2xl shadow-2xl border border-[#b4ffcd]/15 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <span className="font-mono text-xs text-[#b5f568] uppercase tracking-widest font-semibold">
                06 // Calculator
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-0.5">
                Simulate Emissions in Real Time
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {Object.keys(simPresets).map((key) => {
                const p = simPresets[key];
                const Icon = p.icon;
                const isSelected = simCategory === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSimCategory(key);
                      setSimQuantity(p.min * 5);
                    }}
                    className={`flex items-center gap-1 px-3 py-1 rounded-xl font-mono text-xs font-semibold transition-all duration-150 active:scale-95 border ${
                      isSelected
                        ? 'bg-[#121e1a] border-[#b5f568] text-[#b5f568] shadow-sm'
                        : 'bg-[#16221d]/60 border-white/[0.08] text-slate-300 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{p.title.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7 flex flex-col gap-4">
              <div className="p-4 rounded-xl bg-[#16221d]/70 border border-white/[0.06] flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white">{currentPreset.title}</h4>
                    <span className="font-mono text-[10px] text-[#7dd9a3]">{currentPreset.scopeLabel}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-lg font-bold text-[#b5f568]">{simQuantity.toLocaleString()}</span>
                    <span className="font-mono text-xs text-slate-400 ml-1">{currentPreset.unit}</span>
                  </div>
                </div>

                <input
                  type="range"
                  min={currentPreset.min}
                  max={currentPreset.max}
                  step={currentPreset.step}
                  value={simQuantity}
                  onChange={(e) => setSimQuantity(Number(e.target.value))}
                  className="w-full h-2 bg-[#121e1a] rounded-lg appearance-none cursor-pointer"
                />

                <div className="flex justify-between font-mono text-[9px] text-[#9aada2]">
                  <span>Min: {currentPreset.min} {currentPreset.unit}</span>
                  <span>Max: {currentPreset.max.toLocaleString()} {currentPreset.unit}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#16221d]/50 border border-white/[0.06] flex items-center justify-between font-mono text-[11px]">
                <span className="text-[#9aada2]">Sovereign Factor:</span>
                <span className="text-[#62dd9e] font-bold">{currentPreset.factorValue} {currentPreset.factorUnit}</span>
              </div>
            </div>

            <div className="lg:col-span-5 p-5 rounded-2xl bg-[#16221d] border border-[#b4ffcd]/20 flex flex-col justify-between shadow-xl">
              <div>
                <span className="font-mono text-[9px] uppercase text-[#9aada2]">Calculated Impact</span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="font-mono text-4xl font-extrabold text-white">{calculatedTonnesCO2e}</span>
                  <span className="font-mono text-sm text-[#b5f568] font-bold">tCO₂e</span>
                </div>

                <div className="mt-4 pt-3 border-t border-white/[0.08] flex flex-col gap-1.5 font-mono text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#9aada2]">Tree Offsets:</span>
                    <span className="text-white font-bold">{treesRequired.toLocaleString()} trees / yr</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#9aada2]">Diesel Equiv:</span>
                    <span className="text-white font-bold">{dieselEquivalentLiters} L</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/[0.08]">
                {company ? (
                  <button
                    type="button"
                    onClick={onEnterWorkspace}
                    className="w-full py-2.5 rounded-xl bg-[#b5f568] hover:bg-[#9ad84f] text-[#102000] font-semibold text-xs transition-all active:scale-95 flex items-center justify-center gap-1"
                  >
                    <span>Record in Ledger</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpenAuth && onOpenAuth('REGISTER')}
                    className="group w-full py-3 rounded-full bg-gradient-to-r from-[#b5f568] to-[#9ad84f] text-[#07130f] font-bold text-xs shadow-[0_0_20px_rgba(181,245,104,0.35)] hover:shadow-[0_0_28px_rgba(181,245,104,0.55)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.96] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Track Free</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 8: ASYMMETRIC BENTO GRID CAPABILITIES */}
      <section className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14" id="capabilities">
        <div className="flex flex-col gap-6">
          <div>
            <span className="font-mono text-xs text-[#b5f568] uppercase tracking-widest font-semibold">
              07 // Capabilities
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-0.5">
              Engineered for carbon clarity.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="telemetry-card p-5 rounded-2xl flex flex-col justify-between group">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#16a36a]/15 flex items-center justify-center text-[#62dd9e] mb-3 group-hover:scale-110 transition-transform">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white group-hover:text-[#62dd9e]">Intelligent OCR</h3>
                <p className="text-xs text-[#9aada2] mt-1">Autonomous consumption unit parsing from raw invoices and bills.</p>
              </div>
              <div className="pt-3 border-t border-[#b4ffcd]/10 font-mono text-[10px] text-[#b5f568]">Multimodal Pipeline</div>
            </div>

            <div className="telemetry-card p-5 rounded-2xl flex flex-col justify-between group">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#b5f568]/15 flex items-center justify-center text-[#b5f568] mb-3 group-hover:scale-110 transition-transform">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white group-hover:text-[#b5f568]">Three-Scope Alignment</h3>
                <p className="text-xs text-[#9aada2] mt-1">Unified corporate inventory harmonizing direct fuel, grid power, and suppliers.</p>
              </div>
              <div className="pt-3 border-t border-[#b4ffcd]/10 font-mono text-[10px] text-[#62dd9e]">GHG Compliant</div>
            </div>

            <div className="telemetry-card p-5 rounded-2xl flex flex-col justify-between group">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#7dd9a3]/15 flex items-center justify-center text-[#7dd9a3] mb-3 group-hover:scale-110 transition-transform">
                  <Database className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white group-hover:text-[#7dd9a3]">Factor Intelligence</h3>
                <p className="text-xs text-[#9aada2] mt-1">149+ sovereign factors with exact vintage, unit, and methodology citations.</p>
              </div>
              <div className="pt-3 border-t border-[#b4ffcd]/10 font-mono text-[10px] text-[#7dd9a3]">CEA & MoEFCC Sync</div>
            </div>

            <div className="telemetry-card p-5 rounded-2xl flex flex-col justify-between group">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#b5f568]/15 flex items-center justify-center text-[#b5f568] mb-3 group-hover:scale-110 transition-transform">
                  <Share2 className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white group-hover:text-[#b5f568]">Scope 3 Spend Proxies</h3>
                <p className="text-xs text-[#9aada2] mt-1">Deploy defensible EEIO models when supplier disclosures are unavailable.</p>
              </div>
              <div className="pt-3 border-t border-[#b4ffcd]/10 font-mono text-[10px] text-[#b5f568]">EEIO & Hybrid LCA</div>
            </div>

            <div className="telemetry-card p-5 rounded-2xl flex flex-col justify-between group">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#16a36a]/15 flex items-center justify-center text-[#62dd9e] mb-3 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white group-hover:text-[#62dd9e]">Traceable Lineage</h3>
                <p className="text-xs text-[#9aada2] mt-1">Exposes raw document source, conversions, and auditor checkpoints.</p>
              </div>
              <div className="pt-3 border-t border-[#b4ffcd]/10 font-mono text-[10px] text-[#62dd9e]">Auditor Verified</div>
            </div>

            <div className="telemetry-card p-5 rounded-2xl flex flex-col justify-between group">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#7dd9a3]/15 flex items-center justify-center text-[#7dd9a3] mb-3 group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white group-hover:text-[#7dd9a3]">Decarbonization ROI</h3>
                <p className="text-xs text-[#9aada2] mt-1">Simulate financial and carbon returns of rooftop solar and fleet shifts.</p>
              </div>
              <div className="pt-3 border-t border-[#b4ffcd]/10 font-mono text-[10px] text-[#7dd9a3]">Abatement Models</div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 9: STATUTORY GOVERNANCE */}
      <section className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="p-6 rounded-2xl bg-[#0b1b14]/70 border border-white/[0.08] flex flex-col gap-4">
          <div className="text-center">
            <span className="font-mono text-xs text-[#62dd9e] uppercase tracking-widest font-semibold">
              Statutory Governance
            </span>
            <h3 className="text-lg font-bold text-white mt-0.5">Sovereign & International ESG Standards</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono">
            <div className="p-3 rounded-xl bg-[#16221d]/60 border border-white/[0.06]">
              <span className="text-xs font-bold text-[#b5f568] block">CEA User Guide v20.0</span>
              <span className="text-[10px] text-[#9aada2] block">National Grid Power</span>
            </div>
            <div className="p-3 rounded-xl bg-[#16221d]/60 border border-white/[0.06]">
              <span className="text-xs font-bold text-[#62dd9e] block">SEBI BRSR Core</span>
              <span className="text-[10px] text-[#9aada2] block">Indian Listed Standards</span>
            </div>
            <div className="p-3 rounded-xl bg-[#16221d]/60 border border-white/[0.06]">
              <span className="text-xs font-bold text-[#7dd9a3] block">ISO 14064-1:2018</span>
              <span className="text-[10px] text-[#9aada2] block">GHG Quantification</span>
            </div>
            <div className="p-3 rounded-xl bg-[#16221d]/60 border border-white/[0.06]">
              <span className="text-xs font-bold text-white block">EU CBAM Ready</span>
              <span className="text-[10px] text-[#9aada2] block">Cross-Border Adjustment</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 10: FAQ */}
      <section className="relative z-10 w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex flex-col gap-5">
          <div className="text-center">
            <span className="font-mono text-xs text-[#b5f568] uppercase tracking-widest font-semibold">
              FAQ
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-0.5">
              Carbon Accounting Questions
            </h2>
          </div>

          <div className="space-y-2.5">
            {faqs.map((faq, idx) => {
              const isOpen = expandedFaq === idx;
              return (
                <div
                  key={idx}
                  className={`rounded-xl bg-[#0b1b14]/80 border transition-all duration-150 overflow-hidden ${
                    isOpen ? 'border-[#b5f568]/40' : 'border-white/[0.08] hover:border-white/[0.18]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedFaq(isOpen ? -1 : idx)}
                    className="w-full p-4 text-left flex items-center justify-between text-xs sm:text-sm font-semibold text-white hover:text-[#b5f568] transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#b5f568]' : 'text-slate-400'}`} />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 text-xs text-[#9aada2] leading-relaxed border-t border-white/[0.05]">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 11: CALL TO ACTION BANNER */}
      <section className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 pb-20">
        <div className="relative overflow-hidden p-8 md:p-12 rounded-3xl bg-[#16221d]/60 backdrop-blur-2xl shadow-2xl border border-[#b4ffcd]/20 flex flex-col items-center text-center">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[30rem] h-[20rem] bg-gradient-to-b from-[#62dd9e]/30 to-[#b5f568]/10 rounded-full blur-[130px] pointer-events-none" />

          <div className="relative z-10 max-w-xl flex flex-col items-center gap-3.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#121e1a] text-[#b5f568] font-mono text-[10px] font-semibold border border-white/[0.08]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#b5f568] animate-pulse" />
              Continuous Carbon Accounting
            </span>

            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Your business has a carbon story.{' '}
              <span className="text-[#b5f568]">Start understanding it.</span>
            </h2>

            <p className="text-xs sm:text-sm text-[#9aada2] max-w-md">
              Transform operational paperwork into an audit-ready baseline in minutes.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 w-full sm:w-auto">
              {company ? (
                <button
                  type="button"
                  onClick={onEnterWorkspace}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full text-xs sm:text-sm font-semibold bg-[#b5f568] text-[#102000] shadow-[0_0_24px_rgba(181,245,104,0.4)] hover:bg-[#9ad84f] transition-all duration-200 active:scale-95"
                >
                  <span>Go to Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenAuth && onOpenAuth('REGISTER')}
                  className="group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full text-xs sm:text-sm font-extrabold bg-gradient-to-r from-[#b5f568] via-[#a3f34f] to-[#62dd9e] text-[#07130f] shadow-[0_0_32px_rgba(181,245,104,0.45)] hover:shadow-[0_0_48px_rgba(181,245,104,0.7)] transition-all duration-300 hover:scale-[1.03] active:scale-[0.96] cursor-pointer"
                >
                  <span>Get Started with CarbonIQ</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                </button>
              )}

              {onNavigateToDataset && (
                <button
                  type="button"
                  onClick={onNavigateToDataset}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-3 rounded-full text-xs font-medium text-white bg-[#06110d]/80 backdrop-blur-xl hover:bg-[#121e1a] transition-all duration-200 active:scale-95 border border-white/[0.08]"
                >
                  Factor Directory (149+)
                </button>
              )}
            </div>

            <div className="pt-3 flex flex-wrap items-center justify-center gap-3 text-[#9aada2] font-mono text-[10px]">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-[#62dd9e]" /> Statutory Sovereign Standards
              </span>
              <span>•</span>
              <span>No credit card required</span>
              <span>•</span>
              <span>Audit Lineage Certified</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 12: ENTERPRISE FOOTER */}
      <footer className="w-full bg-[#06110d] backdrop-blur-xl border-t border-[#b4ffcd]/10 pt-12 pb-10">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 pb-8">
            <div className="lg:col-span-4 flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <img
                  src="/drkthm-logo.png"
                  alt="CarbonIQ"
                  className="h-8 sm:h-9 w-auto object-contain drop-shadow-[0_0_12px_rgba(98,221,158,0.2)]"
                />
              </div>
              <p className="text-xs text-[#9aada2] max-w-xs leading-relaxed">
                Corporate greenhouse gas accounting telemetry engineered for modern enterprises and Indian SMEs.
              </p>
              <div className="flex items-center gap-2 font-mono text-[10px] text-[#9aada2]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#b5f568] animate-pulse" />
                <span>GHG Protocol Compliant • Audit Traceable</span>
              </div>
            </div>

            <div className="lg:col-span-3 flex flex-col gap-2">
              <span className="font-mono text-xs uppercase text-[#62dd9e] tracking-wider font-semibold">
                Platform
              </span>
              <a href="#product-dashboard" className="text-xs text-[#9aada2] hover:text-white transition">
                Automated Scope 1-3
              </a>
              <a href="#scope-mechanics" className="text-xs text-[#9aada2] hover:text-white transition">
                Dual Scope 2 Grid Accounting
              </a>
              <a href="#interactive-simulator" className="text-xs text-[#9aada2] hover:text-white transition">
                Impact Simulator
              </a>
              <a href="#capabilities" className="text-xs text-[#9aada2] hover:text-white transition">
                Ingestion Engine
              </a>
            </div>

            <div className="lg:col-span-3 flex flex-col gap-2">
              <span className="font-mono text-xs uppercase text-[#62dd9e] tracking-wider font-semibold">
                Resources
              </span>
              <button
                type="button"
                onClick={onNavigateToDataset}
                className="text-xs text-left text-[#9aada2] hover:text-white transition"
              >
                Emission Factor Database (149+)
              </button>
              <span className="text-xs text-[#9aada2]">CEA Baseline Ver 20.0</span>
              <span className="text-xs text-[#9aada2]">SEBI BRSR Core Guidance</span>
              <span className="text-xs text-[#9aada2]">ISO 14064 Standard</span>
            </div>

            <div className="lg:col-span-2 flex flex-col gap-2">
              <span className="font-mono text-xs uppercase text-[#62dd9e] tracking-wider font-semibold">
                Governance
              </span>
              <span className="text-xs text-[#9aada2]">Data Integrity</span>
              <span className="text-xs text-[#9aada2]">Confidential Audit Trail</span>
              <span className="text-xs text-[#9aada2]">Zero Hallucination</span>
            </div>
          </div>

          <div className="pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-[10px] text-[#9aada2]">
            <p>© 2026 CarbonIQ Platform. Statutory Carbon Accounting.</p>
            <div className="flex items-center gap-2.5 text-[#7dd9a3]">
              <span>ISO 14064 Certified Protocols</span>
              <span>•</span>
              <span>₹ INR Currency Standard</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
