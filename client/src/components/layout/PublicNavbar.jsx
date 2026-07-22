import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import ThemeToggle from '../ui/ThemeToggle';
import Avatar from '../ui/Avatar';
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

// Circular avatar that opens a dropdown with the user's info + sign out.
function AccountMenu({ user, home, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onEsc = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="rounded-full focus-ring"
      >
        <Avatar src={user?.avatar} name={user?.fullName} className="h-9 w-9 text-sm ring-1 ring-line" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-dropdown mt-2 w-60 origin-top-right animate-scale-in rounded-xl border border-line bg-surface p-1.5 shadow-pop"
        >
          <div className="flex items-center gap-3 px-2.5 py-2">
            <Avatar src={user?.avatar} name={user?.fullName} className="h-9 w-9 text-sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{user?.fullName || 'Account'}</p>
              <p className="truncate text-xs text-muted">{user?.email || ''}</p>
            </div>
          </div>
          <div className="my-1 h-px bg-line" />
          <Link
            to={home}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-2.5 py-2 text-sm text-ink transition-colors hover:bg-surface-2"
          >
            Go to dashboard
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={onLogout}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-ink transition-colors hover:bg-surface-2 hover:text-danger"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default function PublicNavbar({ onAuth }) {
  const { isAuthenticated, user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const home = HOME_BY_ROLE[role] || '/app';

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate('/');
  };

  // Guests: open the slide-in panel when available, else fall back to routes.
  const openAuth = (mode) => {
    setOpen(false);
    if (onAuth) onAuth(mode);
    else navigate(mode === 'register' ? '/register' : '/login');
  };

  return (
    <nav className="sticky top-0 z-sticky border-b border-line bg-app/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Wordmark />

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

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                {/* Order: Dashboard > Theme > Profile */}
                <Link
                  to={home}
                  className="hidden bg-brand px-4 py-2 text-sm font-bold uppercase tracking-wider text-brand-fg transition-colors hover:bg-brand-hover focus-ring sm:block"
                >
                  Dashboard
                </Link>
                <ThemeToggle />
                <AccountMenu user={user} home={home} onLogout={handleLogout} />
              </>
            ) : (
              <>
                <ThemeToggle />
                <button
                  type="button"
                  onClick={() => openAuth('login')}
                  className="hidden text-sm font-medium text-muted transition-colors hover:text-accent sm:block"
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => openAuth('register')}
                  className="bg-brand px-4 py-2 text-sm font-bold uppercase tracking-wider text-brand-fg transition-colors hover:bg-brand-hover focus-ring"
                >
                  Book Now
                </button>
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

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-line bg-app md:hidden">
          <div className="space-y-1 px-4 py-3">
            {SECTION_LINKS.map(([href, label]) => (
              <a
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-brand"
              >
                {label}
              </a>
            ))}
            {isAuthenticated ? (
              <>
                <Link
                  to={home}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-2"
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-danger"
                >
                  Sign out
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => openAuth('login')}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-accent"
              >
                Login
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
