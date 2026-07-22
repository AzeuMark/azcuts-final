import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AtSign, Lock } from 'lucide-react';
import AuthShell from '../../components/layout/AuthShell';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_HOME } from '../../utils/constants';
import { getApiErrorMessage } from '../../config/axios';

export default function Login() {
  const { login, isAuthenticated, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const from = location.state?.from?.pathname;

  // Already signed in → send them to where they were headed, or their home.
  if (isAuthenticated) {
    return <Navigate to={from || ROLE_HOME[role] || '/'} replace />;
  }

  const onSubmit = async (values) => {
    setFormError(null);
    try {
      const user = await login(values.identifier.trim(), values.password);
      const first = user?.fullName?.split(' ')[0];
      toast.success(first ? `Welcome back, ${first}` : 'Welcome back');
      navigate(from || ROLE_HOME[user?.role] || '/', { replace: true });
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Unable to log in. Please try again.');
      setFormError(msg);
    }
  };

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
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {formError && (
          <div
            role="alert"
            className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger ring-1 ring-inset ring-danger/20"
          >
            {formError}
          </div>
        )}

        <Input
          label="Username or email"
          type="text"
          autoComplete="username"
          placeholder="you@example.com or your username"
          leftIcon={<AtSign className="h-4 w-4" />}
          error={errors.identifier?.message}
          {...register('identifier', { required: 'Username or email is required' })}
        />

        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="Your password"
          leftIcon={<Lock className="h-4 w-4" />}
          error={errors.password?.message}
          {...register('password', { required: 'Password is required' })}
        />

        <Button type="submit" className="w-full" loading={isSubmitting}>
          Log in
        </Button>
      </form>
    </AuthShell>
  );
}
