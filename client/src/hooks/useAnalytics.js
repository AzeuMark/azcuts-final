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

// Sales KPIs sourced from the sales collection (S6/S8).
export function useSalesSummary(range = 'monthly') {
  return useQuery({
    queryKey: ['analytics', 'sales-summary', range],
    queryFn: () => analyticsApi.summary(range, 'sales').then((r) => r.data),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

// Inventory report: levels, counts, recent movements (S6/S8).
export function useInventoryReport() {
  return useQuery({
    queryKey: ['analytics', 'inventory-report'],
    queryFn: () => analyticsApi.report('all', 'json', 'inventory').then((r) => r.data),
    staleTime: 30_000,
  });
}
