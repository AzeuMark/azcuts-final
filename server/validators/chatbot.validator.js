const { body } = require('express-validator');

// The client sends the running conversation as `messages`. We validate the
// shape here; chatbot.service further sanitizes (role whitelist, trimming,
// length + count caps) before anything reaches the model.
const chatRules = [
  body('messages')
    .isArray({ min: 1, max: 50 })
    .withMessage('messages must be a non-empty array'),
  body('messages.*.role')
    .isIn(['user', 'assistant'])
    .withMessage('Each message role must be "user" or "assistant"'),
  body('messages.*.content')
    .isString()
    .withMessage('Each message needs string content')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Message content cannot be empty')
    .isLength({ max: 2000 })
    .withMessage('Message content is too long (max 2000 characters)'),
];

module.exports = { chatRules };
