import { Settings as SettingsIcon } from 'lucide-react';
import PagePlaceholder from '../../components/PagePlaceholder';

export default function SystemSettings() {
  return (
    <PagePlaceholder
      icon={SettingsIcon}
      title="System Settings"
      description="System mode, timezone, store hours, nicknames, and shop info."
      note="System settings are built in Phase 8."
    />
  );
}
