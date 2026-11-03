# CarbonIQ - Intelligent Enterprise Carbon Accounting Engine

CarbonIQ is an automated, AI-driven corporate carbon accounting platform tailored for Indian Small and Medium Enterprises (SMEs) and their value chain partners. It bridges the gap between unstructured business documentation (utility bills, fuel receipts, logistics invoices, waste reports) and rigorous greenhouse gas reporting standards (GHG Protocol, CEA National Grid Benchmarks, SEBI BRSR Core, and EU CBAM).

---

## 🌟 Key Capabilities

* **Automated Document Intelligence:** Ingests PDFs, scanned receipts, utility bills, and Excel logs via Multimodal Vision AI / LLMs and regex heuristics to extract billing dates, consumption quantities, units, and vendor information.
* **Intelligent GHG Scope Classification:** Categorizes transactions into **Scope 1** (Direct Combustion & Company Transport), **Scope 2** (Grid Electricity), and **Scope 3** (Waste, Freight, and Purchased Goods).
* **Authoritative Physical Factor Catalogue (Layer 1):** Pre-seeded with 149 authoritative Indian factors from the Central Electricity Authority (CEA Baseline Database 2024: $0.82\text{ kg CO}_2/\text{kWh}$), Bureau of Energy Efficiency (BEE), MoEFCC, and IPCC.
* **Spend-Based Leontief EEIO Engine (Layer 2):** Integrates **EXIOBASE 3.11.2 (2024 pxp)** covering 200 Indian economic sectors to calculate Scope 3 supplier emissions when physical consumption logs are missing.
* **Scope 3 Decoupling & Hotspot Screening:** Separates direct vendor emissions from upstream Leontief Tier-$N$ supply chain emissions, automatically flagging Scope 3 Pareto hotspots ($>500\text{ kg CO}_2\text{e}$ or $>₹1,00,000$ spend).
* **Closed-Loop Waste Recycling Offsets:** Implements displacement credit accounting ($-0.957\text{ kg CO}_2\text{e/kg}$) rewarding waste diversion with negative emissions.
* **Interactive Document Review Modal:** Live, zero-latency recalculation panel displaying suggested emissions, exact calculation formulas, methodology provenance, and Layer 3 LCA refinement alerts.

---

## 🏛️ The 3-Layer CarbonIQ Calculation Architecture

| Layer | Calculation Method | Primary Data Source | Role & Characteristics |
| :--- | :--- | :--- | :--- |
| **Layer 1** | **Activity-Based / Process-Specific** | MongoDB 149-Factor Catalogue (`emissionfactors`) | **Primary Backbone:** Tier 1/Tier 3 physical accounting for fuels (liters), electricity (kWh), waste (kg), and freight (km). Lowest uncertainty ($\pm 5\%$). |
| **Layer 2** | **Spend-Based EEIO (Leontief Matrix)** | EXIOBASE 3.11.2 (`IOT_2024_pxp` numerical binary + MongoDB metadata) | **Financial Fallback:** Computes supply chain footprints for supplier invoices using $M = B(I - A)^{-1}$ across 200 Indian sectors. |
| **Layer 3** | **Targeted Supplier LCA Refinement** | Supplier EPDs, Bill of Materials (BOM), PCFs | **Hotspot Refinement:** Triggered for high-impact suppliers ($>500\text{ kg CO}_2\text{e}$) to replace macroeconomic IO proxies with verified primary data. |

---

## ⚙️ EXIOBASE 3.11.2 Numerical Data Encoding

To maintain exceptional system performance and prevent database bloat, the 702 MB EXIOBASE intermediate transaction matrix ($Z.txt$) is **NOT** dumped into MongoDB documents.

```
                           EXIOBASE 3.11.2 (702MB Z, x, F)
                                          │
                            [seedExiobase.js Preprocessor]
                                          │
                    ┌─────────────────────┴─────────────────────┐
                    ▼                                           ▼
      [Compact Numerical Vectors]                     [MongoDB Metadata]
   Float64 Binary: 3.1 KB (.bin)                  Collection: `eeiosectors`
   Keyed JSON Cache: 53.1 KB (.json)              - HSN / SAC Code Mappings
   - Direct Factor: b = F_ghg / x                 - Search Aliases & Sector Title
   - Leontief Multiplier: M = B(I - A)⁻¹          - Precomputed Intensity References
```

* **Storage Footprint:** Less than 60 KB total memory footprint in Node.js.
* **Resolution Speed:** $O(1)$ sub-millisecond lookup by HSN code prefix or keyword classification.

---

## 🚀 Quickstart Guide

### Prerequisites
* Node.js v18+ / v20+
* Yarn (`npm install -g yarn`)
* Local or Atlas MongoDB instance (`mongodb://127.0.0.1:27017/carboniq`)

### 1. Server Setup
```bash
cd server
yarn install

# Ensure environment variables are configured (.env)
# MONGO_URI=mongodb://127.0.0.1:27017/carboniq
# AI_VISION_API_KEY=your_api_key

# Seed physical emission factors (149 authoritative benchmarks)
node scripts/seedEmissionFactors.js

# Seed EXIOBASE 3.11.2 Indian EEIO sectors and precompute Leontief multipliers
node scripts/seedExiobase.js

# Start backend server
yarn dev
```

### 2. Client Setup
```bash
cd client
yarn install
yarn dev
```
Access the client application at `http://localhost:5173`.

---

## 🧪 Verification & Testing

Verify emission factor indexing and search queries:
```bash
cd server
yarn test:factors
```

Verify EXIOBASE 3.11.2 spend calculations:
```bash
node -e "
import('./src/services/carbonCalculationService.js').then(async m => {
  const invoice = {
    category: 'SUPPLIER_INVOICE',
    scope: 'SCOPE_3',
    quantity: 150000,
    unit: 'INR',
    supplierName: 'ABC Packaging Ltd',
    description: 'Corrugated cartons for dispatch'
  };
  const res = await m.calculateCarbonEmissions(invoice);
  console.log('Calculation output:', res);
  process.exit(0);
});
"
```

---

## 📄 License & Standards Compliance

CarbonIQ calculations strictly adhere to:
* **GHG Protocol Corporate Accounting and Reporting Standard** (WRI / WBCSD)
* **IPCC 2006 Guidelines for National Greenhouse Gas Inventories** (with AR5 100-year GWPs)
* **Central Electricity Authority (CEA) CO₂ Baseline Database v20.0 (2024)**
* **SEBI Business Responsibility and Sustainability Reporting (BRSR Core)**
* **EXIOBASE 3.11.2 Multi-Regional Input-Output Database (2024)**

# What is EXIOBASE
EXIOBASE is a global, detailed Multi-Regional Environmentally Extended Supply-Use Table (MR-SUT) and Input-Output Table (MR-IOT) database. It is widely used to analyze the environmental, resource, and socio-economic impacts of economic activities, trade, and final product consumption worldwide.