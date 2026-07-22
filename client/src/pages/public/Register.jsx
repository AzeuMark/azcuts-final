import { Link } from 'react-router-dom';
import AuthShell from '../../components/layout/AuthShell';
import { buttonVariants } from '../../components/ui/Button';

export default function Register() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Sign up to book your first appointment."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <p className="text-sm text-muted">
        Customer registration is wired up in Phase 1 (Auth &amp; guards). The design system and
        shell it lives in are ready now.
      </p>
      <Link to="/" className={buttonVariants({ variant: 'outline', className: 'mt-6 w-full' })}>
        Back to home
      </Link>
    </AuthShell>
  );
}
