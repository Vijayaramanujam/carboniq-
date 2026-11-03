# Carbon Emission Calculation Methods
> **Source:** [Consensus AI Research Search](https://consensus.app/search/carbon-emission-calculation-methods/Gh2LprbhRBqlBo7e2CuQhQ/)  
> **Query:** *"How to calculate carbon emissions from petrol bills, electricity bills, and waste recycling"*  
> **Papers Analyzed:** 12 peer-reviewed studies | **Date Captured:** 2026-10-31

---

## Core Principle

> **Emissions = Activity Data × Emission Factor**

The universal formula across all carbon accounting standards (GHG Protocol, IPCC) is:

```
CO₂ emissions (kg) = Annual Consumption (units) × Emission Factor (kg CO₂ / unit)
```

Two key pieces of data are always required:
1. **Annual consumption data** for the specified source/sink
2. **Emission factor** for the specified source/sink (kg CO₂ per unit consumed)

---

## Scope Classification

| Scope | Type | Examples |
|---|---|---|
| **Scope 1** | Direct emissions | Petrol, diesel, natural gas, fugitive gases |
| **Scope 2** | Indirect – purchased energy | Electricity, district heating/cooling |
| **Scope 3** | Indirect – value chain | Waste, recycling, purchased goods, transport |

---

## 🛢️ Fuel / Petrol Bill Calculations (Scope 1)

### Method 1 — Tier 1 (Top-Down, Simple)
Best when only **total fuel volume** is available (e.g., petrol bill in liters).

```
CO₂ (kg) = Fuel Consumed (liters) × Emission Factor (kg CO₂/liter)
```

**Common Indian Emission Factors:**
| Fuel Type | Emission Factor |
|---|---|
| Petrol / Gasoline | 2.31 kg CO₂/liter |
| Diesel | 2.68 kg CO₂/liter |
| LPG | 1.51 kg CO₂/liter |
| CNG | 2.04 kg CO₂/kg |
| Natural Gas | 2.02 kg CO₂/m³ |

### Method 2 — Tier 2 (Fuel × Calorific Value)
Converts fuel consumption to energy content first, then applies carbon emission factor:

```
Energy (TJ) = Fuel Consumption (kt) × Net Calorific Value (TJ/kt)
Carbon Content (t) = Energy (TJ) × Carbon Emission Factor (tC/TJ)
CO₂ (t) = Carbon Content × Oxidation Factor × (44/12)
```

### Method 3 — Tier 3 (Distance-Based Transport)
Most accurate for transport — integrates vehicle kilometers, payload tonnage, and vehicle type.

```
CO₂ = Distance (km) × Emission Factor (kg CO₂/km) × Load Factor
```

### Method 4 — Spend-Based (When Physical Data Unavailable)
Uses **Multiregional Input-Output (MRIO)** carbon multipliers when only billing amounts (₹/£/$) are available:

```
CO₂ (kg) = Spend (currency) × Carbon Multiplier (kg CO₂/currency unit)
```

> ⚠️ Spend-based multipliers carry uncertainty but can still differentiate high vs. low emitters effectively.

---

## ⚡ Electricity Bill Calculations (Scope 2)

### Standard Method
```
CO₂ (kg) = Electricity Consumed (kWh) × Grid Emission Factor (kg CO₂/kWh)
```

**Indian Grid Emission Factors (CEA):**
| Grid / Year | Emission Factor |
|---|---|
| India National Grid (2023–24) | **0.716 kg CO₂/kWh** |
| India National Grid (2024) | **0.82 kg CO₂/kWh** (updated) |

**Global Reference Points:**
| Country | Emission Factor |
|---|---|
| Norway (hydro-dominant) | 0.007 kg CO₂/kWh |
| Sweden | ~0.04 kg CO₂/kWh |
| UK | ~0.23 kg CO₂/kWh |
| India | ~0.82 kg CO₂/kWh |
| Poland (coal-dominant) | 1.13 kg CO₂/kWh |

### Hourly vs. Annual Accounting
- Standard practice uses **annual-average grid emission factors**
- However, grid carbon intensity fluctuates hourly with renewable generation
- Annual averaging can **over- or under-estimate inventories by up to 35%**
- **Best practice:** Hourly accounting (recommended by research literature)

```
Carbon Inventory = Σ (Hourly Electricity Demand × Hourly Grid Carbon Intensity)
```

---

## ♻️ Waste & Recycling Calculations (Scope 3)

### Net Emission Formula
Waste management accounting includes **both** the processing burden and the **offset** from recovered materials:

```
Net CO₂ = Processing Emissions − Displaced Material Savings (offsets)
```

### Emission Factors by Disposal Method
| Disposal Method | Emission Factor |
|---|---|
| **Recycling** | 21–65 kg CO₂e/tonne *(lowest)* |
| **Composting (aerobic)** | ~48 kg CO₂e/tonne |
| **Anaerobic Digestion** | ~21 kg CO₂e/tonne |
| **Low-temp incineration + energy recovery** | 172–249 kg CO₂e/tonne |
| **Landfill (managed)** | ~520 kg CO₂e/tonne |
| **High-temp incineration** | **1,074 kg CO₂e/tonne** *(highest)* |

### Recycling Offsets (Virgin Material Displacement)
Recycling creates **negative emissions** by displacing the need to produce virgin raw materials:

```
Offset (kg CO₂e) = Mass Recycled (t) × Displacement Factor (kg CO₂e/t)
```

**Examples:**
- Recycling 1 tonne of **construction waste** → saves ~100.4 kg CO₂e
- Recycling 1 tonne of **paper** → saves ~1,000 kg CO₂e (vs. virgin pulp)
- A 1% increase in MSW recycling → reduces CO₂ emissions by ~0.209% (long-run)

---

## 📊 Summary: Calculation Methods by Data Source

| Input Document | Scope | Recommended Method | Key Variables |
|---|---|---|---|
| **Petrol/Diesel Bill** | Scope 1 | Tier 1 (volume × EF) | Liters consumed, fuel type |
| **Vehicle Log / Odometer** | Scope 1 | Tier 3 (distance-based) | km traveled, vehicle type |
| **Electricity Bill (kWh)** | Scope 2 | Activity × Grid EF | kWh consumed, grid region |
| **Electricity Bill (₹ only)** | Scope 2 | Spend-based MRIO | Spend amount, tariff rate |
| **Waste Disposal Receipt** | Scope 3 | EF × mass by stream | Waste category, mass (kg/t) |
| **Recycling Certificate** | Scope 3 | Net offset formula | Material type, mass recycled |
| **LPG/CNG Gas Bill** | Scope 1 | Volume × fuel EF | m³ or kg of gas used |
| **Freight/Logistics Invoice** | Scope 3 | Distance × tonne-km EF | Distance, cargo weight, mode |

---

## 📚 Key Research Papers Referenced

| Paper | Authors | Year | Focus |
|---|---|---|---|
| *Evaluation of Carbon Footprint in a Waste Recovery/Recycle Facility* | Demirtaş et al. | 2021 | IPCC Tier 1–3 fuel & electricity formulas |
| *Estimating carbon footprints from large scale financial transaction data* | Trendl et al. | 2022 | Spend-based MRIO multipliers |
| *Hourly accounting of carbon emissions from electricity consumption* | Miller et al. | 2022 | Time-varying grid intensity |
| *Assessment of Carbon Footprint of a Campus with Sustainability Initiatives* | Artun et al. | 2021 | Integrated fuel + power + recycling tool |
| *Carbon Footprint Estimation based on Campus Activities in ITERA* | Sari et al. | 2021 | Electricity (Scope 2) and waste (Scope 3) |
| *Site-specific carbon footprints of Scandinavian wastewater treatment plants* | — | 2019 | LCA with grid fuel mix variations |
| *Life cycle assessment of demolition waste recycling* | — | 2022 | LCA with displacement offsets |
| *Dynamic causality from MSW recycling to carbon emissions* | Razzaq et al. | 2021 | Macroeconomic recycling impact |

---

## Implementation Notes for CarbonIQ

- **Document Ingestion Pipeline:** When processing bills/invoices, extract the **activity quantity** (kWh, liters, kg) and map it to the correct emission factor from the `EmissionFactor` collection.
- **Spend-Based Fallback:** If the AI cannot extract a physical quantity from a bill (e.g., only a total ₹ amount), use a spend-based multiplier as a fallback.
- **India-Specific Factors:** Use CEA grid emission factor (`0.82 kg CO₂/kWh`) for all Indian electricity calculations. Use BEE/MoEFCC fuel factors for petrol/diesel.
- **Scope Auto-Classification:** Fuel combustion → Scope 1. Purchased electricity → Scope 2. Waste, freight, purchased goods → Scope 3.
- **Recycling as Negative Emission:** Recycling activity records should reduce (not increase) the total carbon footprint in the dashboard.
