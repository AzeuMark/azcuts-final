import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import settingsApi from '../api/settings.api';
import { isEnabledIn } from '../config/features';

// Fetch the single flag source (GET /settings/public -> features).
// Falls back to enabled-everything while loading so S0 is non-breaking:
// actual hiding of extras lands in S9 via <FeatureGate>.
export function useFeatures() {
  const query = useQuery({
    queryKey: ['settings', 'features'],
    queryFn: () =>
      settingsApi
        .getPublic()
        .then((r) => r.data?.features || {})
        .catch(() => ({})),
    staleTime: 5 * 60_000,
  });

  const api = useMemo(
    () => ({
      features: query.data || {},
      isLoading: query.isLoading,
      isEnabled: (dotPath) => isEnabledIn(query.data || {}, dotPath),
    }),
    [query.data, query.isLoading]
  );

  return api;
}

export default useFeatures;
