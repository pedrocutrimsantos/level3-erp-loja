import { useQuery } from '@tanstack/react-query'
import { relatoriosApi } from '@/shared/api/relatorios'

export function useDre(dataInicio: string, dataFim: string) {
  return useQuery({
    queryKey: ['dre', dataInicio, dataFim],
    queryFn: () => relatoriosApi.dre(dataInicio, dataFim),
    enabled: Boolean(dataInicio && dataFim),
  })
}
