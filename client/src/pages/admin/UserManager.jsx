import { Users } from 'lucide-react';
import PagePlaceholder from '../../components/PagePlaceholder';

export default function UserManager() {
  return (
    <PagePlaceholder
      icon={Users}
      title="User Manager"
      description="Paginated users and staff, CRUD, and per-booking discounts."
      note="User management is built in Phase 7."
    />
  );
}
