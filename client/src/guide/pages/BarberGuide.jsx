import GuideLayout from '../GuideLayout';
import FeatureCard, { BackLinks } from '../FeatureCard';
import { BARBER_FEATURES } from '../data';

export default function BarberGuide() {
  return (
    <GuideLayout
      title="Barber tour — 11 features"
      description="Log in as miguel@azcuts.com / Staff@123. New bookings appear only after the owner assigns them — that handshake is the heart of the demo."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {BARBER_FEATURES.map((f, i) => (
          <FeatureCard key={f.bullet} index={i + 1} {...f} />
        ))}
      </div>
      <BackLinks
        links={[
          { to: '/guide/customer', label: 'Customer tour' },
          { to: '/guide/owner', label: 'Owner tour' },
        ]}
      />
    </GuideLayout>
  );
}
