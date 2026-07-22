import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Receipt, Star, XCircle, Download, CalendarClock } from 'lucide-react';

import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import RatingStars from '../../components/RatingStars';
import ReceiptCard from '../../components/ReceiptCard';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Textarea from '../../components/ui/Textarea';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { Tabs } from '../../components/ui/Tabs';

import { useMyAppointments } from '../../hooks/useMyAppointments';
import { useSocketEvent } from '../../hooks/useSocketEvent';
import appointmentApi from '../../api/appointment.api';
import { getApiErrorMessage } from '../../config/axios';
import { formatMoney } from '../../utils/formatMoney';
import { formatDateTime } from '../../utils/datetime';
import { downloadReceiptPng } from '../../utils/receiptPng';

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
];

const CANCELLABLE = ['pending', 'accepted'];

export default function History() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);

  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [rateTarget, setRateTarget] = useState(null);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [receiptId, setReceiptId] = useState(null);

  const { data, isLoading, isError } = useMyAppointments({
    status: status === 'all' ? undefined : status,
    page,
  });
  const appointments = data?.appointments || [];
  const pagination = data?.pagination || { page: 1, pages: 1 };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['appointments', 'mine'] });

  const cancelMutation = useMutation({
    mutationFn: () => appointmentApi.cancel(cancelTarget._id, cancelReason.trim()),
    onSuccess: () => {
      toast.success('Booking cancelled');
      invalidate();
      closeCancel();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Could not cancel booking')),
  });

  const rateMutation = useMutation({
    mutationFn: () =>
      appointmentApi.rate(rateTarget._id, { stars, comment: comment.trim() || undefined }),
    onSuccess: (res) => {
      toast.success(res?.message || 'Thanks for the rating');
      invalidate();
      closeRate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Could not submit rating')),
  });

  const closeCancel = () => {
    setCancelTarget(null);
    setCancelReason('');
  };
  const openRate = (appt) => {
    setRateTarget(appt);
    setStars(appt.rating?.stars || 0);
    setComment(appt.rating?.comment || '');
  };
  const closeRate = () => {
    setRateTarget(null);
    setStars(0);
    setComment('');
  };

  // Real-time: when one of my appointments flips to done, auto-open the rating
  // prompt once it appears (unrated) in the refreshed list.
  const [autoRateId, setAutoRateId] = useState(null);
  useSocketEvent(
    'appointment:updated',
    useCallback((payload) => {
      if (payload?.status === 'done' && payload?.id) setAutoRateId(payload.id);
    }, [])
  );
  useEffect(() => {
    if (!autoRateId) return;
    const appt = appointments.find((a) => a._id === autoRateId);
    if (appt && appt.status === 'done' && !appt.rating) {
      openRate(appt);
      setAutoRateId(null);
    }
  }, [autoRateId, appointments]);

  const columns = [
    {
      key: 'date',
      header: 'Date',
      render: (a) => <span className="whitespace-nowrap">{formatDateTime(a.scheduledStart)}</span>,
    },
    { key: 'service', header: 'Service', render: (a) => a.service?.name || '—' },
    {
      key: 'staff',
      header: 'Barber',
      render: (a) => a.assignedStaff?.fullName || (a.autoAssigned ? 'Auto — pending' : '—'),
    },
    { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      render: (a) => formatMoney(a.priceSnapshot?.total, a.priceSnapshot?.currency),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (a) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => setReceiptId(a._id)} title="View receipt">
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">Receipt</span>
          </Button>
          {a.status === 'done' && (
            <Button
              variant={a.rating ? 'ghost' : 'subtle'}
              size="sm"
              onClick={() => openRate(a)}
              title={a.rating ? 'Edit rating' : 'Rate'}
            >
              <Star className={a.rating ? 'h-4 w-4 fill-warning text-warning' : 'h-4 w-4'} />
              <span className="hidden sm:inline">{a.rating ? 'Edit' : 'Rate'}</span>
            </Button>
          )}
          {CANCELLABLE.includes(a.status) && (
            <Button variant="ghost" size="sm" onClick={() => setCancelTarget(a)} title="Cancel booking">
              <XCircle className="h-4 w-4 text-danger" />
              <span className="hidden text-danger sm:inline">Cancel</span>
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="My Bookings"
        description="Track your appointments, cancel, rate, and view receipts."
      />

      <div className="mb-4">
        <Tabs
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          tabs={STATUS_TABS}
        />
      </div>

      {isError ? (
        <EmptyState
          icon={CalendarClock}
          title="Couldn't load your bookings"
          description="Please refresh the page or try again in a moment."
        />
      ) : !isLoading && appointments.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No bookings yet"
          description="When you book a service, it'll show up here."
          action={<Button onClick={() => navigate('/app/book')}>Book a service</Button>}
        />
      ) : (
        <DataTable
          columns={columns}
          data={appointments}
          loading={isLoading}
          page={pagination.page}
          totalPages={pagination.pages}
          onPageChange={setPage}
        />
      )}

      {/* Cancel dialog */}
      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onClose={closeCancel}
        onConfirm={() => {
          if (!cancelReason.trim()) {
            toast.error('Please enter a reason');
            return;
          }
          cancelMutation.mutate();
        }}
        title="Cancel this booking?"
        description="Let us know why. This can't be undone."
        confirmLabel="Cancel booking"
        cancelLabel="Keep it"
        tone="danger"
        loading={cancelMutation.isPending}
      >
        <Textarea
          label="Reason"
          placeholder="e.g. Schedule conflict"
          rows={3}
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
        />
        {!cancelReason.trim() && (
          <p className="mt-2 text-xs text-muted">A reason is required to cancel.</p>
        )}
      </ConfirmDialog>

      {/* Rate modal */}
      <Modal
        open={Boolean(rateTarget)}
        onClose={closeRate}
        title={rateTarget?.rating ? 'Edit your rating' : 'Rate your visit'}
        description={
          rateTarget?.assignedStaff?.fullName
            ? `How was your service with ${rateTarget.assignedStaff.fullName}?`
            : 'How was your service?'
        }
        footer={
          <>
            <Button variant="ghost" onClick={closeRate} disabled={rateMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={() => rateMutation.mutate()} loading={rateMutation.isPending} disabled={stars < 1}>
              {rateTarget?.rating ? 'Update rating' : 'Submit rating'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col items-center gap-4">
          <RatingStars value={stars} onChange={setStars} size="lg" />
          <Textarea
            containerClassName="w-full"
            label="Comment (optional)"
            placeholder="Share a few words about your experience"
            rows={3}
            maxLength={500}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>
      </Modal>

      {/* Receipt modal */}
      <ReceiptModal id={receiptId} onClose={() => setReceiptId(null)} />
    </div>
  );
}

function ReceiptModal({ id, onClose }) {
  const nodeRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const { data: receipt, isLoading } = useQuery({
    queryKey: ['receipt', id],
    queryFn: () => appointmentApi.receipt(id).then((r) => r.data.receipt),
    enabled: Boolean(id),
  });

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadReceiptPng(nodeRef.current, `${receipt?.receiptNo || 'azcuts-receipt'}.png`);
    } catch {
      toast.error('Could not export the receipt image');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal
      open={Boolean(id)}
      onClose={onClose}
      title="Receipt"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleDownload} loading={downloading} disabled={!receipt}>
            <Download className="h-4 w-4" />
            Download
          </Button>
        </>
      }
    >
      {isLoading || !receipt ? (
        <div className="flex justify-center py-10">
          <Spinner className="text-brand" />
        </div>
      ) : (
        <div className="flex justify-center">
          <ReceiptCard ref={nodeRef} receipt={receipt} />
        </div>
      )}
    </Modal>
  );
}
