import { keepPreviousData, useQuery } from '@tanstack/react-query';
import salesApi from '../api/sales.api';

// Calling staff's relevant sales records (paper: "View Relevant Sales Records").
export function useStaffSales() {
  return useQuery({
    queryKey: ['staff', 'sales'],
    queryFn: () => salesApi.mine().then((r) => r.data?.sales ?? []),
    staleTime: 15_000,
  });
}

// Admin review/monitor of all sales (paper: "Manage Sales Records").
export function useAdminSales({ barber, page, limit } = {}) {
  return useQuery({
    queryKey: ['admin', 'sales', { barber: barber || null, page: page || 1, limit: limit || 50 }],
    queryFn: () => salesApi.list({ barber, limit }).then((r) => r.data?.sales ?? []),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
}

export default useStaffSales;
