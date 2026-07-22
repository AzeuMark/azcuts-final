import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, Menu, X } from 'lucide-react';
import ThemeToggle from '../ui/ThemeToggle';
import { useAuth } from '../../hooks/useAuth';
import cn from '../../utils/cn';

const SECTION_LINKS = [
  ['#home', 'Home'],
  ['#services', 'Services'],
  ['#team', 'Barbers'],
  ['#stories', 'Stories'],
  ['#contact', 'Contact'],
];

const HOME_BY_ROLE = { user: '/app', staff: '/staff', admin: '/admin' };

function initialsOf(name = '') {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((s) => s[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U'
  );
}

function Wordmark() {
  return (
    <Link
      to="/"
      className="focus-ring inline-flex items-center rounded-md font-display text-2xl font-bold tracking-wider text-ink"
      aria-label="AzCuts home"
    >
      AZ<span className="text-brand">CUTS</span>
    </Link>
  );
}

export default function PublicNavbar() {
  const { isAuthenticated, user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const home = HOME_BY_ROLE[role] || '/app';

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-sticky border-b border-line bg-app/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Wordmark />

          {/* Center section links (desktop) */}
          <div className="hidden items-center gap-8 md:flex">
            {SECTION_LINKS.map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="text-sm font-medium text-muted transition-colors hover:text-brand"
              >
                {label}
              </a>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            {isAuthenticated ? (
              <>
                <span className="hidden text-right sm:block">
                  <span className="block text-xs font-semibold leading-tight text-ink">
                    {user?.fullName || 'Account'}
                  </span>
                  <span className="block text-[11px] leading-tight text-muted">{user?.email || ''}</span>
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand sm:hidden">
                  {initialsOf(user?.fullName)}
                </span>
                <Link
                  to={home}
                  className="inline-flex items-center gap-1.5 bg-brand px-4 py-2 text-sm font-bold uppercase tracking-wider text-brand-fg transition-colors hover:bg-brand-hover focus-ring"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sign out"
                  aria-label="Sign out"
                  className="hidden h-9 w-9 items-center justify-center text-muted transition-colors hover:text-accent focus-ring sm:inline-flex"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden text-sm font-medium text-muted transition-colors hover:text-accent sm:block"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-brand px-4 py-2 text-sm font-bold uppercase tracking-wider text-brand-fg transition-colors hover:bg-brand-hover focus-ring"
                >
                  Book Now
                </Link>
              </>
            )}

            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              className="inline-flex h-9 w-9 items-center justify-center text-muted transition-colors hover:text-ink focus-ring md:hidden"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile section links */}
      {open && (
        <div className="border-t border-line bg-app md:hidden">
          <div className="space-y-1 px-4 py-3">
            {SECTION_LINKS.map(([href, label]) => (
              <a
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  'block rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-brand'
                )}
              >
                {label}
              </a>
            ))}
            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleLogout}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-accent"
              >
                Sign out
              </button>
            ) : (
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-accent"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
