import { Hammer } from 'lucide-react';
import PageHeader from './PageHeader';
import EmptyState from './ui/EmptyState';

/*
 * Polished stand-in for portal screens that are scaffolded but built in a later
 * phase. Keeps the app shell feeling intentional (not raw "TODO") while Phase 0
 * only needs the routes to render.
 */
export default function PagePlaceholder({ title, description, note, icon }) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <EmptyState
        icon={icon || Hammer}
        title="Scaffolded and on the way"
        description={
          note || 'This screen is wired into the app and will be built out in an upcoming phase.'
        }
      />
    </div>
  );
}
