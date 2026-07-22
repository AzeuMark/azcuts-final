const express = require('express');

const auth = require('../middleware/auth');
const systemMode = require('../middleware/systemMode');
const validate = require('../middleware/validate');
const upload = require('../middleware/upload');
const ctrl = require('../controllers/user.controller');
const {
  updateProfileRules,
  changePasswordRules,
  setThemeRules,
} = require('../validators/user.validator');

const router = express.Router();

// All self-profile routes require authentication (any role) + mode gate.
router.use(auth, systemMode);

router.get('/profile', ctrl.getProfile);
router.put('/profile', updateProfileRules, validate, ctrl.updateProfile);
router.put('/password', changePasswordRules, validate, ctrl.changePassword);
router.put('/theme', setThemeRules, validate, ctrl.setTheme);
router.post('/avatar', upload.single('file'), ctrl.uploadAvatar);

module.exports = router;
