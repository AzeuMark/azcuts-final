import { keepPreviousData, useQuery } from '@tanstack/react-query';
import analyticsApi from '../api/analytics.api';

export function useAnalyticsSummary(range = 'monthly') {
  return useQuery({
    queryKey: ['analytics', 'summary', range],
    queryFn: () => analyticsApi.summary(range).then((r) => r.data),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useAnalyticsSales(range = 'monthly') {
  return useQuery({
    queryKey: ['analytics', 'sales', range],
    queryFn: () => analyticsApi.sales(range).then((r) => r.data),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
