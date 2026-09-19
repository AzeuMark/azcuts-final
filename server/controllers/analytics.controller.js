const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/response');
const analytics = require('../services/analytics.service');
const { toCSV } = require('../utils/csv');

const getSummary = asyncHandler(async (req, res) => {
  // S6: ?source=sales aggregates the sales collection; default is appointments.
  if (req.query.source === 'sales') {
    const data = await analytics.salesSummary(req.query.range || 'all');
    return ok(res, data);
  }
  const data = await analytics.summary(req.query.range || 'all');
  return ok(res, data);
});

const getSales = asyncHandler(async (req, res) => {
  const data = await analytics.salesSeries(req.query.range || 'all');
  return ok(res, data);
});

const getReport = asyncHandler(async (req, res) => {
  const range = req.query.range || 'all';
  const format = req.query.format || 'json';
  const kind = req.query.kind || 'appointments';
  const report = await analytics.reportByKind(range, kind);

  if (format === 'csv') {
    // Inventory CSV exports the stock levels table (movements stay JSON-only).
    const rows = kind === 'inventory' ? report.levels : report.rows;
    const columns =
      kind === 'sales'
        ? analytics.SALES_REPORT_COLUMNS
        : kind === 'inventory'
          ? analytics.INVENTORY_REPORT_COLUMNS
          : analytics.REPORT_COLUMNS;
    const csv = toCSV(rows, columns);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="azcuts-${kind}-report-${range}.csv"`);
    return res.status(200).send(csv);
  }

  return ok(res, report);
});

module.exports = { getSummary, getSales, getReport };
