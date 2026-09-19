// Gate a route behind a configuration.json flag (Phase S0).
// Usage: router.post('/x', requireFeature('salesManagement.recordProductSale'), ...)
// Disabled -> 403 { success:false, message } (pass 503 for chatbot-style bans).

const ApiError = require('../utils/ApiError');
const features = require('../config/features');

function requireFeature(dotPath, statusCode = 403) {
  return (req, res, next) => {
    if (features.isEnabled(dotPath)) return next();
    return next(
      new ApiError(statusCode, `Feature disabled in school mode (${dotPath})`)
    );
  };
}

module.exports = requireFeature;
