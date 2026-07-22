import { ClipboardList } from 'lucide-react';
import PagePlaceholder from '../../components/PagePlaceholder';

export default function History() {
  return (
    <PagePlaceholder
      icon={ClipboardList}
      title="Served History"
      description="Your completed appointments, total served, and rating summary."
      note="Served history and stats arrive in Phase 6."
    />
  );
}
