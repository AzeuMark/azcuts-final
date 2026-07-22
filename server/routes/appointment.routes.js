const express = require('express');

const auth = require('../middleware/auth');
const systemMode = require('../middleware/systemMode');
const requireRole = require('../middleware/roles');
const validate = require('../middleware/validate');
const ctrl = require('../controllers/appointment.controller');
const {
  slotsRules,
  createBookingRules,
  statusChangeRules,
  cancelRules,
  rateRules,
} = require('../validators/appointment.validator');

const router = express.Router();

// Every appointment route is authenticated and mode-gated.
router.use(auth, systemMode);

// Specific paths must be declared before the catch-all "/:id".
router.get('/staff', requireRole('user', 'admin'), ctrl.bookableStaff);
router.get('/slots', requireRole('user', 'admin'), slotsRules, validate, ctrl.availableSlots);
router.get('/mine', requireRole('user'), ctrl.listMine);
router.post('/', requireRole('user'), createBookingRules, validate, ctrl.createBooking);

// Readable by the owner, the assigned staff, or an admin (checked in controller).
router.get('/:id', ctrl.getOne);
router.get('/:id/receipt', ctrl.getReceipt);

// Advance the state machine (assigned staff or admin; enforced in the service).
router.patch('/:id/status', requireRole('staff', 'admin'), statusChangeRules, validate, ctrl.changeStatus);

// Cancel (owner, assigned staff, or admin; enforced in the service).
router.patch('/:id/cancel', cancelRules, validate, ctrl.cancel);

// Rate / edit rating (owner only, appointment must be done; enforced in the service).
router.post('/:id/rate', requireRole('user'), rateRules, validate, ctrl.rate);

module.exports = router;
