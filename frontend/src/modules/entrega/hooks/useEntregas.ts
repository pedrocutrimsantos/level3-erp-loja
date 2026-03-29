import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  entregasApi,
  type CriarEntregaRequest,
  type ConfirmarEntregaRequest,
} from '@/shared/api/entregas'

export function useEntregas() {
  return useQuery({
    queryKey: ['entregas'],
    queryFn: () => entregasApi.listar(),
    staleTime: 30_000,
  })
}

export function useEntrega(id: string | null) {
  return useQuery({
    queryKey: ['entrega', id],
    queryFn: () => entregasApi.buscarPorId(id!),
    enabled: !!id,
  })
}

export function useCriarEntrega() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ vendaId, req }: { vendaId: string; req: CriarEntregaRequest }) =>
      entregasApi.criar(vendaId, req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendas'] })
      qc.invalidateQueries({ queryKey: ['entregas'] })
    },
  })
}

export function useConfirmarEntrega() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ entregaId, req }: { entregaId: string; req: ConfirmarEntregaRequest }) =>
      entregasApi.confirmar(entregaId, req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendas'] })
      qc.invalidateQueries({ queryKey: ['entregas'] })
    },
  })
}

export function useCancelarEntrega() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (entregaId: string) => entregasApi.cancelar(entregaId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendas'] })
      qc.invalidateQueries({ queryKey: ['entregas'] })
    },
  })
}
