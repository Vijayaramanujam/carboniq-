import React, { useState, useMemo } from 'react';
import {
  TrendingDown,
  Sparkles,
  Zap,
  Flame,
  Truck,
  Recycle,
  Building,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Target,
  Sliders,
  Sun,
  Leaf,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Info,
  DollarSign,
  TreeDeciduous,
} from 'lucide-react';

/**
 * Knowledge Base of Statutory & Technical Decarbonization Pathways
 * Tailored for Indian industrial clusters and GHG Protocol Scopes 1, 2, 3
 */
const DECARBONIZATION_STRATEGIES = {
  ELECTRICITY: [
    {
      id: 'elec-solar',
      title: 'On-Site Rooftop Solar PV & Net Metering',
      category: 'Renewable Transition',
      reductionPct: 50,
      capex: 'Medium',
      payback: '3.2 - 4.5 Years',
      timeframe: '2 - 3 Months',
      difficulty: 'High Impact',
      icon: Sun,
      color: 'amber',
      reasoning:
        'The Indian national grid baseline emission factor is 0.82 kg CO₂/kWh (CEA 2024) due to high coal thermal dispatch. Solar PV generation is rated at 0.00 kg CO₂/kWh under GHG Protocol Scope 2 Location and Market-Based accounting. Generating daytime power behind-the-meter directly displaces DISCOM grid drawing with zero emissions.',
      steps: [
        'Perform shadow-free roof structural assessment and load profile logging.',
        'Size solar array (kWp) to match baseline daytime baseload.',
        'Submit grid interconnection & net-metering application to state DISCOM.',
        'Deploy high-efficiency Tier-1 bifacial monocrystalline modules.',
      ],
    },
    {
      id: 'elec-apfc-vfd',
      title: 'Power Factor Optimization & Variable Frequency Drives (VFDs)',
      category: 'Energy Efficiency',
      reductionPct: 15,
      capex: 'Low',
      payback: '8 - 14 Months',
      timeframe: '2 - 4 Weeks',
      difficulty: 'Quick Win',
      icon: Zap,
      color: 'emerald',
      reasoning:
        'Inductive factory loads (induction motors, compressors, ventilation) operate at typical power factors of 0.80 - 0.88, leading to thermal I²R transmission losses and DISCOM kVAh reactive penalties. Automatic Power Factor Correction (APFC) to 0.98+ combined with VFD speed controls on pumps and compressors eliminates throttling losses and reduces parasitic kWh draw by 12% - 18%.',
      steps: [
        'Install digital APFC capacitor banks to maintain target 0.98+ power factor.',
        'Retrofit VFDs on variable-torque fluid pumps and ventilation blowers.',
        'Implement air leak audits and acoustic detection on compressed air lines.',
      ],
    },
    {
      id: 'elec-tod-shift',
      title: 'Time-of-Day (ToD) Peak Shifting & Automated Scheduling',
      category: 'Operational Optimization',
      reductionPct: 8,
      capex: 'Zero / Minimal',
      payback: 'Immediate (OpEx)',
      timeframe: 'Immediate',
      difficulty: 'Operational',
      icon: Clock,
      color: 'cyan',
      reasoning:
        'Thermal power generation ramps up at peak marginal carbon intensity during evening demand surges (6 PM - 10 PM). Rescheduling non-continuous energy-intensive operations (batch melting, water pumping, refrigeration chilling) to off-peak night slots aligns consumption with cleaner base-load dispatch and avoids steep peak tariff surcharges.',
      steps: [
        'Program programmable logic controllers (PLCs) to schedule cooling/pumping off-peak.',
        'Establish automated alerts for factory floor energy managers during peak tariff hours.',
        'Review monthly DISCOM ToD tariff slots for maximum arbitrage.',
      ],
    },
    {
      id: 'elec-green-tariff',
      title: 'Green Tariff Open Access Renewable PPA',
      category: 'Policy & Procurement',
      reductionPct: 35,
      capex: 'Zero (OpEx Contract)',
      payback: 'Immediate (Net Savings)',
      timeframe: '1 - 2 Months',
      difficulty: 'Procurement',
      icon: ShieldCheck,
      color: 'purple',
      reasoning:
        'Under Ministry of Power Green Energy Open Access Rules, industrial consumers with connected loads of 100 kW and above can contract directly for off-site solar/wind power wheeling. This yields certified Renewable Energy Certificates (RECs) and reduces Scope 2 location emissions to zero under market-based accounting.',
      steps: [
        'Evaluate 15-minute load duration curves for open access eligibility.',
        'Float tender or negotiate bilateral Power Purchase Agreement (PPA) with IPPs.',
        'Register for Green Open Access registry approvals with State Transmission Utility.',
      ],
    },
  ],

  FUEL: [
    {
      id: 'fuel-air-fuel',
      title: 'Oxygen Trim & Automated Air-Fuel Ratio Tuning',
      category: 'Combustion Efficiency',
      reductionPct: 12,
      capex: 'Very Low',
      payback: '2 - 4 Months',
      timeframe: '1 - 2 Weeks',
      difficulty: 'Quick Win',
      icon: Flame,
      color: 'orange',
      reasoning:
        'Industrial diesel generators and fuel oil boilers operating without continuous oxygen trimming run with excess air or unburned fuel soot, increasing specific fuel consumption by 8% - 15%. Calibrating flue gas oxygen between 3% - 5% ensures stoichiometric combustion, cutting direct Scope 1 CO₂ emissions (2.68 kg CO₂/L for diesel) per unit of thermal or mechanical output.',
      steps: [
        'Perform calibrated flue gas analysis (O₂, CO, NOₓ, stack temperature).',
        'Install zirconium oxide oxygen sensor and automated damper actuator.',
        'Implement weekly burner nozzle inspection and de-coking schedule.',
      ],
    },
    {
      id: 'fuel-whr',
      title: 'Waste Heat Recovery (Flue Gas Economizer)',
      category: 'Thermal Recovery',
      reductionPct: 10,
      capex: 'Medium',
      payback: '10 - 15 Months',
      timeframe: '1 - 2 Months',
      difficulty: 'High Impact',
      icon: Target,
      color: 'emerald',
      reasoning:
        'Boiler and furnace exhaust stacks discharge heat between 180°C - 280°C. Capturing this waste heat through an economizer to preheat boiler feedwater by 35°C yields a direct 6% - 10% reduction in fuel consumption, as every 6°C rise in feedwater temperature reduces fuel requirement by approximately 1%.',
      steps: [
        'Measure stack volumetric flow rate and continuous exhaust temperature.',
        'Retrofit condensing or finned-tube economizer in the flue ducting.',
        'Thermal insulation wrap on high-temperature steam lines and condensate return valves.',
      ],
    },
    {
      id: 'fuel-switching',
      title: 'Fuel Switching to Piped Natural Gas (PNG) / B20 Biodiesel',
      category: 'Low-Carbon Fuel',
      reductionPct: 25,
      capex: 'Low - Medium',
      payback: '6 - 12 Months',
      timeframe: '1 Month',
      difficulty: 'High Impact',
      icon: Leaf,
      color: 'teal',
      reasoning:
        'Replacing Heavy Fuel Oil (2.958 kg CO₂/L) or Diesel (2.68 kg CO₂/L) with Piped Natural Gas (2.02 kg CO₂/m³) or IS 15607 compliant B20 Biodiesel drops carbon intensity by 20% - 30% while eliminating particulate sulfur emissions. PNG provides higher combustion efficiency with zero storage handling losses.',
      steps: [
        'Apply for City Gas Distribution (CGD) pipeline connection and metering station.',
        'Retrofit burner heads with dual-fuel or dedicated gas nozzles.',
        'Verify fuel compliance with local pollution control board (SPCB) guidelines.',
      ],
    },
  ],

  TRANSPORTATION: [
    {
      id: 'trans-modal',
      title: 'Inter-Modal Shift (Road Freight to Container Rail)',
      category: 'Logistics Optimization',
      reductionPct: 65,
      capex: 'Zero (OpEx Contract)',
      payback: 'Immediate (Freight Savings)',
      timeframe: '1 Month',
      difficulty: 'High Impact',
      icon: Truck,
      color: 'sky',
      reasoning:
        'Road logistics via heavy commercial trucks emit approximately 0.11 - 0.28 kg CO₂e per tonne-km. Dedicated container rail cargo emits only 0.028 kg CO₂e/t-km (an 80%+ reduction). Migrating long-haul freight corridors (>400 km) from road to Container Corporation of India (CONCOR) rail networks achieves massive Scope 3 logistics abatement.',
      steps: [
        'Analyze logistics manifest origins/destinations for rail terminal proximity.',
        'Partner with third-party logistics (3PL) providers offering multi-modal consolidation.',
        'Establish standard containerized packaging units for rapid intermodal transfers.',
      ],
    },
    {
      id: 'trans-route',
      title: 'Dynamic Route Optimization & Fleet Telematics',
      category: 'Fleet Efficiency',
      reductionPct: 16,
      capex: 'Low',
      payback: '3 - 6 Months',
      timeframe: '2 Weeks',
      difficulty: 'Quick Win',
      icon: Sliders,
      color: 'emerald',
      reasoning:
        'Empty backhauls, congested urban idling, and suboptimal dispatch routing degrade fleet fuel economy by up to 25%. Equipping vehicles with IoT telematics and algorithmic load-dispatch software minimizes deadhead kilometers and enforces fuel-efficient driving profiles.',
      steps: [
        'Deploy GPS telematics with real-time fuel flow and engine idling monitors.',
        'Implement algorithmic delivery route clustering and backhaul load matching.',
        'Conduct driver eco-driving training on progressive shifting and idling limits.',
      ],
    },
    {
      id: 'trans-ev',
      title: 'Commercial EV Fleet Transition (Last-Mile Delivery)',
      category: 'Fleet Electrification',
      reductionPct: 40,
      capex: 'Medium',
      payback: '2.5 - 3.5 Years',
      timeframe: '2 - 3 Months',
      difficulty: 'Strategic',
      icon: Zap,
      color: 'amber',
      reasoning:
        'Replacing light diesel commercial vehicles (Tata Ace / Mahindra Bolero) with 2-3 tonne electric delivery vans eliminates Scope 1 tailpipe combustion completely. Charging with rooftop solar yields 100% net decarbonized transport with 60% lower maintenance expenditure.',
      steps: [
        'Audit daily urban delivery route distances against EV battery range (120-180 km).',
        'Install dedicated AC/DC fast chargers at distribution hubs.',
        'Leverage national and state EV fleet subsidies and lower road tax structures.',
      ],
    },
  ],

  WASTE: [
    {
      id: 'waste-recycle',
      title: 'Closed-Loop Material Segregation & Certified Recycling',
      category: 'Circular Economy',
      reductionPct: 90,
      capex: 'Minimal',
      payback: 'Revenue Generating (Scrap Sales)',
      timeframe: 'Immediate',
      difficulty: 'High Impact',
      icon: Recycle,
      color: 'emerald',
      reasoning:
        'Sending recyclable paper, corrugated cardboard, and PET plastics to sanitary landfills results in methane decomposition (+0.520 kg CO₂e/kg). Transitioning to certified closed-loop recycling generates verified avoided emissions (-0.957 kg CO₂e/kg for cardboard, -0.826 kg CO₂e/kg for PET) by displacing carbon-intensive virgin resource extraction.',
      steps: [
        'Deploy 3-stream color-coded bins at source (Cardboard, Plastics, Hazardous/Organic).',
        'Partner with authorized Central Pollution Control Board (CPCB) registered recyclers.',
        'Collect formal recycling certificates and weight slips for Scope 3 audit verification.',
      ],
    },
    {
      id: 'waste-compost',
      title: 'On-Site Aerobic Composting / Micro-Biogas Digestion',
      category: 'Organic Diversion',
      reductionPct: 75,
      capex: 'Low',
      payback: '6 - 12 Months',
      timeframe: '2 - 3 Weeks',
      difficulty: 'Quick Win',
      icon: Leaf,
      color: 'teal',
      reasoning:
        'Canteen food scraps and garden waste diverted from municipal dumps to on-site aerobic composting or bio-methane digesters prevents anaerobic landfill methane emissions. Composting emits only 0.048 kg CO₂e/kg while producing chemical-free soil conditioner for facility landscaping.',
      steps: [
        'Install a modular organic waste converter (OWC) or twin-bin vermicompost bed.',
        'Train canteen catering staff on zero-contamination segregation.',
        'Utilize compost locally to offset synthetic fertilizer procurement.',
      ],
    },
  ],

  SUPPLIER_INVOICE: [
    {
      id: 'supp-epd',
      title: 'Low-Carbon Procurement & EPD-Verified Vendors',
      category: 'Scope 3 Supply Chain',
      reductionPct: 30,
      capex: 'Zero (Procurement Policy)',
      payback: 'Policy Driven',
      timeframe: 'Next Sourcing Cycle',
      difficulty: 'Strategic',
      icon: Building,
      color: 'cyan',
      reasoning:
        'Spend-based Leontief EEIO multipliers use macroeconomic industry averages. Sourcing raw materials (steel, aluminum, chemicals, packaging) from suppliers with third-party verified ISO 14025 Environmental Product Declarations (EPDs) or recycled content certifications reduces cradle-to-gate embodied carbon by 25% - 40%.',
      steps: [
        'Incorporate GHG reporting clauses and EPD requirements in vendor RFQs.',
        'Prioritize suppliers utilizing recycled scrap feeds or green hydrogen processing.',
        'Replace spend proxies with vendor-specific primary Product Carbon Footprints (PCFs).',
      ],
    },
    {
      id: 'supp-local',
      title: 'Supply Chain Near-Shoring & Local Sourcing Clusters',
      category: 'Logistics Decoupling',
      reductionPct: 18,
      capex: 'Zero',
      payback: 'Freight Cost Reduction',
      timeframe: '1 - 3 Months',
      difficulty: 'Operational',
      icon: Target,
      color: 'emerald',
      reasoning:
        'Sourcing heavy inputs and packaging components from local industrial clusters within a 150 km radius drastically reduces multi-tier tier-2/tier-3 upstream freight ton-kilometers and avoids long-haul inter-state road transport emissions.',
      steps: [
        'Map supplier geographic distribution against total procurement spend.',
        'Qualify local vendors meeting technical specifications to shorten freight transit.',
        'Bundle smaller purchase orders into full-truckload (FTL) deliveries.',
      ],
    },
  ],
};

export function ReductionPlanner({
  category = 'ELECTRICITY',
  scope = 'SCOPE_2',
  quantity = 0,
  unit = '',
  emissionsKg = 0,
  fuelType = '',
  transportMode = '',
  wasteType = '',
  disposalMethod = '',
  supplierName = '',
}) {
  const [selectedPlanIds, setSelectedPlanIds] = useState(() => {
    // Default to the first 2 highest-impact initiatives active
    const available = DECARBONIZATION_STRATEGIES[category] || DECARBONIZATION_STRATEGIES.ELECTRICITY;
    return available.slice(0, 2).map((s) => s.id);
  });

  const [expandedPlanId, setExpandedPlanId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [activeView, setActiveView] = useState('PATHWAYS'); // 'PATHWAYS' | 'SIMULATOR'

  const currentStrategies = useMemo(() => {
    return DECARBONIZATION_STRATEGIES[category] || DECARBONIZATION_STRATEGIES.ELECTRICITY;
  }, [category]);

  const numEmissions = parseFloat(emissionsKg) || 0;
  const isNegative = numEmissions < 0;

  // Toggle initiative in interactive simulator
  const togglePlan = (id) => {
    setSelectedPlanIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  // Cumulative percentage reduction modeled
  const cumulativePct = useMemo(() => {
    if (selectedPlanIds.length === 0) return 0;
    // Compounded abatement model: Net = 1 - product(1 - r_i)
    let remainingFraction = 1.0;
    currentStrategies.forEach((strat) => {
      if (selectedPlanIds.includes(strat.id)) {
        remainingFraction *= 1 - strat.reductionPct / 100;
      }
    });
    const totalReduction = (1 - remainingFraction) * 100;
    // Cap at 95% realistic operational limit unless 100% certified zero-carbon
    return Math.min(Math.round(totalReduction * 10) / 10, 95);
  }, [selectedPlanIds, currentStrategies]);

  // Projected Abated Footprint
  const projectedSavingsKg = useMemo(() => {
    if (numEmissions <= 0) return 0;
    return Math.round((numEmissions * (cumulativePct / 100)) * 100) / 100;
  }, [numEmissions, cumulativePct]);

  const projectedRemainingKg = useMemo(() => {
    if (numEmissions <= 0) return 0;
    return Math.max(0, Math.round((numEmissions - projectedSavingsKg) * 100) / 100);
  }, [numEmissions, projectedSavingsKg]);

  // Tree equivalent: 1 mature tree absorbs ~21 kg CO2 per year
  const treesEquivalent = Math.round((projectedSavingsKg / 21) * 10) / 10;

  // Diesel equivalent: 1 liter diesel = 2.68 kg CO2
  const dieselLitersSaved = Math.round((projectedSavingsKg / 2.68) * 10) / 10;

  // Copy Plan to Clipboard
  const handleCopyPlan = () => {
    const lines = [
      `CARBONIQ EMISSION REDUCTION PLAN & DECARBONIZATION PATHWAY`,
      `===========================================================`,
      `Activity Category: ${category} | Scope: ${scope}`,
      `Baseline Emission: ${numEmissions.toLocaleString()} kg CO₂e`,
      `Target Reduction Potential: ${cumulativePct}% (-${projectedSavingsKg.toLocaleString()} kg CO₂e saved)`,
      `Remaining Post-Intervention Footprint: ${projectedRemainingKg.toLocaleString()} kg CO₂e`,
      `Environmental Equivalent: ~${treesEquivalent} mature trees planted annually (~${dieselLitersSaved} L diesel avoided)`,
      ``,
      `SELECTED STRATEGIC ACTIONS:`,
    ];

    currentStrategies
      .filter((s) => selectedPlanIds.includes(s.id))
      .forEach((s, idx) => {
        lines.push(`\n${idx + 1}. ${s.title.toUpperCase()} (Impact: -${s.reductionPct}%)`);
        lines.push(`   Category: ${s.category} | Payback: ${s.payback} | Timeframe: ${s.timeframe}`);
        lines.push(`   Technical Rationale: ${s.reasoning}`);
        lines.push(`   Action Steps:`);
        s.steps.forEach((step) => lines.push(`     - ${step}`));
      });

    lines.push(`\nGenerated via CarbonIQ Decarbonization Engine (ISO 14064-1 & GHG Protocol compliant)`);

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="mt-3 rounded-xl border border-emerald-500/30 bg-gradient-to-br from-slate-900 via-slate-900/98 to-emerald-950/25 p-3.5 shadow-2xl relative overflow-hidden">
      {/* Decorative top accent glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-800 gap-2">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-xs font-bold text-white tracking-wide uppercase">
                Carbon Reduction Planner & Decarbonization Pathways
              </h4>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Actionable AI
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Technical step-by-step reasoning to reduce carbon emissions for this {category.toLowerCase()} activity
            </p>
          </div>
        </div>

        {/* View Switcher & Copy Action */}
        <div className="flex items-center space-x-1.5 self-end sm:self-auto">
          <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px]">
            <button
              type="button"
              onClick={() => setActiveView('PATHWAYS')}
              className={`px-2 py-1 rounded-md font-medium transition ${
                activeView === 'PATHWAYS'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Intervention Pathways
            </button>
            <button
              type="button"
              onClick={() => setActiveView('SIMULATOR')}
              className={`px-2 py-1 rounded-md font-medium transition ${
                activeView === 'SIMULATOR'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Reduction Simulator ({selectedPlanIds.length})
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopyPlan}
            title="Copy structured decarbonization plan"
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] font-medium transition"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-slate-400" />
                <span>Export Plan</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Simulator Quick Status Strip */}
      <div className="mt-3 p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/90 grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div>
          <span className="text-[10px] text-slate-400 block">Baseline Footprint:</span>
          <span className="text-xs font-mono font-bold text-white">
            {numEmissions.toLocaleString()} kg CO₂e
          </span>
        </div>

        <div>
          <span className="text-[10px] text-slate-400 block">Potential Abatement:</span>
          <span className="text-xs font-mono font-bold text-emerald-400 flex items-center space-x-1">
            <TrendingDown className="w-3 h-3 text-emerald-400" />
            <span>-{cumulativePct}% ({projectedSavingsKg.toLocaleString()} kg)</span>
          </span>
        </div>

        <div>
          <span className="text-[10px] text-slate-400 block">Post-Reduction Balance:</span>
          <span className="text-xs font-mono font-bold text-cyan-300">
            {projectedRemainingKg.toLocaleString()} kg CO₂e
          </span>
        </div>

        <div>
          <span className="text-[10px] text-slate-400 block">Ecological Equivalent:</span>
          <span className="text-xs font-mono font-medium text-emerald-300 flex items-center space-x-1">
            <TreeDeciduous className="w-3 h-3 text-emerald-400" />
            <span>~{treesEquivalent} trees / yr</span>
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-2.5 px-0.5">
        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
          <span>Decarbonization Roadmap Impact</span>
          <span className="font-semibold text-emerald-400">{cumulativePct}% Abated</span>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-500 rounded-full"
            style={{ width: `${Math.min(cumulativePct, 100)}%` }}
          />
        </div>
      </div>

      {/* Main Content Area */}
      {activeView === 'PATHWAYS' ? (
        <div className="mt-3 space-y-2">
          {currentStrategies.map((strat) => {
            const isSelected = selectedPlanIds.includes(strat.id);
            const isExpanded = expandedPlanId === strat.id;
            const Icon = strat.icon;

            return (
              <div
                key={strat.id}
                className={`rounded-lg border transition-all duration-200 overflow-hidden ${
                  isSelected
                    ? 'border-emerald-600/60 bg-slate-900/90 shadow-md'
                    : 'border-slate-800 bg-slate-950/40 opacity-80'
                }`}
              >
                {/* Pathway Card Header */}
                <div className="p-2.5 flex items-start justify-between gap-2">
                  <div className="flex items-start space-x-2.5 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => togglePlan(strat.id)}
                      className={`mt-0.5 p-1 rounded-md border transition ${
                        isSelected
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                          : 'bg-slate-800 text-transparent border-slate-700 hover:border-slate-500'
                      }`}
                      title={isSelected ? 'Included in simulator' : 'Click to include in plan'}
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="text-xs font-semibold text-white truncate">
                          {strat.title}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                          {strat.category}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          -{strat.reductionPct}% CO₂e
                        </span>
                      </div>

                      {/* Brief teaser of reasoning */}
                      <p className="text-[11px] text-slate-300 mt-1 leading-relaxed line-clamp-2">
                        {strat.reasoning}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={() => setExpandedPlanId(isExpanded ? null : strat.id)}
                      className="p-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition text-[10px] flex items-center space-x-1 px-1.5"
                    >
                      <span>{isExpanded ? 'Less' : 'Details'}</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Technical Explanation & Action Steps */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-1 border-t border-slate-800/80 bg-slate-950/70 text-[10px] space-y-2.5">
                    {/* Deep Reasoning Callout */}
                    <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-800/30 text-slate-200">
                      <div className="font-semibold text-emerald-300 flex items-center space-x-1.5 mb-1 text-[11px]">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Scientific & Statutory Rationale</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed text-[10.5px]">
                        {strat.reasoning}
                      </p>
                    </div>

                    {/* Metadata Grid (Payback, CapEx, Timeframe) */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                        <span className="text-slate-500 block text-[9px] uppercase font-semibold">
                          Expected Payback
                        </span>
                        <span className="text-white font-mono font-medium mt-0.5 block">
                          {strat.payback}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                        <span className="text-slate-500 block text-[9px] uppercase font-semibold">
                          CapEx Requirement
                        </span>
                        <span className="text-white font-mono font-medium mt-0.5 block">
                          {strat.capex}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                        <span className="text-slate-500 block text-[9px] uppercase font-semibold">
                          Deployment Timeframe
                        </span>
                        <span className="text-white font-mono font-medium mt-0.5 block">
                          {strat.timeframe}
                        </span>
                      </div>
                    </div>

                    {/* Concrete Action Checklist */}
                    <div>
                      <div className="font-semibold text-slate-300 mb-1.5 flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Implementation Roadmap:</span>
                      </div>
                      <ul className="space-y-1 pl-1">
                        {strat.steps.map((st, i) => (
                          <li key={i} className="flex items-start space-x-2 text-slate-300">
                            <span className="text-emerald-400 font-bold shrink-0 mt-0.5">•</span>
                            <span className="leading-snug">{st}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* SIMULATOR VIEW */
        <div className="mt-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white flex items-center space-x-1.5">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <span>Interactive Decarbonization Scenario Simulator</span>
            </span>
            <span className="text-[10px] text-slate-400">
              Select or toggle interventions to test scenario targets
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {currentStrategies.map((s) => {
              const active = selectedPlanIds.includes(s.id);
              const individualSavedKg = Math.round((numEmissions * (s.reductionPct / 100)) * 10) / 10;

              return (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => togglePlan(s.id)}
                  className={`p-2.5 rounded-lg border text-left transition flex items-center justify-between ${
                    active
                      ? 'bg-emerald-950/30 border-emerald-500/50 text-white'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] ${
                        active
                          ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                          : 'border-slate-700 bg-slate-800'
                      }`}
                    >
                      {active && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div>
                      <div className="text-[11px] font-medium leading-tight">{s.title}</div>
                      <div className="text-[9px] text-slate-400 mt-0.5 font-mono">
                        -{s.reductionPct}% ({individualSavedKg.toLocaleString()} kg CO₂e)
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {s.payback}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Scenario Impact Summary Box */}
          <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px]">
            <div>
              <span className="font-semibold text-emerald-300 block">
                Simulated Net-Zero Impact for this Document:
              </span>
              <span className="text-slate-300 text-[10px]">
                By enacting the {selectedPlanIds.length} selected interventions, this operational activity
                abates <strong className="text-emerald-400">{projectedSavingsKg.toLocaleString()} kg CO₂e</strong>,
                achieving a <strong className="text-white">{cumulativePct}% emission reduction</strong>.
              </span>
            </div>

            <button
              type="button"
              onClick={handleCopyPlan}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-semibold shrink-0 transition"
            >
              Export Scenario Roadmap
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

