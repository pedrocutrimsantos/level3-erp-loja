import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cobrancaApi } from '@/shared/api/cobranca'

export function useCobrancaPendentes() {
  return useQuery({
    queryKey: ['cobranca', 'pendentes'],
    queryFn: cobrancaApi.pendentes,
  })
}

export function useCobrancaHistorico(limit = 100) {
  return useQuery({
    queryKey: ['cobranca', 'historico', limit],
    queryFn: () => cobrancaApi.historico(limit),
  })
}

export function useDispararLote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: cobrancaApi.dispararLote,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cobranca'] })
    },
  })
}

export function useDispararUnica() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (parcelaId: string) => cobrancaApi.dispararUnica(parcelaId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cobranca'] })
    },
  })
}
