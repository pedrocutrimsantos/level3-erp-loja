import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { devolucoesApi, type RegistrarDevolucaoRequest } from '@/shared/api/devolucoes'

export function useItensVenda(vendaId: string | null) {
  return useQuery({
    queryKey: ['venda-itens', vendaId],
    queryFn: () => devolucoesApi.buscarItens(vendaId!),
    enabled: !!vendaId,
    staleTime: 30_000,
  })
}

export function useRegistrarDevolucao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ vendaId, req }: { vendaId: string; req: RegistrarDevolucaoRequest }) =>
      devolucoesApi.registrar(vendaId, req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendas'] })
      qc.invalidateQueries({ queryKey: ['estoque'] })
    },
  })
}
