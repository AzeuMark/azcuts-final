const express = require('express');

const auth = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const validate = require('../middleware/validate');
const ctrl = require('../controllers/settings.controller');
const {
  updateSettingsRules,
  addNicknameRules,
  updateNicknameRules,
  removeNicknameRules,
} = require('../validators/settings.validator');

const router = express.Router();

// Public landing data (must be declared before the admin-guarded routes).
router.get('/public', ctrl.getPublic);

// Everything below is admin-only.
router.use(auth, requireRole('admin'));

router.get('/', ctrl.getSettings);
router.put('/', updateSettingsRules, validate, ctrl.updateSettings);

router.post('/nicknames', addNicknameRules, validate, ctrl.addNickname);
router.put('/nicknames', updateNicknameRules, validate, ctrl.updateNickname);
router.delete('/nicknames', removeNicknameRules, validate, ctrl.removeNickname);

module.exports = router;
