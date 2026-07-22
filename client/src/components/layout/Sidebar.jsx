import { NavLink } from 'react-router-dom';
import cn from '../../utils/cn';
import Logo from '../Logo';
import { NAV_BY_ROLE, ROLE_LABEL } from './navConfig';

export default function Sidebar({ role, onNavigate }) {
  const items = NAV_BY_ROLE[role] || [];

  return (
    <div className="flex h-full flex-col bg-surface-2/50">
      <div className="flex h-16 items-center border-b border-line px-5">
        <Logo />
      </div>

      <div className="px-5 pb-1 pt-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          {ROLE_LABEL[role] || 'Portal'}
        </p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-ring',
                isActive
                  ? 'bg-brand/10 text-brand'
                  : 'text-muted hover:bg-surface hover:text-ink'
              )
            }
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-line p-4">
        <p className="text-xs text-muted">AzCuts · v0.1</p>
      </div>
    </div>
  );
}
