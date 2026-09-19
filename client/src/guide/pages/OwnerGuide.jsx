import GuideLayout from '../GuideLayout';
import FeatureCard, { BackLinks } from '../FeatureCard';
import { OWNER_FEATURES } from '../data';

export default function OwnerGuide() {
  return (
    <GuideLayout
      title="Owner tour — 10 feature groups"
      description="Log in as admin@azcuts.com / Admin@123. Suggested order: dashboard → users → inventory → history (assign) → sales → analytics."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {OWNER_FEATURES.map((f, i) => (
          <FeatureCard key={f.bullet} index={i + 1} {...f} />
        ))}
      </div>
      <BackLinks
        links={[
          { to: '/guide/hipo-ipo', label: 'HIPO + IPO' },
          { to: '/guide/database', label: 'Database chart' },
        ]}
      />
    </GuideLayout>
  );
}
