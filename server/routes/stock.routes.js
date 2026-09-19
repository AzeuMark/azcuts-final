const express = require('express');

const auth = require('../middleware/auth');
const systemMode = require('../middleware/systemMode');
const requireRole = require('../middleware/roles');
const requireFeature = require('../middleware/requireFeature');
const validate = require('../middleware/validate');
const ctrl = require('../controllers/stock.controller');
const V = require('../validators/stock.validator');

const router = express.Router();

// All stock routes need an authenticated staff/admin account (+ mode gate).
router.use(auth, systemMode, requireRole('staff', 'admin'));

router.get(
  '/inventory/levels',
  requireFeature('inventoryManagement.monitorStockLevels'),
  V.levelsRules,
  validate,
  ctrl.levels
);
router.get(
  '/inventory/movements',
  requireFeature('inventoryManagement.monitorStockLevels'),
  V.movementsRules,
  validate,
  ctrl.movements
);
router.patch(
  '/inventory/update',
  requireFeature('inventoryManagement.enabled'),
  V.updateStockRules,
  validate,
  ctrl.update
);

module.exports = router;
