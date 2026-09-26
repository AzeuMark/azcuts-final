import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import settingsApi from '../api/settings.api';
import { setTimezone } from '../utils/datetime';
import {
  DEFAULT_STATUS_COLORS,
  DEFAULT_ROLE_COLORS,
  resolveColorMap,
} from '../utils/constants';

// Public landing/shop data: shopInfo, timezone, currency, systemMode, storeHours, services.
export function useSettingsPublic() {
  const query = useQuery({
    queryKey: ['settings', 'public'],
    queryFn: () => settingsApi.getPublic().then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  // Keep the app's display timezone in sync with the shop's setting.
  useEffect(() => {
    if (query.data?.timezone) setTimezone(query.data.timezone);
  }, [query.data?.timezone]);

  return query;
}

// Editable branding pill colors (configuration.json -> colors). Missing or
// invalid hex values fall back to the shipped defaults, so the UI never
// renders a broken pill.
export function useBranding() {
  const { data } = useSettingsPublic();
  const colors = data?.colors || {};
  return {
    statuses: resolveColorMap(colors.statuses, DEFAULT_STATUS_COLORS),
    roles: resolveColorMap(colors.roles, DEFAULT_ROLE_COLORS),
  };
}

export default useSettingsPublic;
