const express = require('express');

const auth = require('../middleware/auth');
const systemMode = require('../middleware/systemMode');
const requireRole = require('../middleware/roles');
const requireFeature = require('../middleware/requireFeature');
const validate = require('../middleware/validate');
const ctrl = require('../controllers/stock.controller');
const V = require('../validators/stock.validator');

const router = express.Router();

// NOTE: this router is mounted at '/' (see routes/index.js), so guards must
// be per-route — a bare router.use(auth/role) here would intercept every API
// path mounted after it (/appointments, /settings/public, /chatbot, ...).
// All stock endpoints need an authenticated staff/admin account (+ mode gate).
const gate = [auth, systemMode, requireRole('staff', 'admin')];

router.get(
  '/inventory/levels',
  ...gate,
  requireFeature('inventoryManagement.monitorStockLevels'),
  V.levelsRules,
  validate,
  ctrl.levels
);
router.get(
  '/inventory/movements',
  ...gate,
  requireFeature('inventoryManagement.monitorStockLevels'),
  V.movementsRules,
  validate,
  ctrl.movements
);
router.patch(
  '/inventory/update',
  ...gate,
  requireFeature('inventoryManagement.enabled'),
  V.updateStockRules,
  validate,
  ctrl.update
);

module.exports = router;
