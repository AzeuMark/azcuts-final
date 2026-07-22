import AdminAppointmentHistory from '../../components/AdminAppointmentHistory';

export default function UserHistory() {
  return (
    <AdminAppointmentHistory
      variant="users"
      title="User History"
      description="Every customer appointment. Set per-booking discounts before they finalize."
    />
  );
}
