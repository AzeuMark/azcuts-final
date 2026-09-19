import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';

// One paper bullet → where it lives + how to reach it.
export default function FeatureCard({ index, bullet, where, steps, endpoint }) {
  return (
    <article className="rounded-2xl border border-line bg-surface p-5 shadow-card">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand">
          {index}
        </span>
        <div className="min-w-0">
          <h3 className="font-semibold text-ink">{bullet}</h3>
          <p className="mt-1 inline-flex items-center gap-1 text-sm text-accent">
            <MapPin className="h-3.5 w-3.5" />
            Find it: <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs">{where}</code>
          </p>
        </div>
      </div>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-ink/80">
        {steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      {endpoint && (
        <p className="mt-3 truncate font-mono text-xs text-muted" title={endpoint}>
          {endpoint}
        </p>
      )}
    </article>
  );
}

export function DemoAccounts({ accounts }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-card">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wider text-muted">
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Password</th>
            <th className="px-4 py-3">Lands on</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((a) => (
            <tr key={a.email} className="border-b border-line last:border-0">
              <td className="px-4 py-2.5 font-medium text-ink">{a.role}</td>
              <td className="px-4 py-2.5 font-mono text-xs">{a.email}</td>
              <td className="px-4 py-2.5 font-mono text-xs">{a.password}</td>
              <td className="px-4 py-2.5 font-mono text-xs text-accent">{a.lands}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BackLinks({ links }) {
  return (
    <p className="mt-8 text-sm text-muted">
      Next:{' '}
      {links.map((l, i) => (
        <span key={l.to}>
          {i > 0 && ' · '}
          <Link to={l.to} className="text-brand hover:underline">
            {l.label}
          </Link>
        </span>
      ))}
    </p>
  );
}
