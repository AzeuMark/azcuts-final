import { Settings as SettingsIcon } from 'lucide-react';
import PagePlaceholder from '../../components/PagePlaceholder';

export default function Settings() {
  return (
    <PagePlaceholder
      icon={SettingsIcon}
      title="Settings"
      description="Update your profile and change your password."
      note="Profile and security settings arrive in Phase 5."
    />
  );
}
