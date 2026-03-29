import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  produtosApi,
  type CriarProdutoRequest,
  type AtualizarProdutoRequest,
  type SalvarPrecificacaoRequest,
} from '@/shared/api/produtos'

export function useUnidadesMedida() {
  return useQuery({
    queryKey: ['unidades-medida'],
    queryFn: () => produtosApi.listarUnidades(),
    staleTime: 60_000 * 10, // raramente muda
  })
}

export function useProdutos(apenasAtivos = true) {
  return useQuery({
    queryKey: ['produtos', apenasAtivos],
    queryFn: () => produtosApi.listar(apenasAtivos),
  })
}

export function useProduto(id: string) {
  return useQuery({
    queryKey: ['produtos', id],
    queryFn: () => produtosApi.buscar(id),
    enabled: !!id,
  })
}

export function useCriarProduto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (req: CriarProdutoRequest) => produtosApi.criar(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['produtos'] }),
  })
}

export function useAtualizarProduto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, req }: { id: string; req: AtualizarProdutoRequest }) =>
      produtosApi.atualizar(id, req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['produtos'] }),
  })
}

export function useInativarProduto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => produtosApi.inativar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['produtos'] }),
  })
}

export function useAtualizarDimensao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, espessuraM, larguraM }: { id: string; espessuraM: number; larguraM: number }) =>
      produtosApi.atualizarDimensao(id, { espessuraM, larguraM }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['produtos'] }),
  })
}

export function usePrecificacao(produtoId: string) {
  return useQuery({
    queryKey: ['precificacao', produtoId],
    queryFn: () => produtosApi.buscarPrecificacao(produtoId),
    enabled: !!produtoId,
    staleTime: 30_000,
  })
}

export function useAtualizarPreco() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, preco }: { id: string; preco: number | null }) =>
      produtosApi.atualizarPreco(id, preco),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['produtos'] }),
  })
}

export function useSalvarPrecificacao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, req }: { id: string; req: SalvarPrecificacaoRequest }) =>
      produtosApi.salvarPrecificacao(id, req),
    onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: ['precificacao', id] }),
  })
}
