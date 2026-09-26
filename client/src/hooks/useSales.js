import { keepPreviousData, useQuery } from '@tanstack/react-query';
import salesApi from '../api/sales.api';

// Calling staff's relevant sales records (paper: "View Relevant Sales Records").
export function useStaffSales({ search, sort, range, type, page, limit } = {}) {
  return useQuery({
    queryKey: ['staff', 'sales', { search: search || null, sort: sort || 'newest', range: range || 'all', type: type || 'all', page: page || 1, limit: limit || 50 }],
    queryFn: () => salesApi.mine({ search, sort, range, type, page, limit }).then((r) => r.data ?? { sales: [] }),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

// Admin review/monitor of all sales (paper: "Manage Sales Records").
export function useAdminSales({ barber, search, sort, range, type, page, limit } = {}) {
  return useQuery({
    queryKey: ['admin', 'sales', { barber: barber || null, search: search || null, sort: sort || 'newest', range: range || 'all', type: type || 'all', page: page || 1, limit: limit || 50 }],
    queryFn: () => salesApi.list({ barber, search, sort, range, type, page, limit }).then((r) => r.data ?? { sales: [] }),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
}

export default useStaffSales;
