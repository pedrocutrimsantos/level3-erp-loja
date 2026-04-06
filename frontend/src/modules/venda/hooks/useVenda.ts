import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { vendasApi, type VendaBalcaoRequest } from '@/shared/api/vendas'
import { useToast } from '@/shared/store/toastStore'
import { erroMsg } from '@/shared/utils/erroMsg'

export function useVendas(limit = 50) {
  return useQuery({
    queryKey: ['vendas', limit],
    queryFn: () => vendasApi.listar(limit),
  })
}

export function useVendaBalcao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (req: VendaBalcaoRequest) => vendasApi.registrarBalcao(req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['estoque'] })
      qc.invalidateQueries({ queryKey: ['produtos'] })
      qc.invalidateQueries({ queryKey: ['vendas'] })
    },
  })
}

export function useOrcamentos(limit = 100) {
  return useQuery({
    queryKey: ['orcamentos', limit],
    queryFn: () => vendasApi.listarOrcamentos(limit),
  })
}

export function useRegistrarOrcamento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (req: VendaBalcaoRequest) => vendasApi.registrarOrcamento(req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orcamentos'] })
    },
  })
}

export function useConfirmarOrcamento() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (id: string) => vendasApi.confirmarOrcamento(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orcamentos'] })
      qc.invalidateQueries({ queryKey: ['estoque'] })
      qc.invalidateQueries({ queryKey: ['vendas'] })
      qc.invalidateQueries({ queryKey: ['titulos'] })
    },
    onError: (err) => toast.erro(erroMsg(err, 'Erro ao confirmar orçamento.')),
  })
}

export function useCancelarOrcamento() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (id: string) => vendasApi.cancelarOrcamento(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orcamentos'] })
    },
    onError: (err) => toast.erro(erroMsg(err, 'Erro ao cancelar orçamento.')),
  })
}
