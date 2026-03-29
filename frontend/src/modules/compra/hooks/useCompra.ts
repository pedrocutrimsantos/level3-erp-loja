import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { comprasApi, type EntradaCompraRequest } from '@/shared/api/compras'

export function useEntradas(limit = 50) {
  return useQuery({
    queryKey: ['compras', 'entradas', limit],
    queryFn: () => comprasApi.listarEntradas(limit),
  })
}

export function useRegistrarEntrada() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (req: EntradaCompraRequest) => comprasApi.registrarEntrada(req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['estoque'] })
      qc.invalidateQueries({ queryKey: ['compras'] })
    },
  })
}
