import PageHeader from '../../components/PageHeader';
import AccountSettings from '../../components/AccountSettings';

export default function Settings() {
  return (
    <div>
      <PageHeader title="Settings" description="Manage your profile and password." />
      <AccountSettings />
    </div>
  );
}
