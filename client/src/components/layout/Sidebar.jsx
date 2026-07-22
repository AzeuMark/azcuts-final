import { NavLink } from 'react-router-dom';
import cn from '../../utils/cn';
import { NAV_BY_ROLE, ROLE_LABEL } from './navConfig';

function BrandMark({ role, collapsed }) {
  return (
    <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-surface-2">
        <img
          src="/assets/website-logo.png"
          alt="AzCuts"
          className="h-8 w-8 rounded-md object-contain"
        />
      </div>
      {!collapsed && (
        <div className="leading-none">
          <div className="font-serif text-xl font-semibold tracking-tight text-ink">AzCuts</div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-muted">
            {ROLE_LABEL[role] || 'Portal'}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ role, onNavigate, collapsed = false }) {
  const items = NAV_BY_ROLE[role] || [];

  return (
    <div className="flex h-full flex-col bg-surface-2/40">
      <div
        className={cn(
          'flex h-16 items-center border-b border-line',
          collapsed ? 'justify-center px-2' : 'px-5'
        )}
      >
        <BrandMark role={role} collapsed={collapsed} />
      </div>

      {!collapsed && (
        <div className="px-5 pb-2 pt-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted">Main</p>
        </div>
      )}

      <nav className={cn('flex-1 space-y-1 overflow-y-auto py-3', collapsed ? 'px-2' : 'px-3')}>
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            onClick={onNavigate}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center rounded-lg text-sm font-medium transition-colors focus-ring',
                collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
                isActive
                  ? 'bg-gradient-to-r from-brand/15 to-transparent text-brand'
                  : 'text-muted hover:bg-surface hover:text-ink'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span
                    className="absolute inset-y-2 left-0 w-0.5 rounded-r-full bg-brand shadow-[0_0_12px_rgba(225,29,72,0.6)]"
                    aria-hidden="true"
                  />
                )}
                <Icon className="h-[18px] w-[18px] shrink-0 transition-transform group-hover:translate-x-0.5" />
                {!collapsed && <span className="truncate">{label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
