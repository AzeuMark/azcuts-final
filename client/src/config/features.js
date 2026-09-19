// Client-side feature flags (Phase S0 — school compliance).
// Single source of truth is the ROOT configuration.json, served by the API
// via GET /settings/public -> { features, schoolComplianceMode }.
// This module holds the fallback (legacy-full) + lookup helpers so the UI
// never crashes before the flags arrive.

export const FALLBACK_FEATURES = {};

// Unknown paths default to enabled (non-breaking for future flags).
export function getByPath(obj, dotPath) {
  return dotPath
    .split('.')
    .reduce(
      (acc, key) =>
        acc && typeof acc === 'object' && key in acc ? acc[key] : undefined,
      obj
    );
}

export function isEnabledIn(features, dotPath) {
  const val = getByPath(features || {}, dotPath);
  if (val === undefined) return true;
  return val === true;
}

export default { FALLBACK_FEATURES, getByPath, isEnabledIn };
