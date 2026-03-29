import { api } from './client'

export interface TituloResponse {
  id: string
  numero: string
  descricao: string | null
  tipo: 'RECEBER' | 'PAGAR'
  clienteNome: string | null
  fornecedorNome: string | null
  vendaNumero: string | null
  valorOriginal: string
  valorPago: string
  valorRestante: string
  status: 'ABERTO' | 'PAGO_PARCIAL' | 'PAGO' | 'VENCIDO' | 'CANCELADO' | 'NEGOCIADO'
  dataEmissao: string
  dataVencimento: string | null
  dataPagamento: string | null
  formaPagamento: string | null
}

export interface CriarDespesaRequest {
  descricao: string
  valor: string
  dataVencimento: string
}

export interface BaixaTituloRequest {
  formaPagamento: string
  dataPagamento?: string
}

export interface LancamentoFluxo {
  parcelaId: string
  tituloNumero: string
  tipo: 'RECEBER' | 'PAGAR'
  contraparte: string | null
  valor: string
  dataVencimento: string   // yyyy-MM-dd
  vencido: boolean
  diasAtraso: number | null
}

export interface FluxoCaixaResponse {
  hoje: string
  totalVencidoReceber: string
  totalVencidoPagar: string
  totalProximosReceber: string
  totalProximosPagar: string
  lancamentos: LancamentoFluxo[]
}

export const titulosApi = {
  listar: (params?: { tipo?: string; status?: string; limit?: number }) =>
    api.get<TituloResponse[]>('/titulos', { params }).then((r) => r.data),

  criarDespesa: (req: CriarDespesaRequest) =>
    api.post<TituloResponse>('/titulos', req).then((r) => r.data),

  registrarBaixa: (id: string, req: BaixaTituloRequest) =>
    api.post<TituloResponse>(`/titulos/${id}/baixa`, req).then((r) => r.data),

  fluxoCaixa: (dias = 30) =>
    api.get<FluxoCaixaResponse>('/financeiro/fluxo-caixa', { params: { dias } }).then((r) => r.data),
}
