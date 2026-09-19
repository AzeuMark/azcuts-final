const express = require('express');

const auth = require('../middleware/auth');
const systemMode = require('../middleware/systemMode');
const requireRole = require('../middleware/roles');
const requireFeature = require('../middleware/requireFeature');
const validate = require('../middleware/validate');
const ctrl = require('../controllers/sales.controller');
const V = require('../validators/sale.validator');

const router = express.Router();

// All sales routes need an authenticated staff/admin account (+ mode gate).
// NOTE: /mine must be declared before any future /:id route.
router.post(
  '/sales',
  auth,
  systemMode,
  requireRole('staff', 'admin'),
  requireFeature('salesManagement.enabled'),
  V.recordSaleRules,
  validate,
  ctrl.record
);
router.get(
  '/sales/mine',
  auth,
  systemMode,
  requireRole('staff'),
  requireFeature('salesManagement.viewSalesRecordsBarber'),
  V.listSalesRules,
  validate,
  ctrl.mine
);
router.get(
  '/sales',
  auth,
  systemMode,
  requireRole('admin'),
  requireFeature('salesManagement.reviewSalesAdmin'),
  V.listSalesRules,
  validate,
  ctrl.list
);

module.exports = router;
