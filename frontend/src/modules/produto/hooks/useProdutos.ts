import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import {
  produtosApi,
  type CriarProdutoRequest,
  type AtualizarProdutoRequest,
  type SalvarPrecificacaoRequest,
} from '@/shared/api/produtos'
import { useToast } from '@/shared/store/toastStore'
import { erroMsg } from '@/shared/utils/erroMsg'

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

/** Busca produtos por termo (mín. 1 char) com debounce de 300 ms. */
export function usePesquisarProdutos(termo: string, apenasAtivos = true) {
  const [termoDebounced, setTermoDebounced] = useState(termo)

  useEffect(() => {
    const t = setTimeout(() => setTermoDebounced(termo), 300)
    return () => clearTimeout(t)
  }, [termo])

  return useQuery({
    queryKey: ['produtos-busca', apenasAtivos, termoDebounced],
    queryFn: () => produtosApi.pesquisar(termoDebounced, apenasAtivos),
    enabled: termoDebounced.trim().length >= 1,
    staleTime: 10_000,
    placeholderData: (prev) => prev,
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
  const toast = useToast()
  return useMutation({
    mutationFn: (req: CriarProdutoRequest) => produtosApi.criar(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['produtos'] }),
    onError: (err) => toast.erro(erroMsg(err, 'Erro ao criar produto.')),
  })
}

export function useAtualizarProduto() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: ({ id, req }: { id: string; req: AtualizarProdutoRequest }) =>
      produtosApi.atualizar(id, req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['produtos'] }),
    onError: (err) => toast.erro(erroMsg(err, 'Erro ao atualizar produto.')),
  })
}

export function useInativarProduto() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (id: string) => produtosApi.inativar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['produtos'] }),
    onError: (err) => toast.erro(erroMsg(err, 'Erro ao inativar produto.')),
  })
}

export function useAtualizarDimensao() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: ({ id, espessuraM, larguraM }: { id: string; espessuraM: number; larguraM: number }) =>
      produtosApi.atualizarDimensao(id, { espessuraM, larguraM }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['produtos'] }),
    onError: (err) => toast.erro(erroMsg(err, 'Erro ao atualizar dimensões.')),
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
