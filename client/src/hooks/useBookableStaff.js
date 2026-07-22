import { useQuery } from '@tanstack/react-query';
import appointmentApi from '../api/appointment.api';

// Active staff roster for the StaffPicker.
export function useBookableStaff() {
  return useQuery({
    queryKey: ['bookable-staff'],
    queryFn: () => appointmentApi.bookableStaff().then((r) => r.data?.staff ?? []),
    staleTime: 60_000,
  });
}

export default useBookableStaff;
