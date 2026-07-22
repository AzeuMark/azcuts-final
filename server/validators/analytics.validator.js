const { query } = require('express-validator');

const RANGES = ['daily', 'weekly', 'monthly', 'yearly', 'all'];

const rangeRules = [
  query('range').optional().isIn(RANGES).withMessage(`range must be one of: ${RANGES.join(', ')}`),
];

const reportRules = [
  ...rangeRules,
  query('format').optional().isIn(['json', 'csv']).withMessage('format must be json or csv'),
];

module.exports = { rangeRules, reportRules };
