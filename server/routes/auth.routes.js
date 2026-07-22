const express = require('express');

const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const ctrl = require('../controllers/auth.controller');
const { registerRules, loginRules } = require('../validators/auth.validator');

const router = express.Router();

router.post('/register', registerRules, validate, ctrl.register);
router.post('/login', loginRules, validate, ctrl.login);
// refresh/logout are cookie-based (no access token required) so they still work
// after the short-lived access token has expired.
router.post('/refresh', ctrl.refresh);
router.post('/logout', ctrl.logout);
router.get('/me', auth, ctrl.me);

module.exports = router;
