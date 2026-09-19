import { useQuery } from '@tanstack/react-query';
import salesApi from '../api/sales.api';

// Calling staff's relevant sales records (paper: "View Relevant Sales Records").
export function useStaffSales() {
  return useQuery({
    queryKey: ['staff', 'sales'],
    queryFn: () => salesApi.mine().then((r) => r.data?.sales ?? []),
    staleTime: 15_000,
  });
}

export default useStaffSales;
