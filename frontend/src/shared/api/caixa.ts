import { api } from './client'

export interface ResumoFormaPagamento {
  formaPagamento: string
  total: string
  quantidade: number
}

export interface VendaCaixaItem {
  numero: string
  clienteNome: string | null
  formaPagamento: string | null
  valorTotal: string
  createdAt: string
}

export interface CaixaDiaResponse {
  data: string
  totalVendas: string
  quantidadeVendas: number
  resumoPorForma: ResumoFormaPagamento[]
  vendas: VendaCaixaItem[]
}

export const caixaApi = {
  resumoDia: (data?: string) =>
    api
      .get<CaixaDiaResponse>('/financeiro/caixa', { params: data ? { data } : undefined })
      .then((r) => r.data),
}
