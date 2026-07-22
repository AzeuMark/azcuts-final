const express = require('express');

const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const requireRole = require('../middleware/roles');
const validate = require('../middleware/validate');
const upload = require('../middleware/upload');
const ctrl = require('../controllers/inventory.controller');
const V = require('../validators/inventory.validator');

const router = express.Router();

// ---- Services (GET is public + landing-facing; writes are admin-only) ----
router.get('/services', optionalAuth, ctrl.listServices);
router.get('/services/:id', optionalAuth, ctrl.getService);
router.post(
  '/services',
  auth,
  requireRole('admin'),
  upload.single('image'),
  V.createServiceRules,
  validate,
  ctrl.createService
);
router.put(
  '/services/:id',
  auth,
  requireRole('admin'),
  upload.single('image'),
  V.updateServiceRules,
  validate,
  ctrl.updateService
);
router.delete('/services/:id', auth, requireRole('admin'), ctrl.deleteService);

// ---- Extras ----
router.get('/extras', optionalAuth, ctrl.listExtras);
router.get('/extras/:id', optionalAuth, ctrl.getExtra);
router.post('/extras', auth, requireRole('admin'), V.createExtraRules, validate, ctrl.createExtra);
router.put('/extras/:id', auth, requireRole('admin'), V.updateExtraRules, validate, ctrl.updateExtra);
router.delete('/extras/:id', auth, requireRole('admin'), ctrl.deleteExtra);

module.exports = router;
