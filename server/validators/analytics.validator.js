const { query } = require('express-validator');

const RANGES = ['daily', 'weekly', 'monthly', 'yearly', 'all'];

const rangeRules = [
  query('range').optional().isIn(RANGES).withMessage(`range must be one of: ${RANGES.join(', ')}`),
  // S6: sales KPIs can be sourced from the sales collection.
  query('source').optional().isIn(['appointments', 'sales']).withMessage('source must be appointments or sales'),
];

const KINDS = ['appointments', 'sales', 'inventory'];

const reportRules = [
  ...rangeRules,
  query('format').optional().isIn(['json', 'csv']).withMessage('format must be json or csv'),
  query('kind').optional().isIn(KINDS).withMessage(`kind must be one of: ${KINDS.join(', ')}`),
];

module.exports = { rangeRules, reportRules };
