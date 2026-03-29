import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { titulosApi, type BaixaTituloRequest, type CriarDespesaRequest } from '@/shared/api/titulos'

export function useTitulos(params?: { tipo?: string; status?: string; limit?: number }) {
  return useQuery({
    queryKey: ['titulos', params],
    queryFn: () => titulosApi.listar(params),
  })
}

export function useFluxoCaixa(dias = 30) {
  return useQuery({
    queryKey: ['fluxo-caixa', dias],
    queryFn: () => titulosApi.fluxoCaixa(dias),
  })
}

export function useCriarDespesa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (req: CriarDespesaRequest) => titulosApi.criarDespesa(req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['titulos'] })
      qc.invalidateQueries({ queryKey: ['fluxo-caixa'] })
    },
  })
}

export function useBaixaTitulo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, req }: { id: string; req: BaixaTituloRequest }) =>
      titulosApi.registrarBaixa(id, req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['titulos'] })
      qc.invalidateQueries({ queryKey: ['fluxo-caixa'] })
    },
  })
}
