import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { promocaoApi, PromocaoRequest } from '@/shared/api/promocao'

export function usePromocoes() {
  return useQuery({
    queryKey: ['promocoes'],
    queryFn: promocaoApi.listar,
  })
}

export function usePromocoesAtivas() {
  return useQuery({
    queryKey: ['promocoes', 'ativas'],
    queryFn: promocaoApi.listarAtivas,
  })
}

export function usePromocoesPorProduto(produtoId: string | null) {
  return useQuery({
    queryKey: ['promocoes', 'produto', produtoId],
    queryFn: () => promocaoApi.porProduto(produtoId!),
    enabled: !!produtoId,
  })
}

export function useCriarPromocao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (req: PromocaoRequest) => promocaoApi.criar(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promocoes'] }),
  })
}

export function useAtualizarPromocao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, req }: { id: string; req: PromocaoRequest }) =>
      promocaoApi.atualizar(id, req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promocoes'] }),
  })
}

export function useDesativarPromocao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => promocaoApi.desativar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promocoes'] }),
  })
}
