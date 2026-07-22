import PageHeader from '../../components/PageHeader';
import AccountSettings from '../../components/AccountSettings';

export default function Settings() {
  return (
    <div>
      <PageHeader title="Settings" description="Your profile, password, and barber nickname." />
      <AccountSettings showNickname />
    </div>
  );
}
