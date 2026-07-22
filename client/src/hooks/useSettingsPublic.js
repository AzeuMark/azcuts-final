import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import settingsApi from '../api/settings.api';
import { setTimezone } from '../utils/datetime';

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

export default useSettingsPublic;
