import AdminAppointmentHistory from '../../components/AdminAppointmentHistory';

export default function StaffHistory() {
  return (
    <AdminAppointmentHistory
      variant="staff"
      title="Staff History"
      description="Appointments routed to staff members. Set per-booking discounts before they finalize."
    />
  );
}
