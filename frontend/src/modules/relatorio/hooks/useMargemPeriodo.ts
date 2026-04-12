import { useQuery } from '@tanstack/react-query'
import { relatoriosApi } from '@/shared/api/relatorios'

export function useMargemPeriodo(dataInicio: string, dataFim: string) {
  return useQuery({
    queryKey: ['margem-periodo', dataInicio, dataFim],
    queryFn: () => relatoriosApi.margemPeriodo(dataInicio, dataFim),
    enabled: Boolean(dataInicio && dataFim),
  })
}
