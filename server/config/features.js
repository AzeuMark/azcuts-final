// Feature-flag loader (Phase S0 — school compliance).
// Single source of truth: root configuration.json (DISABLE-only, never delete).
// Falls back to legacy-full (everything enabled) when the file is missing,
// so the app never crashes without the config.

const fs = require('fs');
const path = require('path');

const CONFIG_PATH =
  process.env.FEATURE_FLAGS_PATH ||
  path.resolve(__dirname, '..', '..', 'configuration.json');

// Legacy-full fallback: preserves today's behavior when no config file exists.
const FALLBACK = {
  schoolComplianceMode: false,
  version: 'fallback',
  features: {},
};

let cache = null;

function loadFromDisk() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return FALLBACK;
  }
}

function getConfig() {
  if (!cache) cache = loadFromDisk();
  return cache;
}

// Forced-off paths when schoolComplianceMode is true. Even if someone flips
// an individual flag to true while master is on, these stay off (strict mode).
const SCHOOL_DENYLIST = new Set([
  'userAccountManagement.deleteUsers',
  'userAccountManagement.usernameLogin',
  'userAccountManagement.avatarUpload',
  'userAccountManagement.serverPersistedTheme',
  'appointmentManagement.cancelWithReason',
  'appointmentManagement.oneActiveBookingLimit',
  'appointmentManagement.autoAssignLeastLoaded',
  'appointmentManagement.pendingPool',
  'appointmentManagement.rejectReRoute',
  'extras.enabled',
  'extras.selectExtras',
  'extras.extrasAffectDuration',
  'extras.extrasAffectPricing',
  'pricing.discountPercent',
  'pricing.taxRate',
  'receipts.downloadPng',
  'ratings.enabled',
  'ratings.promptAfterDone',
  'ratings.editRating',
  'ratings.staffAvg',
  'systemMode.enabled',
  'systemMode.maintenancePage',
  'realtime.enabled',
  'realtime.socketIo',
  'realtime.notificationBell',
  'reports.charts',
  'landingCms.statsBand',
  'landingCms.testimonials',
  'aiChatbot.enabled',
  'media.imagePickerAdvanced',
]);

function getByPath(obj, dotPath) {
  return dotPath.split('.').reduce((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) return acc[key];
    return undefined;
  }, obj);
}

function isEnabled(dotPath) {
  const cfg = getConfig();
  if (cfg.schoolComplianceMode && SCHOOL_DENYLIST.has(dotPath)) return false;
  const val = getByPath(cfg.features || {}, dotPath);
  // Unknown paths default to enabled (non-breaking for future flags).
  if (val === undefined) return true;
  return val === true;
}

function schoolMode() {
  return getConfig().schoolComplianceMode === true;
}

function getFeatures() {
  return getConfig().features || {};
}

// Editable pill colors (root configuration.json -> colors). Always served —
// never flag-gated. Missing/invalid keys fall back client-side to defaults.
function getColors() {
  return getConfig().colors || {};
}

// Test/admin escape hatch: reload without restarting the process.
function reloadFeatures() {
  cache = loadFromDisk();
  return getConfig();
}

module.exports = {
  isEnabled,
  schoolMode,
  getFeatures,
  getColors,
  getConfig,
  reloadFeatures,
  CONFIG_PATH,
};
