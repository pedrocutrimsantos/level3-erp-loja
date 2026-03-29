import { api } from './client'

export interface ItemVendaDetalhe {
  itemVendaId: string
  produtoCodigo: string
  produtoDescricao: string
  tipoProduto: 'MADEIRA' | 'NORMAL'
  quantidadeMetroLinear: string | null   // MADEIRA: metros vendidos
  volumeM3Calculado: string | null
  quantidadeUnidade: string | null       // NORMAL: quantidade vendida
  unidadeSigla: string | null
  precoUnitario: string
  valorTotalItem: string
}

export interface ItemDevolucaoRequest {
  itemVendaId: string
  quantidade: string  // metros lineares p/ MADEIRA; unidade p/ NORMAL
}

export interface RegistrarDevolucaoRequest {
  itens: ItemDevolucaoRequest[]
  motivo?: string
}

export interface ItemDevolucaoResponse {
  itemVendaId: string
  produtoDescricao: string
  quantidadeMLinear: string | null
  volumeM3: string | null
  quantidadeUnidade: string | null
  valorDevolvido: string
}

export interface DevolucaoResponse {
  id: string
  vendaId: string
  vendaNumero: string
  numero: string
  motivo: string | null
  valorTotal: string
  createdAt: string
  itens: ItemDevolucaoResponse[]
}

export const devolucoesApi = {
  buscarItens: (vendaId: string) =>
    api.get<ItemVendaDetalhe[]>(`/vendas/${vendaId}/itens`).then((r) => r.data),

  registrar: (vendaId: string, req: RegistrarDevolucaoRequest) =>
    api.post<DevolucaoResponse>(`/vendas/${vendaId}/devolver`, req).then((r) => r.data),
}
