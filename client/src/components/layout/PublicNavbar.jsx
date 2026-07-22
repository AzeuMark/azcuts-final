import { Link } from 'react-router-dom';
import Logo from '../Logo';
import ThemeToggle from '../ui/ThemeToggle';
import { buttonVariants } from '../ui/Button';

const SECTION_LINKS = [
  ['#services', 'Services'],
  ['#about', 'About'],
  ['#contact', 'Contact'],
  ['#location', 'Location'],
];

export default function PublicNavbar() {
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
          <Link to="/login" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            Log in
          </Link>
          <Link to="/register" className={buttonVariants({ variant: 'primary', size: 'sm' })}>
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}
