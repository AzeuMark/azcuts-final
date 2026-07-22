import { useQuery } from '@tanstack/react-query';
import staffApi from '../api/staff.api';

export function useStaffAppointments(scope = 'incoming') {
  return useQuery({
    queryKey: ['staff', 'appointments', scope],
    queryFn: () => staffApi.appointments(scope).then((r) => r.data?.appointments || []),
    staleTime: 10_000,
  });
}

export function useStaffHistory() {
  return useQuery({
    queryKey: ['staff', 'history'],
    queryFn: () => staffApi.history().then((r) => r.data),
    staleTime: 15_000,
  });
}
