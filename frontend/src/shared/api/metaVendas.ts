import { api } from './client'

export interface DesempenhoVendedorItem {
  vendedorId: string
  vendedorNome: string
  metaFaturamento: string | null
  realizadoFaturamento: string
  percentualAtingido: string | null
  totalVendas: number
  ticketMedio: string
  totalM3: string
  totalMetrosLineares: string
  temMeta: boolean
}

export interface DesempenhoResponse {
  ano: number
  mes: number
  itens: DesempenhoVendedorItem[]
  totalFaturamento: string
  totalMeta: string
  percentualGeralAtingido: string | null
}

export interface MetaVendaResponse {
  id: string
  vendedorId: string
  vendedorNome: string
  ano: number
  mes: number
  metaFaturamento: string
}

export const metaVendasApi = {
  desempenho: (ano: number, mes: number) =>
    api
      .get<DesempenhoResponse>('/meta-vendas/desempenho', { params: { ano, mes } })
      .then((r) => r.data),

  salvar: (vendedorId: string, ano: number, mes: number, metaFaturamento: string) =>
    api
      .put<MetaVendaResponse>(`/meta-vendas/${vendedorId}`, { metaFaturamento }, { params: { ano, mes } })
      .then((r) => r.data),

  remover: (vendedorId: string, ano: number, mes: number) =>
    api.delete(`/meta-vendas/${vendedorId}`, { params: { ano, mes } }),
}
