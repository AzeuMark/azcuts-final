import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Inbox, ListChecks, Check, X, Play, Flag } from 'lucide-react';

import PageHeader from '../../components/PageHeader';
import AppointmentCard from '../../components/AppointmentCard';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Textarea from '../../components/ui/Textarea';

import { useStaffAppointments } from '../../hooks/useStaff';
import staffApi from '../../api/staff.api';
import appointmentApi from '../../api/appointment.api';
import { getApiErrorMessage } from '../../config/axios';

export default function Dashboard() {
  const qc = useQueryClient();
  const incoming = useStaffAppointments('incoming');
  const mine = useStaffAppointments('mine');

  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['staff', 'appointments'] });
    qc.invalidateQueries({ queryKey: ['staff', 'history'] });
  };

  const acceptMutation = useMutation({
    mutationFn: (id) => staffApi.accept(id),
    onSuccess: () => {
      toast.success('Appointment accepted');
      invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Could not accept')),
  });

  const rejectMutation = useMutation({
    mutationFn: () => staffApi.reject(rejectTarget._id, rejectReason.trim() || undefined),
    onSuccess: (res) => {
      toast.success(res?.message || 'Appointment rejected');
      setRejectTarget(null);
      setRejectReason('');
      invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Could not reject')),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => appointmentApi.setStatus(id, status),
    onSuccess: (_r, vars) => {
      toast.success(vars.status === 'done' ? 'Marked as done' : 'Service started');
      invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Could not update status')),
  });

  const incomingList = incoming.data || [];
  const mineList = mine.data || [];

  return (
    <div>
      <PageHeader
        eyebrow="Today"
        title="Staff Dashboard"
        description="Accept incoming appointments and move your queue through the day."
      />

      <div className="stagger grid gap-6 lg:grid-cols-2">
        {/* Incoming */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Inbox className="h-5 w-5 text-brand" />
            <h2 className="font-serif text-xl font-semibold text-ink">Incoming</h2>
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">
              {incomingList.length}
            </span>
          </div>
          {incoming.isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner className="text-brand" />
            </div>
          ) : incomingList.length === 0 ? (
            <EmptyState icon={Inbox} title="No incoming appointments" description="New bookings routed to you will appear here." />
          ) : (
            <div className="stagger space-y-3">
              {incomingList.map((a) => (
                <AppointmentCard
                  key={a._id}
                  appointment={a}
                  actions={
                    <>
                      <Button
                        size="sm"
                        onClick={() => acceptMutation.mutate(a._id)}
                        loading={acceptMutation.isPending && acceptMutation.variables === a._id}
                      >
                        <Check className="h-4 w-4" />
                        Accept
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setRejectTarget(a)}>
                        <X className="h-4 w-4" />
                        Reject
                      </Button>
                    </>
                  }
                />
              ))}
            </div>
          )}
        </section>

        {/* My queue */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-brand" />
            <h2 className="font-serif text-xl font-semibold text-ink">My queue</h2>
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">
              {mineList.length}
            </span>
          </div>
          {mine.isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner className="text-brand" />
            </div>
          ) : mineList.length === 0 ? (
            <EmptyState icon={ListChecks} title="Your queue is empty" description="Accepted appointments show up here to start and finish." />
          ) : (
            <div className="stagger space-y-3">
              {mineList.map((a) => (
                <AppointmentCard
                  key={a._id}
                  appointment={a}
                  actions={
                    a.status === 'accepted' ? (
                      <Button
                        size="sm"
                        onClick={() => statusMutation.mutate({ id: a._id, status: 'in_service' })}
                      >
                        <Play className="h-4 w-4" />
                        Start service
                      </Button>
                    ) : a.status === 'in_service' ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => statusMutation.mutate({ id: a._id, status: 'done' })}
                      >
                        <Flag className="h-4 w-4" />
                        Finish
                      </Button>
                    ) : null
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={Boolean(rejectTarget)}
        onClose={() => {
          setRejectTarget(null);
          setRejectReason('');
        }}
        onConfirm={() => rejectMutation.mutate()}
        title="Reject this appointment?"
        description="It'll be re-routed to the next available barber, or cancelled if none are free."
        confirmLabel="Reject"
        tone="danger"
        loading={rejectMutation.isPending}
      >
        <Textarea
          label="Reason (optional)"
          rows={3}
          maxLength={300}
          placeholder="e.g. Running behind schedule"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </ConfirmDialog>
    </div>
  );
}
