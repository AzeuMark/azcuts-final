import useFeatures from '../hooks/useFeatures';

// Hide children when a configuration.json flag is off (Phase S0).
// Usage: <FeatureGate feature="ratings.enabled" fallback={null}>...</FeatureGate>
// S0 is intentionally non-breaking: while flags load, children render.
export default function FeatureGate({ feature, fallback = null, children }) {
  const { isEnabled, isLoading } = useFeatures();
  if (isLoading) return children;
  if (!isEnabled(feature)) return fallback;
  return children;
}
