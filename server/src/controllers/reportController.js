import {
  aggregateStatutoryData,
  generateBRSRCoreExcel,
  generateBRSRCorePDF,
  generateCBAMXml,
  generateCBAMCsv,
} from '../services/statutoryExportService.js';

/**
 * Returns JSON summary of statutory KPIs (SEBI BRSR Core & EU CBAM)
 */
export async function getStatutorySummary(req, res) {
  try {
    const companyId = req.company._id;
    const { startDate, endDate, reportingYear } = req.query;

    const data = await aggregateStatutoryData(companyId, {
      startDate,
      endDate,
      reportingYear,
    });

    res.json({
      success: true,
      metadata: data.metadata,
      brsr: data.brsr,
      cbam: data.cbam,
      recordCount: data.ledger.length,
    });
  } catch (error) {
    console.error('Error in getStatutorySummary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Downloads official SEBI BRSR Core Disclosure Report (PDF)
 */
export async function exportBRSRPDF(req, res) {
  try {
    const companyId = req.company._id;
    const { startDate, endDate, reportingYear } = req.query;

    const data = await aggregateStatutoryData(companyId, {
      startDate,
      endDate,
      reportingYear,
    });

    const safeName = (data.metadata.companyName || 'Enterprise').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${safeName}_SEBI_BRSR_Core_Report_${data.metadata.reportingYear || '2024-25'}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    generateBRSRCorePDF(data, res);
  } catch (error) {
    console.error('Error generating SEBI BRSR PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

/**
 * Downloads official SEBI BRSR Core Template (XLSX)
 */
export async function exportBRSRExcel(req, res) {
  try {
    const companyId = req.company._id;
    const { startDate, endDate, reportingYear } = req.query;

    const data = await aggregateStatutoryData(companyId, {
      startDate,
      endDate,
      reportingYear,
    });

    const buffer = generateBRSRCoreExcel(data);
    const safeName = (data.metadata.companyName || 'Enterprise').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${safeName}_SEBI_BRSR_Core_Template_${data.metadata.reportingYear || '2024-25'}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  } catch (error) {
    console.error('Error generating SEBI BRSR Excel:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Downloads EU CBAM Transitional Registry XML
 */
export async function exportCBAMXml(req, res) {
  try {
    const companyId = req.company._id;
    const { startDate, endDate, reportingYear } = req.query;

    const data = await aggregateStatutoryData(companyId, {
      startDate,
      endDate,
      reportingYear,
    });

    const xml = generateCBAMXml(data);
    const safeName = (data.metadata.companyName || 'Enterprise').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${safeName}_EU_CBAM_Transitional_Registry_${data.cbam.reportingPeriod}.xml`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(xml);
  } catch (error) {
    console.error('Error generating EU CBAM XML:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Downloads EU CBAM Importer Communication CSV
 */
export async function exportCBAMCsv(req, res) {
  try {
    const companyId = req.company._id;
    const { startDate, endDate, reportingYear } = req.query;

    const data = await aggregateStatutoryData(companyId, {
      startDate,
      endDate,
      reportingYear,
    });

    const csv = generateCBAMCsv(data);
    const safeName = (data.metadata.companyName || 'Enterprise').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${safeName}_EU_CBAM_Declared_Goods_${data.cbam.reportingPeriod}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(csv);
  } catch (error) {
    console.error('Error generating EU CBAM CSV:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Downloads complete CarbonIQ Activity Audit Ledger (CSV)
 */
export async function exportAuditLedgerCsv(req, res) {
  try {
    const companyId = req.company._id;
    const { startDate, endDate, reportingYear } = req.query;

    const data = await aggregateStatutoryData(companyId, {
      startDate,
      endDate,
      reportingYear,
    });

    const headers = [
      'Record ID', 'Activity Date', 'GHG Scope', 'Category', 'Quantity', 'Unit',
      'Supplier / Vendor', 'Description', 'Emissions (kg CO2e)', 'Emissions (t CO2e)',
      'Factor Used', 'Factor Unit', 'Direct Emissions (kg)', 'Upstream Supply Chain (kg)',
      'Calculation Formula', 'Authoritative Benchmark', 'Methodology'
    ];

    const rows = data.ledger.map(row => [
      `"${row.id}"`,
      `"${row.date ? new Date(row.date).toISOString().split('T')[0] : ''}"`,
      `"${row.scope}"`,
      `"${row.category}"`,
      row.quantity,
      `"${row.unit}"`,
      `"${(row.supplierName || '').replace(/"/g, '""')}"`,
      `"${(row.description || '').replace(/"/g, '""')}"`,
      row.emissionsKg,
      row.emissionsTonnes,
      row.factorUsed,
      `"${row.factorUnit}"`,
      row.directKg,
      row.upstreamKg,
      `"${(row.formula || '').replace(/"/g, '""')}"`,
      `"${(row.source || '').replace(/"/g, '""')}"`,
      `"${(row.methodology || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\ufeff' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const safeName = (data.metadata.companyName || 'Enterprise').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${safeName}_CarbonIQ_Audit_Ledger_${data.metadata.reportingYear || '2024-25'}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Error generating Audit Ledger CSV:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
