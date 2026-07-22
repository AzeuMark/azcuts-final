import { BarChart3 } from 'lucide-react';
import PagePlaceholder from '../../components/PagePlaceholder';

export default function Analytics() {
  return (
    <PagePlaceholder
      icon={BarChart3}
      title="Analytics"
      description="KPIs, sales charts, and report export across date ranges."
      note="Analytics and reports are built in Phase 9."
    />
  );
}
