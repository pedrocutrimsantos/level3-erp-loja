import { useQuery } from '@tanstack/react-query'
import { caixaApi } from '@/shared/api/caixa'

export function useCaixa(data?: string) {
  return useQuery({
    queryKey: ['caixa', data ?? 'hoje'],
    queryFn: () => caixaApi.resumoDia(data),
  })
}
