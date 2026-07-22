import { LayoutDashboard } from 'lucide-react';
import PagePlaceholder from '../../components/PagePlaceholder';

export default function Dashboard() {
  return (
    <PagePlaceholder
      icon={LayoutDashboard}
      title="Admin Dashboard"
      description="Live counters: active staff, in-service, customers today, sales today."
      note="The admin dashboard is built in Phase 7."
    />
  );
}
