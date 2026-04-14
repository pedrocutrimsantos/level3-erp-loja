import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { metaVendasApi } from '@/shared/api/metaVendas'
import { useToast } from '@/shared/store/toastStore'
import { erroMsg } from '@/shared/utils/erroMsg'

export function useDesempenho(ano: number, mes: number) {
  return useQuery({
    queryKey: ['meta-desempenho', ano, mes],
    queryFn: () => metaVendasApi.desempenho(ano, mes),
  })
}

export function useSalvarMeta() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: ({
      vendedorId, ano, mes, metaFaturamento,
    }: { vendedorId: string; ano: number; mes: number; metaFaturamento: string }) =>
      metaVendasApi.salvar(vendedorId, ano, mes, metaFaturamento),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meta-desempenho'] })
      toast.sucesso('Meta salva com sucesso')
    },
    onError: (err: unknown) => {
      toast.erro(erroMsg(err, 'Erro ao salvar meta'))
    },
  })
}

export function useRemoverMeta() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: ({ vendedorId, ano, mes }: { vendedorId: string; ano: number; mes: number }) =>
      metaVendasApi.remover(vendedorId, ano, mes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meta-desempenho'] })
      toast.sucesso('Meta removida')
    },
    onError: (err: unknown) => {
      toast.erro(erroMsg(err, 'Erro ao remover meta'))
    },
  })
}
