import { Settings as SettingsIcon } from 'lucide-react';
import PagePlaceholder from '../../components/PagePlaceholder';

export default function Settings() {
  return (
    <PagePlaceholder
      icon={SettingsIcon}
      title="Settings"
      description="Profile, password, and your nickname."
      note="Staff settings arrive in Phase 6."
    />
  );
}
