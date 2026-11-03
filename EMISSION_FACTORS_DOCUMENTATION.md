# CarbonIQ — Emission Factor Database Documentation

## A. Purpose

CarbonIQ is an automated greenhouse gas (GHG) tracking and carbon footprint reduction platform designed for small and medium-sized enterprises (SMEs), with an initial target deployment across Indian industrial clusters.

The application accepts operational records—such as electricity bills, fuel receipts, logistics manifests, and waste disposal logs—and extracts structured business activity data (e.g., $1,200\text{ kWh}$ of electricity, $500\text{ Litres}$ of diesel, $200\text{ kg}$ of waste). 

To convert these business activities into greenhouse gas emissions, the standard accounting equation applies:

$$\text{Emissions } (\text{kg CO}_2\text{e}) = \text{Activity Quantity} \times \text{Applicable Emission Factor}$$

However, matching an emission factor requires far more than finding a compatible measurement unit. Selecting an appropriate factor depends on:
1. **Activity Type and Fuel Chemistry** (e.g., diesel vs. petrol vs. LPG).
2. **Geographical Jurisdiction** (e.g., Indian national electricity grid vs. European grid).
3. **Reporting Year / Temporal Period** (grid carbon intensities shift annually as renewable capacity expands).
4. **Accounting Scope & Boundary** (Scope 1 direct combustion vs. Scope 2 purchased electricity vs. Scope 3 value chain).
5. **Gas Basis** ($\text{CO}_2$-only vs. full greenhouse gas basket $\text{CO}_2\text{e}$ including $\text{CH}_4$ and $\text{N}_2\text{O}$).

This database provides a verified, source-documented, and audit-traceable foundation for corporate carbon calculations.

---

## B. Database Architecture

### Collection & Model
- **MongoDB Collection Name**: `emissionfactors`
- **Mongoose Model File**: [`server/src/models/EmissionFactor.js`](file:///d:/Pythee/Web/Hackathons/carboniq-/server/src/models/EmissionFactor.js)
- **Database Connection**: Managed via [`server/src/config/db.js`](file:///d:/Pythee/Web/Hackathons/carboniq-/server/src/config/db.js) using the environment variable `MONGODB_URI` (default: `mongodb://127.0.0.1:27017/carboniq`).

### Schema Fields
| Field Name | Type | Description |
| :--- | :--- | :--- |
| `activityKey` | `String` | Stable machine-readable identifier (e.g. `electricity-grid-in`, `fuel-diesel-combustion-in`). |
| `activityName` | `String` | Human-readable activity title. |
| `category` | `String` | Category enum: `ELECTRICITY`, `FUEL`, `TRANSPORTATION`, `WASTE`, `PURCHASED_GOODS`, `OTHER`. |
| `aliases` | `[String]` | Alternative search keywords and utility aliases for extracted document matching. |
| `description` | `String` | Detailed operational context and activity description. |
| `factorValue` | `Number` | Verified numerical multiplier (strictly non-negative). |
| `factorUnit` | `String` | Unit of resulting emissions (e.g., `kg CO2/kWh`, `kg CO2e/liter`, `kg CO2e/tonne-km`). |
| `activityUnit` | `String` | Base activity quantity unit (e.g., `kWh`, `liter`, `tonne-km`, `vehicle-km`, `kg`, `m3`). |
| `scope` | `String` | GHG Protocol Scope: `SCOPE_1`, `SCOPE_2`, or `SCOPE_3`. |
| `scopeCategory` | `String` | Specific GHG Protocol subcategory (e.g., `Category 4: Upstream transportation`). |
| `gasBasis` | `String` | Basis of measurement: `CO2` or `CO2e` (Carbon Dioxide Equivalent). |
| `methodology` | `String` | Formal calculation method (e.g., `National Grid Weighted Average (incl. RES)`). |
| `countryCode` | `String` | ISO 3166-1 alpha-2 code (`IN`, `GB`, `US`, `GLOBAL`). |
| `region` | `String` | Subnational region or grid boundary (e.g., `National (Unified Indian Grid)`). |
| `validFrom` | `Date` | Start of temporal validity (if documented). |
| `validTo` | `Date` | End of temporal validity (if documented). |
| `reportingYear` | `Number` | Applicable corporate accounting/fiscal year. |
| `sourcePublicationYear` | `Number` | Year in which the publishing authority issued the dataset. |
| `sourceOrganization` | `String` | Publishing official body (e.g., `Central Electricity Authority of India (CEA)`). |
| `sourceDataset` | `String` | Official dataset or report title. |
| `sourceUrl` | `String` | Authoritative source link. |
| `sourceReference` | `String` | Table, worksheet, or section citation. |
| `methodologyUrl` | `String` | Direct methodology guideline URL. |
| `limitations` | `String` | Stated boundaries, exclusions, and geographic assumptions. |
| `verifiedAt` | `Date` | Timestamp of manual or programmatic verification. |
| `isActive` | `Boolean` | Flag indicating whether the factor is enabled for calculation matching. |

### Indexes & Scalability Optimization
To ensure sub-millisecond query performance as the dataset expands to thousands of factors, the collection implements:
- **Compound Unique Index**:
  ```javascript
  {
    activityKey: 1,
    countryCode: 1,
    reportingYear: 1,
    sourceOrganization: 1,
    methodology: 1
  }
  ```
  *Why this index was chosen:* Prevents duplicate factor collisions across identical jurisdictions, authorities, and methodologies while enabling multiple reporting years (e.g. FY 2022-23 vs. FY 2023-24) to coexist.
- **High-Performance Compound Query Indexes**:
  1. `{ category: 1, countryCode: 1, reportingYear: -1, activityName: 1 }`: Optimizes filtered lookups and sorting by category, jurisdiction, and recency.
  2. `{ scope: 1, reportingYear: -1 }`: Accelerates GHG Scope filtering.
  3. `{ isActive: 1, category: 1, scope: 1 }`: Eliminates archived/inactive factor scans during runtime calculations.
  4. `{ activityName: 1 }`: Accelerates alphabetical sorting and prefix matching.
- **Single-Field Indexes**: `activityKey`, `aliases`, `countryCode`, `reportingYear`.

### Relationship to Activity Records
When an [`ActivityRecord`](file:///d:/Pythee/Web/Hackathons/carboniq-/server/src/models/ActivityRecord.js) is approved, it contains `activityDate`, `category`, `quantity`, and `unit`. The calculation engine queries `emissionfactors` by:
1. Matching `category` and `aliases` / `activityKey`.
2. Matching `countryCode` (e.g. `IN`).
3. Matching the fiscal/reporting year derived from `activityDate`.
4. Matching compatible `activityUnit`.

---

## C. Authoritative Data Sources

### 1. Central Electricity Authority (CEA), Ministry of Power, Government of India
- **Official Dataset**: *CO2 Baseline Database for the Indian Power Sector*
- **Latest Publications**: Version 19.0 (December 2023) and Version 20.0 (December 2024)
- **Official Portal**: [https://cea.nic.in/cdm-co2-baseline-database/?lang=en](https://cea.nic.in/cdm-co2-baseline-database/?lang=en)
- **Date Accessed**: October 2026
- **Justification for Selection**: CEA is the statutory body established under Section 70 of the Electricity Act, 2003. It collects station-by-station generation and fuel consumption data across all thermal, nuclear, hydro, and renewable power stations connected to the Indian national grid.
- **Corporate Scope 2 Suitability**:
  CEA calculates several factors: Operating Margin (OM), Build Margin (BM), Combined Margin (CM), and **Weighted Average Emission Rate (incl. RES)**. 
  - *OM, BM, and CM* are Clean Development Mechanism (CDM) offset metrics designed to measure counterfactual emissions avoided by adding a clean power plant to the grid.
  - For **corporate Scope 2 reporting** under the *GHG Protocol Scope 2 Guidance*, organizations must report the actual location-based carbon intensity of the power they consumed from the physical grid. Therefore, the **All-India Weighted Average (including renewables)** is the only methodologically correct CEA factor for corporate Scope 2 accounting.
- **Reporting Unit & Gas Basis**: Published in $\text{tCO}_2/\text{MWh}$ ($\equiv \text{kg CO}_2/\text{kWh}$). Measured on a **$\text{CO}_2$-only** basis (CEA does not monitor power station $\text{CH}_4$ and $\text{N}_2\text{O}$ emissions).

### 2. India GHG Program (WRI India, TERI, CII) & MoEFCC
- **Official Dataset**: *India GHG Program Technical Guidance — Fuel Combustion Emission Factors*
- **Official Portal**: [https://indiaghgp.org/guidance](https://indiaghgp.org/guidance) / [MoEFCC UNFCCC Submissions](https://unfccc.int)
- **Date Accessed**: October 2026
- **Justification for Selection**: Voluntary greenhouse gas accounting standard developed jointly by World Resources Institute (WRI) India, The Energy and Resources Institute (TERI), and the Confederation of Indian Industry (CII). Incorporates Ministry of Environment, Forest and Climate Change (MoEFCC) fuel calorific benchmarks for Indian petroleum product grades (High Speed Diesel and Motor Spirit).
- **Supported Activities**: Scope 1 stationary combustion (factory DG sets, industrial boilers) and mobile vehicle fleet combustion in India.

### 3. UK Department for Energy Security and Net Zero (DESNZ) / Defra
- **Official Dataset**: *UK Government GHG Conversion Factors for Company Reporting 2024*
- **Official Portal**: [https://www.gov.uk/government/collections/government-conversion-factors-for-company-reporting](https://www.gov.uk/government/collections/government-conversion-factors-for-company-reporting)
- **Date Accessed**: October 2026
- **Justification for Selection**: DESNZ (formerly BEIS/Defra) publishes one of the world's most transparent, peer-reviewed, and comprehensive conversion datasets, updated annually.
- **Supported Activities**:
  - Full-basket fuels (LPG, Natural Gas).
  - Freight transport (Heavy Goods Vehicles per $\text{tonne-km}$, delivery vans per $\text{vehicle-km}$).
  - Commercial and industrial waste disposal (landfill methane decay, closed-loop cardboard and scrap metal recycling).
- **Limitations**: Factors are calibrated to UK/European industrial standards and vehicle fleet specifications. They must not be applied to Indian grid electricity, and their geographic limitations are explicitly tagged.

### 4. US Environmental Protection Agency (EPA)
- **Official Dataset**: *EPA GHG Emission Factors Hub (March 2024 Update)*
- **Official Portal**: [https://www.epa.gov/climateleadership/ghg-emission-factors-hub](https://www.epa.gov/climateleadership/ghg-emission-factors-hub)
- **Date Accessed**: October 2026
- **Justification for Selection**: Provided as an international stationary combustion reference for US operations under 40 CFR Part 98 Mandatory GHG Reporting rules.

---

## D. Factor Catalogue Architecture

The database contains **149 comprehensive, verified emission factors** seeded in MongoDB (yielding 161 total historical and jurisdiction-specific records), spanning:

1. **Electricity & Energy (Scope 2 & Scope 1 Captive)**:
   - India National Grid annual baselines (CEA FY 2023-24, FY 2022-23, FY 2021-22).
   - India Northern, Western, and Southern regional grid dispatch proxies.
   - Zero-emission certified renewable electricity (Onsite Solar PV, Solar/Wind PPAs, Green Power Open Access).
   - Captive DG set electricity generation (BEE / CPCB standard 0.812 kg CO2e/kWh).
   - International grid electricity benchmarks (UK DESNZ, US eGRID, EU-27 average, China MEE, UAE DEWA, Singapore EMA).
   - District chilled water / centralized cooling and purchased industrial steam.

2. **Fuels & Stationary/Mobile Combustion (Scope 1)**:
   - Liquid fuels: High Speed Diesel (volumetric and mass), Motor Gasoline (Petrol), Light Diesel Oil (LDO), Furnace Oil (FO 180 cSt volumetric and mass), Low Sulphur Heavy Stock (LSHS), Superior Kerosene Oil (SKO).
   - Gaseous fuels: Compressed Natural Gas (CNG), Liquefied Petroleum Gas (LPG commercial 19kg cylinder and volumetric), Piped Natural Gas (PNG volumetric and energy basis).
   - Solid fuels: Indian domestic non-coking coal (Grade G7-G12), coking/metallurgical coal, Neyveli lignite, imported high-GCV steam coal, petroleum coke (pet coke).
   - Biofuels & low-carbon fuels: Compressed Bio Gas (CBG - SATAT scheme), 10% Ethanol blended petrol (E10), 20% Ethanol blended petrol (E20), pure Biodiesel (B100), B20 biodiesel blend, biomass agricultural briquettes, industrial firewood.
   - International standard reference fuels (UK DESNZ 2024 & US EPA Hub).

3. **Transportation & Logistics (Scope 1 Fleet & Scope 3 Freight)**:
   - Road Freight: 2-wheeler courier bikes (petrol and EV), 3-wheeler goods cargo (CNG), Small Commercial Vehicles (Tata Ace / Mahindra Bolero diesel and CNG, per vehicle-km and tonne-km), Light Commercial Vehicles (LCV 3.5-7.5t), Medium Commercial Vehicles (MCV 6-wheeler 16t), Heavy Commercial Vehicles (HCV 10-wheeler 28t), Multi-Axle Vehicles (MAV 14/18-wheeler container trucks).
   - Rail Freight: Indian Railways broad gauge freight (Electric traction vs. Diesel traction per tonne-km).
   - Air Freight: Domestic air cargo (<1,000 km) and long-haul international air freight (>3,700 km).
   - Ocean & Maritime: Container ships (3,000-4,999 TEU), dry bulk carriers (ore/grain/coal), product tankers, general cargo.
   - Business Travel: Domestic and international flights (economy and business class), Indian Railways passenger travel (AC classes vs. Sleeper), city taxis (petrol, diesel, CNG, and EV BluSmart), intercity buses (ordinary vs. luxury AC Volvo).
   - Employee Commuting: Motorcycles/scooters (petrol and EV), passenger cars (compact petrol/diesel, large SUVs, and EVs), urban metro rail transit.

4. **Purchased Goods & Raw Materials (Scope 3 Category 1)**:
   - Packaging: Corrugated cardboard cartons (recycled vs. virgin kraft), wrapping paper rolls, A4 copy paper reams, HDPE bottles, LDPE poly bags/liners, PP woven sacks, PET virgin bottles, rPET recycled flakes, PVC pipes, wooden Euro pallets, BOPP packing tape, air bubble wrap, LLDPE pallet stretch film, PP strapping bands, traditional jute gunny sacks.
   - Metals & Construction: TMT steel reinforcement rebars, Hot Rolled (HR) coil, Cold Rolled (CR) sheet, hot-dip galvanized steel, Electric Arc Furnace (EAF) 100% scrap recycled steel, primary virgin aluminum ingots vs. secondary recycled aluminum, continuous cast copper wire rods, brass alloys, refined zinc, Ordinary Portland Cement (OPC), Portland Pozzolana Cement (PPC fly ash blended), Ready Mix Concrete (RMC M25), red clay bricks, fly ash steam-cured bricks, Autoclaved Aerated Concrete (AAC) blocks, crushed stone aggregate, flat float glass.
   - Chemicals & Consumables: Industrial lubricants, engine oil, compressed oxygen cylinders, liquid nitrogen, Isopropyl Alcohol (IPA), Acetone, solvent-based enamel paints, sulfuric acid (H2SO4), caustic soda (NaOH).

5. **Waste Disposal & Water Operations (Scope 3 Category 5)**:
   - Solid waste disposal: Commercial landfill with gas recovery, municipal open dumping / unmanaged landfill, organic canteen waste composting, organic waste anaerobic digestion (biogas), high-temperature hazardous chemical TSDF incineration, certified electronic waste (e-waste) recycling.
   - Closed-loop material recycling: Cardboard and paper repulping, scrap iron/steel melting, scrap aluminum recycling, mixed rigid plastic recycling, PET bottle flaking, glass cullet recycling.
   - Water supply and wastewater treatment: Municipal tap water, deep borewell groundwater extraction, commercial water tanker delivery, on-site industrial Effluent Treatment Plant (ETP), Zero Liquid Discharge (ZLD) multi-effect evaporation.

6. **Fugitive Gases & Refrigerants (Scope 1 Direct Leakage)**:
   - Common HVAC refrigerants: R-134a, R-410A, R-404A, R-32, R-22, R-407C.
   - Industrial switchgear gas: Sulfur Hexafluoride (SF6).
   - Fire safety: CO2 fire extinguisher discharge.

---

## E. Selection Methodology & Accounting Principles

### 1. $\text{CO}_2$ vs. $\text{CO}_2\text{e}$
- **$\text{CO}_2$ (Carbon Dioxide)**: Measures only direct carbon dioxide released during combustion or chemical reaction. CEA electricity grid figures and MoEFCC liquid fuel benchmarks are measured strictly as $\text{CO}_2$.
- **$\text{CO}_2\text{e}$ (Carbon Dioxide Equivalent)**: Converts emissions of all six Kyoto greenhouse gases ($\text{CO}_2$, $\text{CH}_4$, $\text{N}_2\text{O}$, $\text{HFCs}$, $\text{PFCs}$, $\text{SF}_6$) into equivalent $\text{CO}_2$ mass using 100-year Global Warming Potentials (GWPs) from IPCC Fifth Assessment Report (AR5):
  $$\text{CO}_2\text{e} = \text{CO}_2 + (28 \times \text{CH}_4) + (265 \times \text{N}_2\text{O})$$
- *CarbonIQ Rule*: Never label a $\text{CO}_2$-only factor as $\text{CO}_2\text{e}$. The schema explicitly enforces `gasBasis: 'CO2' | 'CO2e'`.

### 2. Location-Based vs. Market-Based Scope 2 Accounting
Under the *GHG Protocol Scope 2 Guidance*, companies with grid-connected operations must report Scope 2 using the **Location-based method** (reflecting average grid intensity) and, where available, the **Market-based method** (reflecting contractual instruments like Renewable Energy Certificates or Power Purchase Agreements).
- For India, the CEA All-India Weighted Average represents the standard Location-based factor.
- Operating Margin (OM) and Build Margin (BM) are intended for Clean Development Mechanism (CDM) additionality baseline calculations, **not** for corporate inventory reporting. Using OM would artificially inflate corporate Scope 2 footprints by excluding low-cost hydro, nuclear, and renewables.

### 3. Geographical Prioritization
- **Priority 1**: Country-specific official factor (e.g. CEA for India electricity, MoEFCC/India GHG Program for India diesel/petrol).
- **Priority 2**: International standardized factors (UK DESNZ, US EPA) only for activities where Indian national benchmarks are not formally codified (e.g., specific freight tonne-km metrics, recycling recovery). In all such cases, the `countryCode` (`GB` or `US`) and explicit limitations are preserved.

### 4. Unit Consistency
- A factor expressed per liter of diesel cannot be applied to a liter of petrol.
- Factors must match the exact activity unit: volumetric ($\text{m}^3$), mass ($\text{kg}$, $\text{tonne}$), energy ($\text{kWh}$), distance ($\text{vehicle-km}$), or freight work ($\text{tonne-km}$).

---

## F. Missing-Factor Handling Policy

If an SME uploads an activity record for which no verified emission factor exists:

1. **Strict Prohibition Against Invention**: The system will never invent, extrapolate, or hallucinate an emission factor.
2. **No Silent Geographic Substitution**: An unverified Indian regional factor will never be silently filled using a foreign factor without explicit qualification.
3. **Audit Flagging**: The activity is flagged with status `UNMAPPED_FACTOR` in the calculation layer.
4. **Resolution Pathway**: CarbonIQ alerts the user to:
   - Provide an audited supplier emission factor with proof documentation.
   - Request factor research from the administration queue.
   - Provide the specific calorific or fuel property specification.

---

## G. Limitations of the Initial Dataset

1. **Market-Based Scope 2 Contractual Factors**: The dataset includes national grid location-based factors. Supplier-specific green tariff rates (e.g., Tata Power Green Energy tariff) require bilateral contractual verification.
2. **Regional Indian Grid Variations**: Prior to 2014, Indian regional grids operated separately. Today, the Indian National Grid operates synchronously under "One Nation, One Grid". CEA now publishes an All-India factor. Subnational state DISCOM transmission losses are not yet broken down in this release.
3. **Freight Transport Road Topography**: The HGV freight factor is sourced from UK DESNZ average laden fleet data ($0.09752\text{ kg CO}_2\text{e}/\text{tonne-km}$). Heavy Indian road freight operating on older BS-IV fleets or congested arterial roads may experience higher actual consumption.
4. **Purchased Goods & Services (Scope 3 Category 1)**: Life Cycle Assessment (LCA) factors for industrial raw materials (e.g., virgin aluminum, virgin steel) require specialized Ecoinvent or EXIOBASE input-output databases and are planned for a subsequent release.

---

## H. Seeding & Verification Instructions

### Prerequisites
- Node.js (v18+ or v20+)
- Local MongoDB running on `mongodb://127.0.0.1:27017/carboniq`

### Environment Configuration
Ensure `server/.env` contains:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/carboniq
```

### Running the Seed Script
Execute the seed command from the project root:
```bash
npm run seed:emission-factors --prefix server
```
Or directly inside the `server/` directory:
```bash
cd server
npm run seed:emission-factors
```

### Expected Output
```text
================================================================
CarbonIQ: Emission Factor Database Idempotent Seeder
================================================================

[Seed] Loaded 14 verified factor record(s) from seed JSON.
[MongoDB] Connected successfully to mongodb://127.0.0.1:27017/carboniq
+ Inserted: [SCOPE_2] Grid Electricity Consumption (India National Grid - FY 2023-24) (2024, IN) -> 0.727 kg CO2/kWh
...
================================================================
Seeding Summary Report:
- Inserted new factors:     14
- Updated existing factors: 0
- Unmodified / Skipped:     0
- Rejected invalid:         0
- Total factors in DB:      14
================================================================
```

### Running Automated Tests
To run the automated test suite verifying schema validation, uniqueness constraints, idempotency, and historical versioning:
```bash
npm run test:factors --prefix server
```

---

## I. Future Updates & Maintenance

When new annual datasets are published (e.g., CEA Version 21.0 for FY 2024-25 or UK DESNZ 2025):
1. **Never overwrite historical factors**: Append a new JSON object to `server/src/data/emissionFactors.seed.json` with the new `reportingYear`, `factorValue`, and `sourceReference`.
2. **Execute Seeder**: Run `npm run seed:emission-factors --prefix server`. The script will detect the existing factors, leave them unchanged (`Skipped`), and cleanly insert the new version.
3. **Run Regression Tests**: Execute `npm run test:factors --prefix server` to confirm the new factor version coexists with historical versions.

---

## J. References & Official URLs

1. **Central Electricity Authority of India (CEA)**:
   - Official Portal: [https://cea.nic.in/cdm-co2-baseline-database/?lang=en](https://cea.nic.in/cdm-co2-baseline-database/?lang=en)
   - User Guide Version 20.0: [https://cea.nic.in/wp-content/uploads/cdm/2024/12/User_Guide_Ver_20.pdf](https://cea.nic.in/wp-content/uploads/cdm/2024/12/User_Guide_Ver_20.pdf)
   - User Guide Version 19.0: [https://cea.nic.in/wp-content/uploads/cdm/2023/12/User_Guide_Ver_19.pdf](https://cea.nic.in/wp-content/uploads/cdm/2023/12/User_Guide_Ver_19.pdf)
2. **India GHG Program / MoEFCC**:
   - Technical Guidance on Fuel Emission Factors: [https://indiaghgp.org/guidance](https://indiaghgp.org/guidance)
   - India GHG Program Technical Publication: [https://www.wri.org/research/india-greenhouse-gas-program](https://www.wri.org/research/india-greenhouse-gas-program)
3. **UK Department for Energy Security and Net Zero (DESNZ)**:
   - Greenhouse Gas Reporting: Conversion Factors 2024: [https://www.gov.uk/government/collections/government-conversion-factors-for-company-reporting](https://www.gov.uk/government/collections/government-conversion-factors-for-company-reporting)
   - 2024 Methodology Paper: [https://assets.publishing.service.gov.uk/media/666c5d1e44a4aa89e9f65675/2024-ghg-conversion-factors-methodology-paper.pdf](https://assets.publishing.service.gov.uk/media/666c5d1e44a4aa89e9f65675/2024-ghg-conversion-factors-methodology-paper.pdf)
4. **US Environmental Protection Agency (EPA)**:
   - GHG Emission Factors Hub: [https://www.epa.gov/climateleadership/ghg-emission-factors-hub](https://www.epa.gov/climateleadership/ghg-emission-factors-hub)
   - Scope 1 and Scope 2 Inventory Guidance: [https://www.epa.gov/climateleadership/scope-1-and-scope-2-inventory-guidance](https://www.epa.gov/climateleadership/scope-1-and-scope-2-inventory-guidance)
5. **GHG Protocol Standards**:
   - Corporate Standard: [https://ghgprotocol.org/corporate-standard](https://ghgprotocol.org/corporate-standard)
   - Scope 2 Guidance: [https://ghgprotocol.org/scope-2-guidance](https://ghgprotocol.org/scope-2-guidance)
   - Scope 3 Calculation Guidance: [https://ghgprotocol.org/scope-3-calculation-guidance](https://ghgprotocol.org/scope-3-calculation-guidance)

---

## K. Scalable Paginated API & Frontend Interface

### 1. Paginated Factors Endpoint: `GET /api/emission-factors`
Retrieves factors efficiently using server-side MongoDB `.skip()` and `.limit()` queries.

#### Query Parameters:
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `page` | Integer | `1` | 1-based page number. Handled gracefully if beyond last page. |
| `limit` | Integer | `12` | Items per page (clamped between 1 and 100). |
| `search` | String | `""` | Safe case-insensitive regex across `activityName`, `activityKey`, `aliases`, `description`, and `sourceOrganization`. |
| `category` | String | `ALL` | Filter by `ELECTRICITY`, `FUEL`, `TRANSPORTATION`, `WASTE`, etc. |
| `scope` | String | `ALL` | Filter by `SCOPE_1`, `SCOPE_2`, or `SCOPE_3`. |
| `countryCode`| String | `ALL` | Filter by country code (e.g. `IN`, `GB`, `US`). |
| `reportingYear`| Integer | `ALL` | Filter by specific reporting year (e.g. `2024`, `2023`). |
| `sourceOrganization`| String | `ALL` | Filter by publishing authority. |
| `status` / `isActive` | String | `true` | Filter by status (`true` = active, `false` = inactive, `all` = all). |
| `sortBy` | String | `category`| Sort field (`category`, `name`, `year`, `factor`, `scope`, `organization`, `country`, `createdAt`). |
| `sortOrder` | String | `asc` / `desc` | Direction (`asc` or `desc`). Defaults to `desc` for `year`. |

#### Response Format:
```json
{
  "success": true,
  "count": 12,
  "pagination": {
    "totalRecords": 14,
    "currentPage": 1,
    "pageSize": 12,
    "totalPages": 2,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "factors": [ ... ]
}
```

### 2. Summary Endpoint: `GET /api/emission-factors/summary`
Executes an aggregate pipeline over the entire collection to calculate dataset-wide KPIs and distinct options for dynamic filter menus:
- Collection-wide totals: `totalCount`, `activeCount`, `indiaCount`, `scope1Count`, `scope2Count`, `scope3Count`
- Temporal bounds: `minYear`, `maxYear`
- Distinct filter arrays: `categories`, `countries`, `organizations`, `years` (sorted)

### 3. Frontend Architecture (`/emission-factor-dataset`)
Located in [`client/src/components/EmissionFactorDataset.jsx`](file:///d:/Pythee/Web/Hackathons/carboniq-/client/src/components/EmissionFactorDataset.jsx):
- **Server-Side Pagination**: Full page navigation (First, Prev, Page Numbers, Next, Last) and customizable page size (12, 24, 48 records).
- **Record Counter**: Live indication ("Showing 1–12 of 14 matching factors").
- **Automatic Reset**: Switching filters or typing a search query resets the view back to Page 1.
- **Race Condition Prevention**: Employs an incrementing `activeRequestIdRef` so asynchronous network responses from fast typing never overwrite newer search results.
- **Dual View Layout**:
  - *Rich Card Grid*: Detailed badges, source citations, formula metrics, and methodology modals.
  - *High-Density Table View*: Compact row-by-row layout for scanning large datasets efficiently.
