const express = require('express');

const auth = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const validate = require('../middleware/validate');
const ctrl = require('../controllers/admin.controller');
const {
  adminCreateUserRules,
  adminUpdateUserRules,
  discountRules,
} = require('../validators/user.validator');

const router = express.Router();

// Every admin route requires an authenticated admin.
router.use(auth, requireRole('admin'));

router.get('/dashboard', ctrl.dashboard);

router.get('/users', ctrl.listUsers);
router.post('/users', adminCreateUserRules, validate, ctrl.createUser);
router.put('/users/:id', adminUpdateUserRules, validate, ctrl.updateUser);
router.delete('/users/:id', ctrl.deleteUser);

router.patch('/appointments/:id/discount', discountRules, validate, ctrl.setDiscount);

router.get('/history/staff', ctrl.historyStaff);
router.get('/history/users', ctrl.historyUsers);

module.exports = router;
