import { api } from './client'

export interface ItemEntregaResponse {
  itemVendaId: string
  produtoDescricao: string
  tipoProduto: 'MADEIRA' | 'NORMAL'
  quantidadeMetroLinear: string | null
  quantidadeUnidade: string | null
  unidadeSigla: string | null
  valorTotalItem: string
  statusEntrega: 'PENDENTE' | 'ENTREGUE' | 'DEVOLVIDO'
}

export interface EntregaResponse {
  id: string
  vendaId: string
  vendaNumero: string
  numero: string
  status: 'PENDENTE' | 'CONCLUIDA' | 'CANCELADA'
  observacao: string | null
  enderecoEntrega: string | null
  dataAgendada: string | null   // "yyyy-MM-dd"
  turno: 'MANHA' | 'TARDE' | 'DIA_TODO' | null
  motorista: string | null
  createdAt: string
  itens: ItemEntregaResponse[]
}

export interface EntregaResumoResponse {
  id: string
  vendaId: string
  vendaNumero: string
  clienteNome: string | null
  numero: string
  status: 'PENDENTE' | 'CONCLUIDA' | 'CANCELADA'
  observacao: string | null
  enderecoEntrega: string | null
  dataAgendada: string | null
  turno: 'MANHA' | 'TARDE' | 'DIA_TODO' | null
  motorista: string | null
  createdAt: string
  totalItens: number
  itensEntregues: number
}

export interface CriarEntregaRequest {
  observacao?: string
  enderecoEntrega?: string
  dataAgendada?: string   // "yyyy-MM-dd"
  turno?: 'MANHA' | 'TARDE' | 'DIA_TODO'
  motorista?: string
}

export interface ConfirmarEntregaRequest {
  itensEntregues: string[]  // IDs de item_venda
}

export const entregasApi = {
  listar: () =>
    api.get<EntregaResumoResponse[]>('/entregas').then((r) => r.data),

  buscarPorId: (id: string) =>
    api.get<EntregaResponse>(`/entregas/${id}`).then((r) => r.data),

  criar: (vendaId: string, req: CriarEntregaRequest) =>
    api.post<EntregaResponse>(`/vendas/${vendaId}/entrega`, req).then((r) => r.data),

  confirmar: (entregaId: string, req: ConfirmarEntregaRequest) =>
    api.post<EntregaResponse>(`/entregas/${entregaId}/confirmar`, req).then((r) => r.data),

  cancelar: (entregaId: string) =>
    api.post<EntregaResponse>(`/entregas/${entregaId}/cancelar`).then((r) => r.data),
}
