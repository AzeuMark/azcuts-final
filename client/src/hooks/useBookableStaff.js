import { useQuery } from '@tanstack/react-query';
import appointmentApi from '../api/appointment.api';

// Active staff roster for the StaffPicker.
// Pass appointmentId to list only barbers free for that booking's block
// (admin Assign modal uses this to prevent double-booking).
export function useBookableStaff(appointmentId = null) {
  return useQuery({
    queryKey: ['bookable-staff', appointmentId || null],
    queryFn: () => appointmentApi.bookableStaff({ appointmentId }).then((r) => r.data?.staff ?? []),
    staleTime: 60_000,
  });
}

export default useBookableStaff;
