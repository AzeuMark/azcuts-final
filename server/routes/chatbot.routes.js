const express = require('express');

const optionalAuth = require('../middleware/optionalAuth');
const requireFeature = require('../middleware/requireFeature');
const validate = require('../middleware/validate');
const ctrl = require('../controllers/chatbot.controller');
const { chatRules } = require('../validators/chatbot.validator');

const router = express.Router();

// S0: Azeu AI is not in the school paper — disabled in school mode (503).
router.post(
  '/message',
  requireFeature('aiChatbot.enabled', 503),
  optionalAuth,
  chatRules,
  validate,
  ctrl.message
);

module.exports = router;
