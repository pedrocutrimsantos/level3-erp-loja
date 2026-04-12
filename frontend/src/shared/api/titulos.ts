import { api } from './client'

export interface TituloResponse {
  id: string
  numero: string
  descricao: string | null
  tipo: 'RECEBER' | 'PAGAR'
  categoria: string | null
  clienteNome: string | null
  fornecedorNome: string | null
  fornecedorId: string | null
  vendaNumero: string | null
  valorOriginal: string
  valorPago: string
  valorRestante: string
  status: 'ABERTO' | 'PAGO_PARCIAL' | 'PAGO' | 'VENCIDO' | 'CANCELADO' | 'NEGOCIADO'
  dataEmissao: string
  dataVencimento: string | null
  dataPagamento: string | null
  formaPagamento: string | null
  numeroParcelas: number
  parcelasPagas: number
}

export interface CriarDespesaRequest {
  descricao: string
  valor: string
  dataVencimento: string
  fornecedorId?: string
  categoria?: string
  numeroParcelas?: number
  intervaloDiasParcelas?: number
}

export interface BaixaTituloRequest {
  formaPagamento: string
  dataPagamento?: string
}

export interface ResumoPagarResponse {
  totalAberto: string
  totalVencido: string
  totalVenceHoje: string
  totalVenceSemana: string
}

export interface ResumoReceberResponse {
  totalAberto: string
  totalVencido: string
  totalVenceHoje: string
  totalVenceSemana: string
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

  cancelar: (id: string) =>
    api.post<TituloResponse>(`/titulos/${id}/cancelar`).then((r) => r.data),

  resumoPagar: () =>
    api.get<ResumoPagarResponse>('/financeiro/resumo-pagar').then((r) => r.data),

  resumoReceber: () =>
    api.get<ResumoReceberResponse>('/financeiro/resumo-receber').then((r) => r.data),

  fluxoCaixa: (dias = 30) =>
    api.get<FluxoCaixaResponse>('/financeiro/fluxo-caixa', { params: { dias } }).then((r) => r.data),
}
