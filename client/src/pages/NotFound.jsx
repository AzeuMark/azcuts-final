import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { buttonVariants } from '../components/ui/Button';
import ThemeToggle from '../components/ui/ThemeToggle';

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-app px-4 text-center">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Logo />
      <p className="mt-8 text-sm font-semibold uppercase tracking-wider text-brand">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <Link to="/" className={buttonVariants({ variant: 'primary', className: 'mt-6' })}>
        Back to home
      </Link>
    </div>
  );
}
