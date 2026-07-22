const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/response');
const analytics = require('../services/analytics.service');
const { toCSV } = require('../utils/csv');

const getSummary = asyncHandler(async (req, res) => {
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
  const report = await analytics.report(range);

  if (format === 'csv') {
    const csv = toCSV(report.rows, analytics.REPORT_COLUMNS);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="azcuts-report-${range}.csv"`);
    return res.status(200).send(csv);
  }

  return ok(res, report);
});

module.exports = { getSummary, getSales, getReport };
