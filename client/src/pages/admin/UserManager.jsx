import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { UserPlus, Pencil, Trash2, Search } from 'lucide-react';

import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

import { useAdminUsers } from '../../hooks/useAdmin';
import { useSettingsPublic } from '../../hooks/useSettingsPublic';
import { useAuth } from '../../hooks/useAuth';
import adminApi from '../../api/admin.api';
import { getApiErrorMessage } from '../../config/axios';
import { formatDate } from '../../utils/datetime';

const ROLE_TONE = { admin: 'brand', staff: 'info', user: 'neutral' };
const STATUS_TONE = { active: 'success', inactive: 'neutral', in_service: 'warning' };

export default function UserManager() {
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const { data: settings } = useSettingsPublic();
  const nicknames = settings?.nicknames || [];

  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null); // user object or 'new'
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading } = useAdminUsers({ role: role || undefined, search: search || undefined, page });
  const users = data?.users || [];
  const pagination = data?.pagination || { page: 1, pages: 1 };

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'users'] });

  const deleteMutation = useMutation({
    mutationFn: () => adminApi.deleteUser(deleteTarget._id),
    onSuccess: () => {
      toast.success('User deleted');
      setDeleteTarget(null);
      invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Could not delete user')),
  });

  const columns = [
    { key: 'name', header: 'Name', render: (u) => <span className="font-medium text-ink">{u.fullName}</span> },
    { key: 'username', header: 'Username', render: (u) => <span className="text-muted">@{u.username}</span> },
    { key: 'email', header: 'Email', render: (u) => <span className="text-muted">{u.email}</span> },
    {
      key: 'role',
      header: 'Role',
      render: (u) => (
        <Badge tone={ROLE_TONE[u.role]}>
          {u.role}
          {u.role === 'staff' && u.nickname ? ` · ${u.nickname}` : ''}
        </Badge>
      ),
    },
    { key: 'status', header: 'Status', render: (u) => <Badge tone={STATUS_TONE[u.status] || 'neutral'}>{u.status}</Badge> },
    { key: 'joined', header: 'Joined', render: (u) => formatDate(u.createdAt) },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (u) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => setEditing(u)} title="Edit">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteTarget(u)}
            disabled={u._id === me?.id}
            title={u._id === me?.id ? "You can't delete yourself" : 'Delete'}
          >
            <Trash2 className="h-4 w-4 text-danger" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="User Manager"
        description="Manage customers and staff accounts."
        actions={
          <Button onClick={() => setEditing('new')}>
            <UserPlus className="h-4 w-4" />
            Add user
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Input
          leftIcon={<Search className="h-4 w-4" />}
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          containerClassName="sm:max-w-xs"
        />
        <Select
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
          containerClassName="sm:max-w-[180px]"
        >
          <option value="">All roles</option>
          <option value="user">Customers</option>
          <option value="staff">Staff</option>
          <option value="admin">Admins</option>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={users}
        loading={isLoading}
        page={pagination.page}
        totalPages={pagination.pages}
        onPageChange={setPage}
      />

      {editing && (
        <UserFormModal
          user={editing === 'new' ? null : editing}
          nicknames={nicknames}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            invalidate();
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate()}
        title={`Delete ${deleteTarget?.fullName || 'user'}?`}
        description="This permanently removes the account. Their past appointments keep their frozen receipts."
        confirmLabel="Delete"
        tone="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

function UserFormModal({ user, nicknames, onClose, onSaved }) {
  const isEdit = Boolean(user);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      fullName: user?.fullName || '',
      username: user?.username || '',
      email: user?.email || '',
      phone: user?.phone || '',
      address: user?.address || '',
      role: user?.role || 'user',
      nickname: user?.nickname || '',
      status: user?.status || 'active',
      password: '',
    },
  });

  const role = watch('role');

  const mutation = useMutation({
    mutationFn: (values) => {
      const payload = {
        fullName: values.fullName,
        username: values.username,
        email: values.email,
        phone: values.phone || undefined,
        address: values.address || undefined,
        role: values.role,
      };
      if (values.role === 'staff') payload.nickname = values.nickname || undefined;
      if (values.password) payload.password = values.password;
      if (isEdit) {
        payload.status = values.status;
        return adminApi.updateUser(user._id, payload);
      }
      return adminApi.createUser(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'User updated' : 'User created');
      onSaved();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Could not save user')),
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'Edit user' : 'Add user'}
      description={isEdit ? user.email : 'Create a customer, staff, or admin account.'}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit((v) => mutation.mutate(v))} loading={mutation.isPending}>
            {isEdit ? 'Save changes' : 'Create user'}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
        <Input
          label="Full name"
          error={errors.fullName?.message}
          {...register('fullName', { required: 'Full name is required' })}
        />
        <Input
          label="Username"
          error={errors.username?.message}
          {...register('username', {
            required: 'Username is required',
            minLength: { value: 3, message: 'At least 3 characters' },
            maxLength: { value: 30, message: 'At most 30 characters' },
            pattern: { value: /^[a-zA-Z0-9._]+$/, message: 'Letters, numbers, dots, underscores only' },
          })}
        />
        <Input
          label="Email"
          type="email"
          error={errors.email?.message}
          {...register('email', {
            required: 'Email is required',
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
          })}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Phone" type="tel" {...register('phone')} />
          <Select label="Role" {...register('role')}>
            <option value="user">Customer</option>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </Select>
        </div>
        {role === 'staff' && (
          <Select label="Nickname" {...register('nickname')}>
            <option value="">Select a title…</option>
            {nicknames.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        )}
        {isEdit && (
          <Select label="Status" {...register('status')}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="in_service">In service</option>
          </Select>
        )}
        <Input
          label={isEdit ? 'Reset password' : 'Password'}
          type="password"
          autoComplete="new-password"
          hint={isEdit ? 'Leave blank to keep the current password.' : undefined}
          error={errors.password?.message}
          {...register('password', {
            validate: (v) => {
              if (!isEdit && !v) return 'Password is required';
              if (v && v.length < 6) return 'At least 6 characters';
              return true;
            },
          })}
        />
      </form>
    </Modal>
  );
}
