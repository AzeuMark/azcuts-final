import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useSocketEvent } from '../hooks/useSocketEvent';
import { useAuth } from '../hooks/useAuth';
import { STATUS_META } from '../utils/constants';

/*
 * Bridges Socket.io events to React Query + toasts so every portal updates live
 * without a refresh. Events are already room-scoped server-side (user/staff/admin),
 * so a socket only receives what's relevant to its role. Renders nothing.
 */
export default function RealtimeBridge() {
  const qc = useQueryClient();
  const { role } = useAuth();

  const invalidateAppointments = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['appointments', 'mine'] });
    qc.invalidateQueries({ queryKey: ['staff', 'appointments'] });
    qc.invalidateQueries({ queryKey: ['staff', 'history'] });
    qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    qc.invalidateQueries({ queryKey: ['admin', 'history'] });
  }, [qc]);

  useSocketEvent(
    'appointment:new',
    useCallback(() => {
      invalidateAppointments();
      if (role === 'staff' || role === 'admin') toast('New appointment booked', { icon: '📅' });
    }, [invalidateAppointments, role])
  );

  useSocketEvent(
    'appointment:assigned',
    useCallback(() => {
      qc.invalidateQueries({ queryKey: ['staff', 'appointments'] });
      if (role === 'staff') toast('An appointment was routed to you', { icon: '✂️' });
    }, [qc, role])
  );

  useSocketEvent(
    'appointment:updated',
    useCallback(
      (payload) => {
        invalidateAppointments();
        if (role === 'user' && payload?.status) {
          const label = STATUS_META[payload.status]?.label || payload.status;
          toast(`Your appointment is now ${label.toLowerCase()}`);
        }
      },
      [invalidateAppointments, role]
    )
  );

  useSocketEvent(
    'dashboard:refresh',
    useCallback(() => {
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    }, [qc])
  );

  useSocketEvent(
    'rating:added',
    useCallback(() => {
      qc.invalidateQueries({ queryKey: ['staff', 'history'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
      if (role === 'staff') toast('You received a new rating', { icon: '⭐' });
    }, [qc, role])
  );

  return null;
}
