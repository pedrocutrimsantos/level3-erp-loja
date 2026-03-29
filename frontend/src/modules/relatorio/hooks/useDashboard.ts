import { useQuery } from '@tanstack/react-query'
import { relatoriosApi } from '@/shared/api/relatorios'

export function useDashboard() {
  return useQuery({
    queryKey: ['relatorios', 'dashboard'],
    queryFn: relatoriosApi.dashboard,
    staleTime: 5 * 60 * 1000,
  })
}
