const express = require('express');

const router = express.Router();

/**
 * Health check (Phase 0). Confirms the API process is up and responding.
 * GET /api/health -> 200
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'AzCuts API is healthy',
    data: {
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
});

// Feature routers mount here as each phase lands:
router.use('/auth', require('./auth.routes')); // Phase 1
router.use('/users', require('./user.routes')); // Phase 6 — self profile
router.use('/', require('./inventory.routes')); // Phase 2 — /services + /extras
router.use('/appointments', require('./appointment.routes')); // Phase 3-4
router.use('/staff', require('./staff.routes')); // Phase 4
router.use('/admin', require('./admin.routes')); // Phase 6
router.use('/analytics', require('./analytics.routes')); // Phase 7
router.use('/settings', require('./settings.routes')); // Phase 8
// router.use('/admin', require('./admin.routes'));          // Phase 6
// router.use('/analytics', require('./analytics.routes'));  // Phase 7
// router.use('/settings', require('./settings.routes'));    // Phase 8

module.exports = router;
