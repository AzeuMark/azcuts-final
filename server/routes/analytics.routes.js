const express = require('express');

const auth = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const validate = require('../middleware/validate');
const ctrl = require('../controllers/analytics.controller');
const { rangeRules, reportRules } = require('../validators/analytics.validator');

const router = express.Router();

// Analytics are admin-only.
router.use(auth, requireRole('admin'));

router.get('/summary', rangeRules, validate, ctrl.getSummary);
router.get('/sales', rangeRules, validate, ctrl.getSales);
router.get('/report', reportRules, validate, ctrl.getReport);

module.exports = router;
