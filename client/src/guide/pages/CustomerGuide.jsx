import GuideLayout from '../GuideLayout';
import FeatureCard, { BackLinks } from '../FeatureCard';
import { CUSTOMER_FEATURES } from '../data';

export default function CustomerGuide() {
  return (
    <GuideLayout
      title="Customer tour — 10 features"
      description="Everything a customer can do, in paper order. Start at the landing page (/) as a guest, then follow the numbers."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {CUSTOMER_FEATURES.map((f, i) => (
          <FeatureCard key={f.bullet} index={i + 1} {...f} />
        ))}
      </div>
      <BackLinks
        links={[
          { to: '/guide/barber', label: 'Barber tour' },
          { to: '/guide/owner', label: 'Owner tour' },
        ]}
      />
    </GuideLayout>
  );
}
