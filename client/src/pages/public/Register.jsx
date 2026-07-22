import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { User, Mail, Phone, Lock } from 'lucide-react';
import AuthShell from '../../components/layout/AuthShell';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_HOME } from '../../utils/constants';
import { getApiErrorMessage } from '../../config/axios';

export default function Register() {
  const { register: registerUser, isAuthenticated, role } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm();

  if (isAuthenticated) {
    return <Navigate to={ROLE_HOME[role] || '/'} replace />;
  }

  const onSubmit = async (values) => {
    setFormError(null);
    try {
      const user = await registerUser({
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        phone: values.phone?.trim() || undefined,
        password: values.password,
      });
      toast.success('Account created — welcome to AzCuts');
      navigate(ROLE_HOME[user?.role] || '/app/book', { replace: true });
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Unable to create your account. Please try again.'));
    }
  };

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
          label="Full name"
          autoComplete="name"
          placeholder="Juan Dela Cruz"
          leftIcon={<User className="h-4 w-4" />}
          error={errors.fullName?.message}
          {...register('fullName', { required: 'Full name is required' })}
        />

        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          leftIcon={<Mail className="h-4 w-4" />}
          error={errors.email?.message}
          {...register('email', {
            required: 'Email is required',
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
          })}
        />

        <Input
          label="Phone"
          type="tel"
          autoComplete="tel"
          placeholder="09xx xxx xxxx (optional)"
          leftIcon={<Phone className="h-4 w-4" />}
          hint="Optional — used for booking updates."
          error={errors.phone?.message}
          {...register('phone')}
        />

        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 6 characters"
          leftIcon={<Lock className="h-4 w-4" />}
          error={errors.password?.message}
          {...register('password', {
            required: 'Password is required',
            minLength: { value: 6, message: 'Password must be at least 6 characters' },
          })}
        />

        <Input
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          leftIcon={<Lock className="h-4 w-4" />}
          error={errors.confirmPassword?.message}
          {...register('confirmPassword', {
            required: 'Please confirm your password',
            validate: (v) => v === watch('password') || 'Passwords do not match',
          })}
        />

        <Button type="submit" className="w-full" loading={isSubmitting}>
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
