import { Link } from 'react-router-dom';
import AuthShell from '../../components/layout/AuthShell';
import { buttonVariants } from '../../components/ui/Button';

export default function Login() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to book and manage your appointments."
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-medium text-brand hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <p className="text-sm text-muted">
        The login form is wired up in Phase 1 (Auth &amp; guards). The design system and shell it
        lives in are ready now.
      </p>
      <Link to="/" className={buttonVariants({ variant: 'outline', className: 'mt-6 w-full' })}>
        Back to home
      </Link>
    </AuthShell>
  );
}
