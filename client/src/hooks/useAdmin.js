import { keepPreviousData, useQuery } from '@tanstack/react-query';
import adminApi from '../api/admin.api';

export function useAdminDashboard() {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => adminApi.dashboard().then((r) => r.data?.dashboard),
    staleTime: 15_000,
  });
}

export function useAdminUsers({ role, search, page } = {}) {
  return useQuery({
    queryKey: ['admin', 'users', { role: role || null, search: search || '', page: page || 1 }],
    queryFn: () => adminApi.listUsers({ role, search, page }).then((r) => r.data),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
}
