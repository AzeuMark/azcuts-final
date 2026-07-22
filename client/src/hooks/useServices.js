import { useQuery } from '@tanstack/react-query';
import inventoryApi from '../api/inventory.api';

export function useServices(params = {}) {
  return useQuery({
    queryKey: ['services', params],
    queryFn: () => inventoryApi.listServices(params).then((r) => r.data?.services ?? []),
    staleTime: 5 * 60_000,
  });
}

export function useExtras(params = {}) {
  return useQuery({
    queryKey: ['extras', params],
    queryFn: () => inventoryApi.listExtras(params).then((r) => r.data?.extras ?? []),
    staleTime: 5 * 60_000,
  });
}

export default useServices;
