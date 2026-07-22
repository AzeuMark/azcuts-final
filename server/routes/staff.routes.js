const express = require('express');

const auth = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const validate = require('../middleware/validate');
const ctrl = require('../controllers/staff.controller');
const { rejectRules, shiftRules } = require('../validators/staff.validator');

const router = express.Router();

// All staff routes require an authenticated staff account.
router.use(auth, requireRole('staff'));

router.get('/appointments', ctrl.listAppointments);
router.patch('/appointments/:id/accept', ctrl.accept);
router.patch('/appointments/:id/reject', rejectRules, validate, ctrl.reject);
router.get('/history', ctrl.history);
router.patch('/shift', shiftRules, validate, ctrl.setShift);

module.exports = router;
