import { CalendarClock } from 'lucide-react';
import PagePlaceholder from '../../components/PagePlaceholder';

export default function StaffHistory() {
  return (
    <PagePlaceholder
      icon={CalendarClock}
      title="Staff History"
      description="Every staff member's appointment history."
      note="Staff history is built in Phase 7."
    />
  );
}
