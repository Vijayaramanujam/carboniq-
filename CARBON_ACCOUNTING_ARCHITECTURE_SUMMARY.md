# CarbonIQ — System Architecture, Calculation Methodologies & Hybrid IO LCA Framework

---

## 1. Executive Summary & Core Purpose

**CarbonIQ** is an automated enterprise carbon accounting and greenhouse gas (GHG) inventory platform tailored for Small and Medium Enterprises (SMEs), with primary calibration for Indian industrial clusters.

The platform ingests unstructured operational and financial records—such as electricity bills, fuel receipts, logistics manifests, waste disposal tickets, and procurement invoices. It automatically classifies relevance, extracts structured activity data, computes statutory greenhouse gas emissions across GHG Protocol Scopes 1, 2, and 3, and presents real-time suggested carbon footprints with audit-traceable provenance on the Document Review page.

---

## 2. End-to-End System Architecture

```
[ Upload Ingestion ]
    ├── Single / Multi-file upload (.pdf, .png, .jpeg, .xlsx, .csv)
    └── Secure ZIP archive streaming & safe decompressor (adm-zip)
           │
           ▼
[ Processing Pipeline ] ──► server/src/services/processingPipeline.js
    ├── 1. Sharp Image Compression (>1MB downsampled)
    ├── 2. SHA-256 Deduplication (Company-scoped collision check)
    ├── 3. Multimodal Vision AI / LLM / pdf-parse text & tabular extraction
    ├── 4. Carbon Relevance & Scope Classifier (RELEVANT / IRRELEVANT / UNCERTAIN)
    ├── 5. Structured Field Normalization (Quantity, Unit, Fuel, Transport, Waste)
    └── 6. Automated Suggested Emission Computation (Pre-review snapshot)
           │
           ▼
[ MongoDB Persistence ]
    ├── `documents` collection ──────────► Models: Document.js
    ├── `activityrecords` collection ────► Models: ActivityRecord.js
    └── `emissionfactors` collection ────► Models: EmissionFactor.js (149 verified factors)
           │
           ▼
[ Document Review & Verification ] ──► client/src/components/DocumentReviewModal.jsx
    ├── Split-screen original document preview vs editable extracted fields
    ├── Real-Time Suggested Carbon Emissions Panel (Zero-latency reactivity)
    ├── Visual formula pill, scope badge, and audit provenance drawer
    └── "Approve & Save to MongoDB" ──► Creates verified ActivityRecord with emissions
```

---

## 3. Mathematical Principles & Calculation Methodologies

The accounting foundation complies with the **GHG Protocol Corporate Accounting and Reporting Standard**, **ISO 14064-1**, and **IPCC Guidelines for National Greenhouse Gas Inventories**.

### 3.1 The Universal Formula
$$\text{Emissions } (\text{kg CO}_2\text{e}) = \text{Activity Quantity} \times \text{Applicable Emission Factor}$$

---

### 3.2 Scope 1: Direct Combustion & Fleet Emissions

#### Method 1 — Tier 1 (Volume-Based Combustion)
Applied when physical fuel consumption (liters, $\text{m}^3$, $\text{kg}$) is extracted from fuel bills or fuel pump receipts:

$$\text{CO}_2 \text{ (kg)} = \text{Fuel Volume (Liters or kg)} \times \text{Emission Factor (kg CO}_2/\text{unit)}$$

**Statutory Indian Benchmarks (Bureau of Energy Efficiency - BEE / MoEFCC / IPCC):**
- **Diesel (High Speed Diesel):** $2.68\text{ kg CO}_2/\text{liter}$ (or $2.6444\text{ kg CO}_2/\text{liter}$ baseline; $3.186\text{ kg CO}_2/\text{kg}$ mass basis)
- **Petrol / Motor Gasoline:** $2.31\text{ kg CO}_2/\text{liter}$ (or $2.2719\text{ kg CO}_2/\text{liter}$)
- **Compressed Natural Gas (CNG):** $2.04\text{ kg CO}_2/\text{kg}$ (or $2.693\text{ kg CO}_2/\text{kg}$)
- **Liquefied Petroleum Gas (LPG):** $1.51\text{ kg CO}_2/\text{liter}$ (volumetric) or $2.983\text{ kg CO}_2/\text{kg}$ (19 kg commercial cylinder)
- **Piped Natural Gas (PNG):** $2.02\text{ kg CO}_2/\text{m}^3$ (or $1.92\text{ kg CO}_2/\text{m}^3$)
- **Furnace Oil / Heavy Fuel Oil (180 cSt):** $2.958\text{ kg CO}_2/\text{liter}$ ($3.114\text{ kg CO}_2/\text{kg}$)

#### Method 3 — Tier 3 (Distance-Based Fleet Logistics)
Applied to company-owned vehicles, logistics manifests, and odometer records:

$$\text{CO}_2\text{e} = \text{Distance (km)} \times \text{Emission Factor (kg CO}_2\text{e/km)} \times \text{Vehicle Load Factor}$$

- **Small Commercial Vehicle (Tata Ace / Mahindra Bolero):** $0.21\text{ kg CO}_2\text{e/km}$ (or $0.158\text{ kg CO}_2\text{e/tonne-km}$)
- **Medium Commercial Vehicle (16t MCV):** $0.28\text{ kg CO}_2\text{e/tonne-km}$
- **Heavy Goods Vehicle (28-40t container truck):** $0.11\text{ kg CO}_2\text{e/tonne-km}$

---

### 3.3 Scope 2: Indirect Emissions from Purchased Electricity

#### Standard Location-Based Accounting
$$\text{CO}_2 \text{ (kg)} = \text{Electricity Consumed (kWh)} \times \text{Grid Emission Factor (kg CO}_2/\text{kWh)}$$

**Central Electricity Authority (CEA), Ministry of Power, Government of India Benchmarks:**
- **India National Grid (2024 Updated CEA Benchmark):** **$0.82\text{ kg CO}_2/\text{kWh}$**
- **India National Grid (FY 2023–24 Baseline):** **$0.727\text{ kg CO}_2/\text{kWh}$**
- **Northern Regional Grid Dispatch Proxy:** $0.742\text{ kg CO}_2/\text{kWh}$
- **Western Regional Grid Dispatch Proxy:** $0.768\text{ kg CO}_2/\text{kWh}$
- **Southern Regional Grid Dispatch Proxy:** $0.692\text{ kg CO}_2/\text{kWh}$
- **Onsite Solar PV / Certified Green Tariff:** **$0.00\text{ kg CO}_2/\text{kWh}$**

*Unit Mapping:* In Indian commercial DISCOM billing, $1\text{ Billing Unit} \equiv 1\text{ kWh}$.

---

### 3.4 Scope 3: Waste Management & Closed-Loop Recycling Offsets

#### The Net Avoided Emission Model
Under standard waste accounting (IPCC / Demirtaş et al. 2021), the net climate burden accounts for both processing emissions and the avoided burden of virgin raw material displacement:

$$\text{Net CO}_2\text{e} = \text{Processing Emissions} - \text{Displaced Virgin Material Savings (Offset)}$$

$$\text{Offset (kg CO}_2\text{e)} = \text{Mass Recycled (kg)} \times \text{Displacement Factor (kg CO}_2\text{e/kg)}$$

| Waste Stream / Disposal Method | Processing Intensity | Offset Factor | Net Climate Impact ($\text{kg CO}_2\text{e/kg}$) | Nature of Carbon Accounting |
| :--- | :--- | :--- | :--- | :--- |
| **Recycled Cardboard / Paper** | $+0.043$ | $-1.000$ | **$-0.957$** | **Negative Emission / Avoided Carbon** |
| **Recycled PET Plastic Bottles** | $+0.024$ | $-0.850$ | **$-0.826$** | **Negative Emission / Avoided Carbon** |
| **Composted Food/Organic** | $+0.048$ | $0.000$ | **$+0.048$** | Aerobic Oxidation (Positive emission) |
| **Anaerobic Digestion + Biogas** | $+0.021$ | $0.000$ | **$+0.021$** | Bio-methane Capture (Positive emission) |
| **Managed Sanitary Landfill** | $+0.520$ | $0.000$ | **$+0.520$** | Methane Decay (High positive emission) |
| **High-Temp Incineration** | $+1.074$ | $0.000$ | **$+1.074$** | Thermal Oxidation (High positive emission) |

*Implementation Rule:* Recycling activities produce negative emissions, reducing the enterprise's gross carbon footprint in analytics and dashboards.

---

### 3.5 Method 4: Spend-Based Financial Fallback (MRIO Multipliers)

Applied when physical activity data is unobtainable and only an invoice currency amount is present:

$$\text{CO}_2\text{e (kg)} = \text{Spend (INR)} \times \text{Carbon Multiplier (kg CO}_2\text{e/INR)}$$

- **General Procurement Spend:** $0.00025\text{ kg CO}_2\text{e/₹}$ ($250\text{ g CO}_2\text{e}$ per ₹1,000 spend)
- **Commercial Fuel Spend Proxy:** $0.023\text{ kg CO}_2\text{e/₹}$ (calibrated against ₹100/liter pump price)
- **Commercial Electricity Spend Proxy:** $0.1025\text{ kg CO}_2\text{e/₹}$ (calibrated against ₹8/kWh DISCOM commercial tariff)

---

## 4. The Hybrid Input-Output (Hybrid IO) LCA Framework

Traditional Scope 3 accounting fails because rural Indian SMEs cannot force upstream suppliers or freight operators to submit verified energy logs. The **Hybrid IO LCA framework** solves this boundary failure.

```
                           [ Procurement Invoices & Bills ]
                                          │
                   ┌──────────────────────┴──────────────────────┐
                   ▼                                             ▼
       [ Physical Activity Extracted ]               [ Financial Spend Only ]
                   │                                             │
                   ▼                                             ▼
          Layer 1: Process LCA                        Layer 2: Leontief EEIO
          (Tier 1-3 Factors)                         M = B · (I - A)^-1
                   │                                             │
                   └──────────────────────┬──────────────────────┘
                                          ▼
                         [ Unified Scope 3 Footprint ]
                                          │
                                          ▼
                         [ Pareto 80/20 Hotspot Screening ]
                                          │
                     ┌────────────────────┴────────────────────┐
                     ▼                                         ▼
            Top 20% Hotspots                           Bottom 80% Long-Tail
          (>= 80% of Emissions)                        (<= 20% of Emissions)
                     │                                         │
                     ▼                                         ▼
           Targeted LCA Refinement                    Retain Leontief Proxy
          • Supplier Primary Logs                    (Complete compliance,
          • Bill of Materials BOM                     zero cut-off errors)
          • Cradle-to-Gate EPDs
```

### 4.1 The Leontief Upstream Matrix Formulation
In the Environmentally-Extended Input-Output (EEIO) layer, the total macroeconomic output $x$ across all $N$ sectors of the Indian economy is modeled via:

$$x = (I - A)^{-1} y$$

Where:
- $A$ is the $N \times N$ direct consumption coefficients matrix ($A_{ij}$ is the input from sector $i$ per unit output of sector $j$).
- $(I - A)^{-1}$ is the **Leontief Inverse matrix**, accounting for direct and indirect supply chain rounds.
- $B$ is the direct emission intensity vector ($\text{kg CO}_2\text{e}$ emitted per rupee of gross sectoral output).
- $M = B(I - A)^{-1}$ is the **total GHG intensity multiplier vector** per Indian economic sector (MOSPI 140-sector table / EXIOBASE India).

### 4.2 Pareto 80/20 Hotspot Screening & Targeted LCA Refinement
1. **100% Boundary Closure:** Spend-based EEIO eliminates boundary cut-off errors by processing 100% of procurement invoices.
2. **Cumulative Ranking:** Suppliers are ranked descending by emission volume: $E_1 \ge E_2 \ge \dots \ge E_n$.
3. **Threshold Screening:** The cumulative emission share is evaluated:
   $$\text{CumulativeShare}_k = \frac{\sum_{i=1}^k E_i}{\sum_{i=1}^n E_i}$$
4. **Targeted Refinement:**
   - **Hotspots ($\le 80\%$ cumulative emissions):** Flagged in the UI with a high-uncertainty badge ($\pm 35\text{--}50\%$). The SME is guided to replace the macroeconomic proxy with a primary process LCA (e.g. supplier's electricity sub-meter, specific freight fuel receipts, or cradle-to-gate Bill of Materials).
   - **Long-tail vendors ($> 80\%$ cumulative emissions):** The Leontief spend proxy is retained, satisfying GHG Protocol requirements without burdening minor vendors.

---

## 5. Database Architecture & MongoDB Schemas

### 5.1 Collection: `emissionfactors`
- **Model File:** `server/src/models/EmissionFactor.js`
- **Dataset:** 149 verified factors seeded from `server/src/data/emissionFactors.seed.json`
- **Key Fields:** `activityKey`, `activityName`, `category`, `factorValue`, `factorUnit`, `activityUnit`, `scope`, `reportingYear`, `sourceOrganization`, `methodology`, `isActive`.
- **Compound Unique Index:**
  ```javascript
  { activityKey: 1, countryCode: 1, reportingYear: 1, sourceOrganization: 1, methodology: 1 }
  ```
- **Compound High-Performance Query Indexes:**
  - `{ category: 1, countryCode: 1, reportingYear: -1, activityName: 1 }`
  - `{ scope: 1, reportingYear: -1 }`
  - `{ isActive: 1, category: 1, scope: 1 }`

### 5.2 Collection: `documents`
- **Model File:** `server/src/models/Document.js`
- **Key Fields:** `companyId`, `originalFileName`, `mimeType`, `sha256`, `carbonRelevance`, `scope`, `extractedFields`, `processingStatus`, `reviewStatus`.
- **Embedded Emissions Object:**
  ```javascript
  suggestedEmissions: {
    emissionsKg: Number,
    emissionsTonnes: Number,
    factorUsed: Number,
    factorUnit: String,
    activityUnit: String,
    methodology: String,
    source: String,
    calculationFormula: String,
    isNegativeOffset: Boolean,
    tier: String,
    factorKey: String,
    factorName: String,
    recommendation: String
  }
  ```

### 5.3 Collection: `activityrecords`
- **Model File:** `server/src/models/ActivityRecord.js`
- **Key Fields:** `companyId`, `documentId`, `recordSource` (`EXTRACTED` | `MANUAL`), `category`, `scope`, `activityDate`, `quantity`, `unit`, `supplierName`, `categoryData`, `verificationStatus`.
- **Embedded Carbon Object:** `carbonEmissions` (matching `suggestedEmissions` structure, stored permanently upon SME approval).

---

## 6. Implementation Map: Codebase Locations

| Component | File Path | Role & Functionality |
| :--- | :--- | :--- |
| **Backend Calculation Engine** | `server/src/services/carbonCalculationService.js` | Evaluates CEA grid baselines, fuel factors, recycling offsets, and spend proxies on the server. |
| **Client Calculation Utility** | `client/src/utils/carbonEmissionCalculator.js` | Provides real-time reactive calculations in the browser as the user edits quantities or dropdowns. |
| **Document Review Modal** | `client/src/components/DocumentReviewModal.jsx` | Renders the Suggested Carbon Emissions panel at the bottom of the review page with formula pill and methodology drawer. |
| **Processing Pipeline** | `server/src/services/processingPipeline.js` | Ingests documents, extracts data with Multimodal Vision AI/LLM, and calculates initial `suggestedEmissions`. |
| **Document Controller** | `server/src/controllers/documentController.js` | Persists `carbonEmissions` to `ActivityRecord` upon approval; exposes `POST /calculate-emissions`. |
| **Activity Records List** | `client/src/components/ActivityRecordsList.jsx` | Tabular dashboard showing verified records, quantities, and calculated $\text{kg CO}_2\text{e}$. |
| **Document List** | `client/src/components/DocumentList.jsx` | Displays ingested files with badge previews of suggested $\text{kg CO}_2\text{e}$. |
| **Seed Factors Dataset** | `server/src/data/emissionFactors.seed.json` | 149 verified factor records from CEA, MoEFCC, BEE, UK DESNZ, and US EPA. |

---

## 7. Sample Calculation Trace: Electricity Bill

- **Input Record:** `knowYourBill-part2.png`
- **Document Type:** `ELECTRICITY_BILL` (Scope 2)
- **Extracted Fields:** $518\text{ units} \equiv 518\text{ kWh}$
- **Grid Authority:** Central Electricity Authority of India (CEA) — CO2 Baseline Database v20.0 (2024 Updated)
- **UI Presentation:** Displays at the bottom of the Document Review modal with a formula pill, CEA grid metadata, and rooftop solar transition insights. Upon approval, persisted into MongoDB `ActivityRecord`.

---

## 8. Module Completion Status & Technical Audit

Below is the exhaustive, component-by-component audit of which system modules are **COMPLETED** (implemented, tested, and actively functioning) versus **NOT COMPLETED** (architected in roadmap or pending future sprints).

### 8.1 Summary Audit Matrix

| System Module | Sub-Module / Capability | Status | Implementation Location |
| :--- | :--- | :--- | :--- |
| **1. Ingestion Engine** | Multi-file upload (.pdf, .png, .jpg, .csv, .xlsx) | ✅ **COMPLETED** | `server/src/middleware/uploadMiddleware.js` |
| | ZIP Archive safe unzipping & decompression | ✅ **COMPLETED** | `server/src/services/archiveService.js` |
| | Sharp Image Downsampling (>1MB auto-compress) | ✅ **COMPLETED** | `server/src/services/imageCompressionService.js` |
| | Company-scoped SHA-256 collision deduplication | ✅ **COMPLETED** | `server/src/services/cryptoService.js` |
| **2. Extraction & AI** | Multimodal Vision AI for scanned bills | ✅ **COMPLETED** | `server/src/services/groqService.js` |
| | High-throughput LLM reasoning for text invoices | ✅ **COMPLETED** | `server/src/services/groqService.js` |
| | Tabular CSV / Excel parsing with validation | ✅ **COMPLETED** | `server/src/services/extractionService.js` |
| | Extracted field validation & confidence scoring | ✅ **COMPLETED** | `server/src/services/extractionService.js` |
| **3. Classification** | Fast rule-based carbon relevance screening | ✅ **COMPLETED** | `server/src/services/classificationService.js` |
| | Automated GHG Scope auto-classification (1, 2, 3) | ✅ **COMPLETED** | `server/src/services/groqService.js` |
| | Classification reason logging & uncertainty flag | ✅ **COMPLETED** | `server/src/models/Document.js` |
| **4. Emission Database** | 149 verified factor seed dataset (CEA, MoEFCC, DESNZ) | ✅ **COMPLETED** | `server/src/data/emissionFactors.seed.json` |
| | Mongoose model with compound unique & query indexes | ✅ **COMPLETED** | `server/src/models/EmissionFactor.js` |
| | Idempotent seeder & 15-test verification suite | ✅ **COMPLETED** | `server/test/emission_factors.test.js` |
| | Server-side pagination, multi-field search, sorting | ✅ **COMPLETED** | `server/src/controllers/emissionFactorController.js` |
| | Interactive frontend factor catalogue browser | ✅ **COMPLETED** | `client/src/components/EmissionFactorDataset.jsx` |
| **5. Carbon Engine** | Scope 1 Tier 1 Fuel volume combustion (Diesel, Petrol) | ✅ **COMPLETED** | `server/src/services/carbonCalculationService.js` |
| | Scope 1/3 Tier 3 Distance-based transport | ✅ **COMPLETED** | `server/src/services/carbonCalculationService.js` |
| | Scope 2 CEA India National Grid baseline ($0.82\text{ kg/kWh}$) | ✅ **COMPLETED** | `server/src/services/carbonCalculationService.js` |
| | Scope 3 Recycling net negative offset ($-0.957\text{ kg/kg}$) | ✅ **COMPLETED** | `server/src/services/carbonCalculationService.js` |
| | Scope 3 Landfill, Composting, Incineration factors | ✅ **COMPLETED** | `server/src/services/carbonCalculationService.js` |
| | Method 4 Flat MRIO spend fallback ($0.00025\text{ kg/₹}$) | ✅ **COMPLETED** | `server/src/services/carbonCalculationService.js` |
| | Client-side 0-latency live calculation engine | ✅ **COMPLETED** | `client/src/utils/carbonEmissionCalculator.js` |
| **6. Review UI & Storage**| Split-screen preview vs editable verified fields | ✅ **COMPLETED** | `client/src/components/DocumentReviewModal.jsx` |
| | Suggested Carbon Emissions Panel at bottom of review | ✅ **COMPLETED** | `client/src/components/DocumentReviewModal.jsx` |
| | Dynamic recalculation on form edits with formula pill | ✅ **COMPLETED** | `client/src/components/DocumentReviewModal.jsx` |
| | Avoided carbon offset badge for recycling | ✅ **COMPLETED** | `client/src/components/DocumentReviewModal.jsx` |
| | Expandable methodology & factor provenance drawer | ✅ **COMPLETED** | `client/src/components/DocumentReviewModal.jsx` |
| | Persisting verified emissions into MongoDB records | ✅ **COMPLETED** | `server/src/controllers/documentController.js` |
| | Emissions columns in Document and Activity tables | ✅ **COMPLETED** | `client/src/components/DocumentList.jsx`, `ActivityRecordsList.jsx` |
| **7. Hybrid IO & EEIO** | Full Leontief Inverse Multipliers $M = B(I - A)^{-1}$ for India (2024) | ✅ **COMPLETED** | `server/src/services/eeioService.js`, `seedExiobase.js` |
| | 200 EXIOBASE Indian sector commodity vectors & metadata | ✅ **COMPLETED** | `server/src/models/EEIOSector.js`, `exiobase_multipliers.bin` |
| | Numerical binary/JSON vector store decoupled from MongoDB | ✅ **COMPLETED** | `server/src/data/exiobase/exiobase_multipliers.json` |
| | Automated HSN prefix / NLP keyword EEIO sector disambiguator | ✅ **COMPLETED** | `server/src/services/eeioService.js` |
| | Direct vs Upstream Leontief Tier-N supply chain split | ✅ **COMPLETED** | `server/src/services/carbonCalculationService.js` |
| **8. Hotspot & LCA**   | Pareto threshold candidate screening (>500 kg CO₂e or >₹1L) | ✅ **COMPLETED** | `server/src/services/eeioService.js` |
| | High-uncertainty hotspot flagging in review modal UI | ✅ **COMPLETED** | `client/src/components/DocumentReviewModal.jsx` |
| | Targeted LCA Refinement workflow (BOMs & EPDs) | 🔄 **IN PROGRESS** | *UI Hotspot trigger ready; BOM ingestion pending* |
| | Supplier Primary Data Request portal & token links | ❌ **NOT COMPLETED** | *Planned: Supplier Self-Reporting Form* |
| **9. Reporting & Goals**| SEBI BRSR Core format report generator (PDF & Excel) | ✅ **COMPLETED** | `server/src/services/statutoryExportService.js` |
| | EU CBAM embedded emissions compliance export (XML & CSV) | ✅ **COMPLETED** | `server/src/services/statutoryExportService.js` |
| | Decarbonization ROI scenario simulator (Solar/EV) | ❌ **NOT COMPLETED** | *Planned: Scenario Planning Tab* |

---

### 8.2 Detailed Breakdown: Completed Modules

#### 1. Input Processing & Ingestion Pipeline (100% Complete)
- **Multi-File Uploads:** Scoped to authenticated SME companies, handles multiple files or ZIP archives with progress reporting and error isolation.
- **De-duplication:** Enforces company-scoped unique SHA-256 hash checks to prevent duplicate document ingestion.
- **Image Pre-processing:** Leverages `sharp` to automatically downsample oversized images while maintaining OCR legibility.

#### 2. Extraction & Intelligent Classification (100% Complete)
- **Multimodal Vision AI / LLM Pipeline:** Automatically extracts line items, consumption quantities, units, supplier names, and billing periods from scanned images and PDFs.
- **Scope & Relevance Determination:** Classifies operational documents into `SCOPE_1`, `SCOPE_2`, or `SCOPE_3` and tags irrelevant non-carbon files (e.g., payroll, internal memos).

#### 3. Database Architecture & Seed Dataset (100% Complete)
- **MongoDB Collections:** `emissionfactors`, `documents`, `activityrecords`, and `eeiosectors` are indexed for sub-millisecond query execution.
- **Authoritative Physical Factors:** 149 pre-seeded factors covering CEA grid electricity (historical and regional), fossil fuels, biomass, commercial waste, and freight.
- **Test Coverage:** Full verification suite passing with zero schema or pagination failures.

#### 4. Real-Time Document Review & Calculation UI (100% Complete)
- **Suggested Carbon Emissions Panel:** Integrated directly at the bottom of `DocumentReviewModal.jsx`.
- **Live Reactivity:** Computes carbon emissions with zero network latency using `carbonEmissionCalculator.js` as the SME adjusts extracted inputs.
- **Transparent Formula Pill:** Exposes the exact multiplication formula (e.g. `518 kWh × 0.82 kg CO₂/kWh = 424.76 kg CO₂e`).
- **Recycling Offset Display:** Recognizes recycling activities and renders green negative carbon offsets (avoided emissions).
- **MongoDB Persistence:** Saves `carbonEmissions` onto `ActivityRecord` and `Document` models upon approval.

#### 5. Layer 2 Spend-Based EEIO Engine (EXIOBASE 3.11.2) (100% Complete)
- **Decoupled Numerical Encoding:** Precomputes Leontief direct and total inverse multipliers from EXIOBASE 3.11.2 (2024 pxp table for India) into a high-performance numerical Float64 binary (`exiobase_multipliers.bin`, 3.1 KB) and keyed JSON cache (`exiobase_multipliers.json`, 53.1 KB), completely avoiding storing 702 MB matrix files in MongoDB.
- **MongoDB Metadata Taxonomy:** 200 Indian sectors seeded into `eeiosectors` collection with HSN code prefixes and search aliases.
- **Direct vs. Upstream Decomposition:** Calculates direct supplier emissions ($E_{\text{direct}} = s \cdot b$) and upstream supply chain emissions ($E_{\text{upstream}} = E_{\text{total}} - E_{\text{direct}}$).
- **Hotspot Screening:** Automatically flags financial transactions exceeding $500\text{ kg CO}_2\text{e}$ or $>₹1,00,000$ spend as Scope 3 Pareto hotspot candidates.
- **Interactive UI Preview:** `DocumentReviewModal.jsx` displays the Layer 2 EXIOBASE badge, matched sector title, supply chain decomposition pills, and Layer 3 refinement alert banner.

#### 6. Statutory Compliance & Export Generators (100% Complete)
- **SEBI BRSR Core Disclosures (PDF & Excel):**
  - **PDF Export:** Official printable disclosure statement via `pdfkit` covering Essential Indicators 7 (GHG Scope 1, 2, 3 emissions & intensities) and 8 (Energy consumption in MWh and GJ) under Principle 6.
  - **Excel Workbook (.xlsx):** Multi-tab structured workbook (`BRSR_Executive_Summary`, `EI_7_GHG_Emissions`, `EI_8_Energy_Consumption`, `Audit_Ledger`) built with `xlsx`.
- **EU CBAM Compliance Declarations (XML & CSV):**
  - **Transitional Registry XML:** Full Regulation (EU) 2023/956 data structure containing CN commodity codes (Steel 7208, Aluminum 7601, Cement 2523), specific direct embedded emissions ($t\text{ CO}_2\text{e}/t$), and specific indirect emissions using CEA 2024 grid factor.
  - **Importer Communication CSV:** Tabular data sheet formatted for European industrial value chain procurement.
- **Full Activity Audit Ledger (CSV):** Line-by-line audit trace with factor IDs, direct/upstream Leontief splits, and mathematical formulas.
- **Interactive Export Hub UI:** `StatutoryComplianceModal.jsx` embedded into the workspace header for instant 1-click downloads.

---

### 8.3 Detailed Breakdown: Remaining Modules (Roadmap)

#### 1. Targeted Process LCA Refinement Protocol (Layer 3 - In Progress)
- **Current State:** Hotspot candidates are automatically flagged in `DocumentReviewModal.jsx` and `eeioService.js`.
- **Target State:**
  - Build a dedicated **"Refine Hotspot"** modal allowing the user to override financial spend proxies by attaching supplier Environmental Product Declarations (EPDs), Product Carbon Footprints (PCFs), or Bills of Materials (BOMs).
  - Provide a secure tokenized link for suppliers to self-report energy logs directly into the SME's accounting ledger.

#### 2. Decarbonization ROI Scenario Simulator (Not Completed)
- **Target State:** Interactive reduction planner quantifying capital expenditure, operating expenditure savings, and rupee payback periods for rooftop solar PV, commercial EV logistics conversion, and scrap waste recycling revenue.


