import { keepPreviousData, useQuery } from '@tanstack/react-query';
import appointmentApi from '../api/appointment.api';

// Customer booking history (paginated). Returns { appointments, pagination }.
export function useMyAppointments({ status, page = 1 } = {}) {
  return useQuery({
    queryKey: ['appointments', 'mine', { status: status || null, page }],
    queryFn: () => appointmentApi.mine({ status, page }).then((r) => r.data),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

export default useMyAppointments;
