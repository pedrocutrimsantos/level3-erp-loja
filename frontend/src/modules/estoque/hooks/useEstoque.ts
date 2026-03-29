import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  estoqueApi,
  type AjusteEstoqueRequest,
} from '@/shared/api/estoque'

export function useSaldoEstoque(produtoId: string | null) {
  return useQuery({
    queryKey: ['estoque', 'saldo', produtoId],
    queryFn: () => estoqueApi.consultarSaldo(produtoId!),
    enabled: !!produtoId,
    refetchInterval: 30_000,
  })
}

export function useMovimentacoes(produtoId: string | null, limit = 50) {
  return useQuery({
    queryKey: ['estoque', 'movimentacoes', produtoId, limit],
    queryFn: () => estoqueApi.listarMovimentacoes(produtoId!, limit),
    enabled: !!produtoId,
  })
}

export function useSublotes(produtoId: string | null) {
  return useQuery({
    queryKey: ['estoque', 'sublotes', produtoId],
    queryFn: () => estoqueApi.listarSublotes(produtoId!),
    enabled: !!produtoId,
  })
}

export function useMovimentacoesGeral(params?: { produtoId?: string; tipo?: string; limit?: number }) {
  return useQuery({
    queryKey: ['estoque', 'movimentacoes-geral', params],
    queryFn: () => estoqueApi.listarMovimentacoesGeral(params),
  })
}

export function useRegistrarAjuste() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (req: AjusteEstoqueRequest) => estoqueApi.registrarAjuste(req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['estoque'] })
      qc.invalidateQueries({ queryKey: ['produtos'] })
    },
  })
}
