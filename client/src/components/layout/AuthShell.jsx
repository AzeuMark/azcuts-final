import Logo from '../Logo';
import ThemeToggle from '../ui/ThemeToggle';

// Centered layout for the login/register screens.
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-app">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center text-center">
            <Logo to="/" />
            {title && (
              <h1 className="mt-6 text-2xl font-semibold tracking-tight text-ink">{title}</h1>
            )}
            {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
          </div>
          <div className="rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8">
            {children}
          </div>
          {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
