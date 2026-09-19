import { useQuery } from '@tanstack/react-query';
import stockApi from '../api/stock.api';
import productApi from '../api/product.api';

export function useStockLevels(lowOnly = false) {
  return useQuery({
    queryKey: ['stock', 'levels', lowOnly],
    queryFn: () =>
      stockApi.levels(lowOnly ? { lowOnly: true } : {}).then((r) => r.data?.levels ?? []),
    staleTime: 15_000,
  });
}

export function useStockMovements(productId = null) {
  return useQuery({
    queryKey: ['stock', 'movements', productId],
    queryFn: () =>
      stockApi
        .movements(productId ? { productId, limit: 50 } : { limit: 50 })
        .then((r) => r.data?.movements ?? []),
    staleTime: 15_000,
  });
}

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => productApi.list().then((r) => r.data?.products ?? []),
    staleTime: 60_000,
  });
}

export default useStockLevels;
