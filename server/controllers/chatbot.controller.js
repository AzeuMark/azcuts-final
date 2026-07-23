const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/response');
const chatbotService = require('../services/chatbot.service');

/**
 * POST /api/chatbot/message
 *
 * "Azeu AI" replies to a customer/staff/admin question about using AzCuts.
 *
 * The role is decided SERVER-SIDE, never trusted from the body:
 *  - an authenticated caller (optionalAuth attached req.user) → their real role
 *  - an anonymous landing-page visitor → the customer ("user") guide
 * This keeps the staff/admin guides out of reach of guests.
 */
const message = asyncHandler(async (req, res) => {
  const role = chatbotService.VALID_ROLES.includes(req.user?.role) ? req.user.role : 'user';
  const { messages } = req.body;

  const reply = await chatbotService.chat({ role, messages });

  return ok(res, { reply, role }, 'Azeu AI replied');
});

module.exports = { message };
