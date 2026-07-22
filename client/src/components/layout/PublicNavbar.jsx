import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut } from 'lucide-react';
import Logo from '../Logo';
import ThemeToggle from '../ui/ThemeToggle';
import Button, { buttonVariants } from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';

const SECTION_LINKS = [
  ['#services', 'Services'],
  ['#about', 'About'],
  ['#contact', 'Contact'],
  ['#location', 'Location'],
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

export default function PublicNavbar() {
  const { isAuthenticated, user, role, logout } = useAuth();
  const navigate = useNavigate();

  const home = HOME_BY_ROLE[role] || '/app';

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-sticky border-b border-line bg-app/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          {SECTION_LINKS.map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-ink focus-ring"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          {isAuthenticated ? (
            <>
              {/* Signed-in identity */}
              <div className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
                  {initialsOf(user?.fullName)}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block text-xs font-medium leading-tight text-ink">
                    {user?.fullName || 'Account'}
                  </span>
                  <span className="block text-[11px] leading-tight text-muted">{user?.email || ''}</span>
                </span>
              </div>

              <Link to={home} className={buttonVariants({ variant: 'primary', size: 'sm' })}>
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>

              <Button variant="ghost" size="sm" onClick={handleLogout} title="Sign out">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </>
          ) : (
            <>
              <Link to="/login" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                Log in
              </Link>
              <Link to="/register" className={buttonVariants({ variant: 'primary', size: 'sm' })}>
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
