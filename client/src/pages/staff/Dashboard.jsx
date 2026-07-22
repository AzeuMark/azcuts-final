import { LayoutDashboard } from 'lucide-react';
import PagePlaceholder from '../../components/PagePlaceholder';

export default function Dashboard() {
  return (
    <PagePlaceholder
      icon={LayoutDashboard}
      title="Staff Dashboard"
      description="Accept or reject incoming appointments and run your active queue."
      note="The staff dashboard is built in Phase 6."
    />
  );
}
