const express = require('express');

const auth = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const validate = require('../middleware/validate');
const ctrl = require('../controllers/appointment.controller');
const {
  slotsRules,
  createBookingRules,
  statusChangeRules,
  cancelRules,
} = require('../validators/appointment.validator');

const router = express.Router();

// Specific paths must be declared before the catch-all "/:id".
router.get('/slots', auth, requireRole('user', 'admin'), slotsRules, validate, ctrl.availableSlots);
router.get('/mine', auth, requireRole('user'), ctrl.listMine);
router.post('/', auth, requireRole('user'), createBookingRules, validate, ctrl.createBooking);

// Readable by the owner, the assigned staff, or an admin (checked in controller).
router.get('/:id', auth, ctrl.getOne);
router.get('/:id/receipt', auth, ctrl.getReceipt);

// Advance the state machine (assigned staff or admin; enforced in the service).
router.patch(
  '/:id/status',
  auth,
  requireRole('staff', 'admin'),
  statusChangeRules,
  validate,
  ctrl.changeStatus
);

// Cancel (owner, assigned staff, or admin; enforced in the service).
router.patch('/:id/cancel', auth, cancelRules, validate, ctrl.cancel);

module.exports = router;
