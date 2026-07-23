import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { X, User, AtSign, Mail, Phone, Lock } from 'lucide-react';

import Logo from '../Logo';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_HOME } from '../../utils/constants';
import { getApiErrorMessage } from '../../config/axios';
import cn from '../../utils/cn';

function RootError({ message }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger ring-1 ring-inset ring-danger/20"
    >
      {message}
    </div>
  );
}

function LoginForm({ onDone }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (values) => {
    try {
      const user = await login(values.identifier.trim(), values.password);
      const first = user?.fullName?.split(' ')[0];
      toast.success(first ? `Welcome back, ${first}` : 'Welcome back');
      onDone?.();
      navigate(ROLE_HOME[user?.role] || '/app/book');
    } catch (err) {
      setError('root', { message: getApiErrorMessage(err, 'Unable to log in. Please try again.') });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <RootError message={errors.root?.message} />
      <Input
        label="Username or email"
        type="text"
        autoComplete="username"
        placeholder="e.g. juandelacruz"
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
  );
}

function RegisterForm({ onDone }) {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (values) => {
    try {
      const user = await registerUser({
        fullName: values.fullName.trim(),
        username: values.username.trim().toLowerCase(),
        email: values.email.trim(),
        phone: values.phone?.trim() || undefined,
        password: values.password,
      });
      toast.success('Account created — welcome to AzCuts');
      onDone?.();
      navigate(ROLE_HOME[user?.role] || '/app/book');
    } catch (err) {
      setError('root', {
        message: getApiErrorMessage(err, 'Unable to create your account. Please try again.'),
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <RootError message={errors.root?.message} />
      <Input
        label="Full name"
        autoComplete="name"
        placeholder="Juan Dela Cruz"
        leftIcon={<User className="h-4 w-4" />}
        error={errors.fullName?.message}
        {...register('fullName', { required: 'Full name is required' })}
      />
      <Input
        label="Username"
        autoComplete="username"
        placeholder="e.g. juandelacruz"
        leftIcon={<AtSign className="h-4 w-4" />}
        error={errors.username?.message}
        {...register('username', {
          required: 'Username is required',
          minLength: { value: 3, message: 'At least 3 characters' },
          maxLength: { value: 30, message: 'At most 30 characters' },
          pattern: { value: /^[a-zA-Z0-9._]+$/, message: 'Letters, numbers, dots, and underscores only' },
        })}
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
  );
}

/*
 * Slide-in login/register panel for the landing page, so guests can sign in
 * without leaving the page. `mode` is 'login' | 'register' | null (closed).
 */
export default function LandingAuthPanel({ mode, onClose, onSwitchMode }) {
  const open = mode === 'login' || mode === 'register';

  useEffect(() => {
    if (!open) return undefined;
    const onEsc = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onEsc);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onEsc);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const isLogin = mode === 'login';

  return createPortal(
    <div className="fixed inset-0 z-modal" role="dialog" aria-modal="true" aria-label={isLogin ? 'Log in' : 'Create account'}>
      <div className="absolute inset-0 animate-fade-in bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-md animate-slide-in-right flex-col overflow-y-auto border-l border-line bg-app shadow-pop">
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <Logo to={null} />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink focus-ring"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 px-6 py-6">
          <h2 className="font-serif text-2xl font-semibold tracking-tight text-ink">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {isLogin
              ? 'Log in to book and manage your appointments.'
              : 'Sign up to book your first appointment.'}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface-2 p-1">
            <button
              type="button"
              onClick={() => onSwitchMode?.('login')}
              className={cn(
                'rounded-lg py-2 text-sm font-semibold transition-colors',
                isLogin ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
              )}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => onSwitchMode?.('register')}
              className={cn(
                'rounded-lg py-2 text-sm font-semibold transition-colors',
                !isLogin ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
              )}
            >
              Sign up
            </button>
          </div>

          <div className="mt-6">{isLogin ? <LoginForm onDone={onClose} /> : <RegisterForm onDone={onClose} />}</div>

          <p className="mt-6 text-center text-sm text-muted">
            {isLogin ? "New here? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => onSwitchMode?.(isLogin ? 'register' : 'login')}
              className="font-medium text-brand hover:underline"
            >
              {isLogin ? 'Create an account' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
