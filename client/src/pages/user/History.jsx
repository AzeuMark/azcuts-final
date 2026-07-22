import { History as HistoryIcon } from 'lucide-react';
import PagePlaceholder from '../../components/PagePlaceholder';

export default function History() {
  return (
    <PagePlaceholder
      icon={HistoryIcon}
      title="My Bookings"
      description="Track your appointments, cancel, rate, and view receipts."
      note="Booking history and ratings arrive in Phase 5."
    />
  );
}
