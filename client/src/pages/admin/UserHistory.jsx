import { CalendarDays } from 'lucide-react';
import PagePlaceholder from '../../components/PagePlaceholder';

export default function UserHistory() {
  return (
    <PagePlaceholder
      icon={CalendarDays}
      title="User History"
      description="Every customer's appointment history."
      note="User history is built in Phase 7."
    />
  );
}
