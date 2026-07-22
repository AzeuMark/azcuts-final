import { keepPreviousData, useQuery } from '@tanstack/react-query';
import adminApi from '../api/admin.api';

export function useAdminDashboard() {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => adminApi.dashboard().then((r) => r.data?.dashboard),
    staleTime: 15_000,
  });
}

export function useAdminUsers({ role, status, search, sort, page, limit } = {}) {
  return useQuery({
    queryKey: [
      'admin',
      'users',
      {
        role: role || null,
        status: status || null,
        search: search || '',
        sort: sort || 'newest',
        page: page || 1,
        limit: limit || 20,
      },
    ],
    queryFn: () => adminApi.listUsers({ role, status, search, sort, page, limit }).then((r) => r.data),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
}
