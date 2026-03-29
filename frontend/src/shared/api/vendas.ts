import { api } from './client'

export interface ItemVendaRequest {
  produtoId: string
  quantidadeMetroLinear?: string
  quantidadeUnidade?: string
  precoUnitario: string
  observacao?: string
}

export interface VendaBalcaoRequest {
  itens: ItemVendaRequest[]
  clienteId?: string
  formaPagamento?: string
  dataVencimentoFiado?: string
  observacao?: string
}

export interface ItemVendaResponse {
  produtoId: string
  produtoCodigo: string
  produtoDescricao: string
  tipoProduto: 'MADEIRA' | 'NORMAL'
  quantidadeMetroLinear: string | null
  volumeM3Calculado: string | null
  quantidadeUnidade: string | null
  unidadeSigla: string | null
  formula: string | null
  novoSaldoM3: string | null
  novoSaldoMetrosLineares: string | null
  novoSaldoUnidade: string | null
  valorTotalItem: string
}

export interface VendaBalcaoResponse {
  vendaId: string
  numero: string
  itens: ItemVendaResponse[]
  valorTotal: string
}

export interface VendaListItemResponse {
  vendaId: string
  numero: string
  tipo: string
  status: string
  valorTotal: string
  createdAt: string
  quantidadeItens: number
  clienteNome: string | null
  formaPagamento: string | null
}

export interface OrcamentoItemResponse {
  produtoId: string
  produtoCodigo: string
  produtoDescricao: string
  quantidadeMetroLinear: string | null
  volumeM3Calculado: string | null
  quantidadeUnidade: string | null
  precoUnitario: string
  valorTotalItem: string
}

export interface OrcamentoDetalheResponse {
  vendaId: string
  numero: string
  status: string
  clienteNome: string | null
  formaPagamento: string | null
  valorTotal: string
  createdAt: string
  itens: OrcamentoItemResponse[]
}

export interface VendaDetalheItemResponse {
  produtoId: string
  produtoCodigo: string
  produtoDescricao: string
  tipoProduto: 'MADEIRA' | 'NORMAL'
  quantidadeMetroLinear: string | null
  volumeM3Calculado: string | null
  quantidadeUnidade: string | null
  unidadeSigla: string | null
  precoUnitario: string
  valorTotalItem: string
}

export interface VendaDetalheResponse {
  vendaId: string
  numero: string
  tipo: string
  status: string
  clienteNome: string | null
  formaPagamento: string | null
  observacao: string | null
  valorTotal: string
  createdAt: string
  itens: VendaDetalheItemResponse[]
}

export const vendasApi = {
  registrarBalcao: (req: VendaBalcaoRequest) =>
    api.post<VendaBalcaoResponse>('/vendas/balcao', req).then((r) => r.data),

  listar: (limit = 50) =>
    api.get<VendaListItemResponse[]>('/vendas', { params: { limit } }).then((r) => r.data),

  listarOrcamentos: (limit = 100) =>
    api.get<OrcamentoDetalheResponse[]>('/vendas/orcamentos', { params: { limit } }).then((r) => r.data),

  registrarOrcamento: (req: VendaBalcaoRequest) =>
    api.post<VendaBalcaoResponse>('/vendas/orcamentos', req).then((r) => r.data),

  confirmarOrcamento: (id: string) =>
    api.post<VendaListItemResponse>(`/vendas/orcamentos/${id}/confirmar`).then((r) => r.data),

  cancelarOrcamento: (id: string) =>
    api.delete(`/vendas/orcamentos/${id}`).then((r) => r.data),

  buscar: (id: string) =>
    api.get<VendaDetalheResponse>(`/vendas/${id}`).then((r) => r.data),
}
