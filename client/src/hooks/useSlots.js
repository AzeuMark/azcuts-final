import { useQuery } from '@tanstack/react-query';
import appointmentApi from '../api/appointment.api';

// Available slots for a service + date, factoring in the chosen extras (and an
// optional specific staff). Only runs once a service and date are chosen.
export function useSlots({ serviceId, date, extras = [], staffId = null } = {}) {
  return useQuery({
    queryKey: ['slots', serviceId, date, [...extras].sort(), staffId || null],
    queryFn: () => appointmentApi.slots({ serviceId, date, extras, staffId }).then((r) => r.data),
    enabled: Boolean(serviceId && date),
    staleTime: 20_000,
  });
}

export default useSlots;
