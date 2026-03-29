import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  clientesApi,
  type CriarClienteRequest,
  type AtualizarClienteRequest,
} from '@/shared/api/clientes'

export function useClientes(apenasAtivos = true) {
  return useQuery({
    queryKey: ['clientes', apenasAtivos],
    queryFn: () => clientesApi.listar(apenasAtivos),
  })
}

export function useCliente(id: string) {
  return useQuery({
    queryKey: ['clientes', id],
    queryFn: () => clientesApi.buscar(id),
    enabled: !!id,
  })
}

export function useCriarCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (req: CriarClienteRequest) => clientesApi.criar(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clientes'] }),
  })
}

export function useAtualizarCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, req }: { id: string; req: AtualizarClienteRequest }) =>
      clientesApi.atualizar(id, req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clientes'] }),
  })
}

export function useInativarCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => clientesApi.inativar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clientes'] }),
  })
}
