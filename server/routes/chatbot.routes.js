const express = require('express');

const optionalAuth = require('../middleware/optionalAuth');
const validate = require('../middleware/validate');
const ctrl = require('../controllers/chatbot.controller');
const { chatRules } = require('../validators/chatbot.validator');

const router = express.Router();

// Public endpoint: works for landing-page guests too. optionalAuth attaches
// req.user when a valid token is present so the controller can pick the right
// role-specific guide (guests fall back to the customer guide).
router.post('/message', optionalAuth, chatRules, validate, ctrl.message);

module.exports = router;
