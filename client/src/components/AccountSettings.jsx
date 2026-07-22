import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/Card';
import Input from './ui/Input';
import Select from './ui/Select';
import Button, { buttonVariants } from './ui/Button';
import Avatar from './ui/Avatar';
import { useAuth } from '../hooks/useAuth';
import { useSettingsPublic } from '../hooks/useSettingsPublic';
import userApi from '../api/user.api';
import { getApiErrorMessage } from '../config/axios';
import cn from '../utils/cn';

export default function AccountSettings({ showNickname = false }) {
  const { user, setUser } = useAuth();
  const { data: settings } = useSettingsPublic();
  const nicknames = settings?.nicknames || [];

  const profileForm = useForm({
    values: {
      fullName: user?.fullName || '',
      username: user?.username || '',
      email: user?.email || '',
      phone: user?.phone || '',
      address: user?.address || '',
      nickname: user?.nickname || '',
    },
  });

  const passwordForm = useForm();

  const profileMutation = useMutation({
    mutationFn: (values) => {
      const payload = {
        fullName: values.fullName,
        username: values.username,
        email: values.email,
        phone: values.phone || undefined,
        address: values.address || undefined,
      };
      if (showNickname && values.nickname) payload.nickname = values.nickname;
      return userApi.updateProfile(payload);
    },
    onSuccess: (res) => {
      if (res?.data?.user) setUser(res.data.user);
      toast.success('Profile updated');
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Could not update profile')),
  });

  const passwordMutation = useMutation({
    mutationFn: (values) =>
      userApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      }),
    onSuccess: () => {
      toast.success('Password changed');
      passwordForm.reset();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Could not change password')),
  });

  const avatarMutation = useMutation({
    mutationFn: (file) => userApi.uploadAvatar(file),
    onSuccess: (res) => {
      if (res?.data?.user) setUser(res.data.user);
      toast.success('Profile photo updated');
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Could not update photo')),
  });

  const onAvatarChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      toast.error('Only PNG, JPG, or JPEG images are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB');
      return;
    }
    avatarMutation.mutate(file);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your personal details.</CardDescription>
        </CardHeader>
        <form onSubmit={profileForm.handleSubmit((v) => profileMutation.mutate(v))} noValidate>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 border-b border-line pb-4">
              <Avatar src={user?.avatar} name={user?.fullName} className="h-16 w-16 text-lg" />
              <div className="min-w-0">
                <label
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'sm' }),
                    'cursor-pointer',
                    avatarMutation.isPending && 'pointer-events-none opacity-60'
                  )}
                >
                  {avatarMutation.isPending ? 'Uploading…' : 'Change photo'}
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                    className="hidden"
                    onChange={onAvatarChange}
                    disabled={avatarMutation.isPending}
                  />
                </label>
                <p className="mt-1.5 text-xs text-muted">PNG, JPG, or JPEG · max 5MB.</p>
              </div>
            </div>
            <Input
              label="Full name"
              error={profileForm.formState.errors.fullName?.message}
              {...profileForm.register('fullName', { required: 'Full name is required' })}
            />
            <Input
              label="Username"
              error={profileForm.formState.errors.username?.message}
              {...profileForm.register('username', {
                required: 'Username is required',
                minLength: { value: 3, message: 'At least 3 characters' },
                maxLength: { value: 30, message: 'At most 30 characters' },
                pattern: { value: /^[a-zA-Z0-9._]+$/, message: 'Letters, numbers, dots, underscores only' },
              })}
            />
            <Input
              label="Email"
              type="email"
              error={profileForm.formState.errors.email?.message}
              {...profileForm.register('email', {
                required: 'Email is required',
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
              })}
            />
            <Input label="Phone" type="tel" {...profileForm.register('phone')} />
            <Input label="Address" {...profileForm.register('address')} />
            {showNickname && (
              <Select label="Nickname" {...profileForm.register('nickname')}>
                <option value="">Select a title…</option>
                {nicknames.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            )}
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" loading={profileMutation.isPending}>
              Save changes
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Change your password.</CardDescription>
        </CardHeader>
        <form onSubmit={passwordForm.handleSubmit((v) => passwordMutation.mutate(v))} noValidate>
          <CardContent className="space-y-4">
            <Input
              label="Current password"
              type="password"
              autoComplete="current-password"
              error={passwordForm.formState.errors.currentPassword?.message}
              {...passwordForm.register('currentPassword', { required: 'Current password is required' })}
            />
            <Input
              label="New password"
              type="password"
              autoComplete="new-password"
              error={passwordForm.formState.errors.newPassword?.message}
              {...passwordForm.register('newPassword', {
                required: 'New password is required',
                minLength: { value: 6, message: 'At least 6 characters' },
              })}
            />
            <Input
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              error={passwordForm.formState.errors.confirmPassword?.message}
              {...passwordForm.register('confirmPassword', {
                required: 'Please confirm your new password',
                validate: (v) => v === passwordForm.watch('newPassword') || 'Passwords do not match',
              })}
            />
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" variant="secondary" loading={passwordMutation.isPending}>
              Change password
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
