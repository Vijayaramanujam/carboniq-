/**
 * Carbon-aware document classification
 * Uses deterministic rules, keyword signatures, and structural indicators.
 */
export function classifyDocument(text = '', fileName = '') {
  const normalized = (text + ' ' + fileName).toLowerCase();

  // 1. Irrelevant Signals (Salary / Payroll / Personal)
  const payrollKeywords = [
    'payslip',
    'pay slip',
    'salary slip',
    'payroll',
    'net pay',
    'gross pay',
    'employee salary',
    'provident fund',
    'epf',
    'income tax deduction',
    'basic salary',
    'curriculum vitae',
    'resume',
    'birth certificate',
    'driver license',
    'passport',
  ];

  const matchedPayroll = payrollKeywords.filter((kw) => normalized.includes(kw));
  if (matchedPayroll.length >= 2 || normalized.includes('payslip') || normalized.includes('salary slip')) {
    return {
      carbonRelevance: 'IRRELEVANT',
      documentType: 'PAYROLL_SALARY',
      classificationReason: `Identified as payroll or personal document based on keywords: [${matchedPayroll.join(', ')}]. Does not contain operational carbon-accounting data.`,
    };
  }

  // 2. Specific Carbon Activity Categories
  // Electricity / Utility
  const electricityKeywords = [
    'electricity',
    'electric utility',
    'power consumption',
    'kwh',
    'mwh',
    'kilowatt',
    'meter reading',
    'meter number',
    'grid electricity',
    'substation',
  ];
  const matchedElectricity = electricityKeywords.filter((kw) => normalized.includes(kw));

  // Fuel / Combustion
  const fuelKeywords = [
    'diesel',
    'petrol',
    'gasoline',
    'natural gas',
    'lpg',
    'cng',
    'fuel receipt',
    'liters',
    'litres',
    'gallons',
    'fuel dispenser',
    'fuel pump',
  ];
  const matchedFuel = fuelKeywords.filter((kw) => normalized.includes(kw));

  // Transportation / Logistics / Freight
  const transportKeywords = [
    'freight',
    'bill of lading',
    'logistics',
    'shipment',
    'cargo',
    'consignment',
    'trucking',
    'distance travelled',
    'mileage',
    'tonne-km',
    'ton-mile',
    'courier',
    'vehicle fleet',
  ];
  const matchedTransport = transportKeywords.filter((kw) => normalized.includes(kw));

  // Waste / Disposal
  const wasteKeywords = [
    'waste',
    'garbage',
    'scrap',
    'recycling',
    'landfill',
    'hazardous waste',
    'effluent',
    'disposal certificate',
    'waste manifest',
    'compost',
  ];
  const matchedWaste = wasteKeywords.filter((kw) => normalized.includes(kw));

  // Energy / Carbon Audit Sheets
  const auditKeywords = [
    'energy audit',
    'carbon audit',
    'ghg inventory',
    'emission audit',
    'scope 1',
    'scope 2',
    'environmental audit',
    'audit sheet',
  ];
  const matchedAudit = auditKeywords.filter((kw) => normalized.includes(kw));

  // Supplier Invoices / Operational Bills
  const invoiceKeywords = [
    'tax invoice',
    'commercial invoice',
    'supplier invoice',
    'vendor invoice',
    'bill to:',
    'invoice number',
    'invoice date',
    'purchase order',
    'subtotal',
  ];
  const matchedInvoice = invoiceKeywords.filter((kw) => normalized.includes(kw));

  // Relevance determination
  if (matchedAudit.length > 0) {
    return {
      carbonRelevance: 'RELEVANT',
      documentType: 'AUDIT_SHEET',
      classificationReason: `Identified as an energy/environmental audit record (matches: ${matchedAudit.join(', ')}).`,
    };
  }

  if (matchedElectricity.length >= 2 || (matchedElectricity.length >= 1 && (normalized.includes('kwh') || normalized.includes('bill')))) {
    return {
      carbonRelevance: 'RELEVANT',
      documentType: 'ELECTRICITY_BILL',
      classificationReason: `Identified as an electricity utility record (matches: ${matchedElectricity.join(', ')}).`,
    };
  }

  if (matchedFuel.length >= 2 || (matchedFuel.length >= 1 && (normalized.includes('fuel') || normalized.includes('station')))) {
    return {
      carbonRelevance: 'RELEVANT',
      documentType: 'FUEL_RECEIPT',
      classificationReason: `Identified as a fuel or stationary/mobile combustion receipt (matches: ${matchedFuel.join(', ')}).`,
    };
  }

  if (matchedTransport.length >= 2 || (matchedTransport.length >= 1 && normalized.includes('shipment'))) {
    return {
      carbonRelevance: 'RELEVANT',
      documentType: 'TRANSPORT_RECORD',
      classificationReason: `Identified as a transportation or freight logistics document (matches: ${matchedTransport.join(', ')}).`,
    };
  }

  if (matchedWaste.length >= 1 && (normalized.includes('disposal') || normalized.includes('manifest') || normalized.includes('tons') || normalized.includes('kg'))) {
    return {
      carbonRelevance: 'RELEVANT',
      documentType: 'WASTE_RECORD',
      classificationReason: `Identified as a waste management/disposal record (matches: ${matchedWaste.join(', ')}).`,
    };
  }

  if (matchedInvoice.length >= 2) {
    return {
      carbonRelevance: 'RELEVANT',
      documentType: 'SUPPLIER_INVOICE',
      classificationReason: `Identified as a supplier or commercial invoice containing operational spend/activity (matches: ${matchedInvoice.join(', ')}).`,
    };
  }

  // If text is very short or unreadable
  if (text.trim().length < 30) {
    return {
      carbonRelevance: 'UNCERTAIN',
      documentType: 'UNKNOWN',
      classificationReason: 'Text content is too sparse or unreadable to establish carbon accounting relevance confidently.',
    };
  }

  // Fallback for general documents with some keywords
  const totalRelevanceHits = [
    ...matchedElectricity,
    ...matchedFuel,
    ...matchedTransport,
    ...matchedWaste,
    ...matchedAudit,
    ...matchedInvoice,
  ];

  if (totalRelevanceHits.length > 0) {
    return {
      carbonRelevance: 'RELEVANT',
      documentType: 'SUPPLIER_INVOICE',
      classificationReason: `Document contains potential carbon operational indicators: [${totalRelevanceHits.join(', ')}].`,
    };
  }

  return {
    carbonRelevance: 'UNCERTAIN',
    documentType: 'UNKNOWN',
    classificationReason: 'Document does not contain standard carbon-accounting indicators or known irrelevant signatures. Manual verification required.',
  };
}
