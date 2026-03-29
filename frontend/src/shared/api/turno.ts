import { api } from './client'

export interface SangriaResponse {
  id: string
  descricao: string
  valor: string
  createdAt: string
}

export interface TurnoCaixaResponse {
  id: string
  data: string
  status: 'ABERTO' | 'FECHADO'
  valorAbertura: string
  valorFechamento: string | null
  observacao: string | null
  totalEntradas: string
  totalSangrias: string
  saldoEsperado: string
  diferenca: string | null   // positivo = sobra, negativo = falta
  sangrias: SangriaResponse[]
  createdAt: string
}

export interface AbrirCaixaRequest {
  valorAbertura?: number
}

export interface FecharCaixaRequest {
  valorFechamento: number
  observacao?: string
}

export interface RegistrarSangriaRequest {
  descricao: string
  valor: number
}

export const turnoApi = {
  buscar: (data?: string) =>
    api
      .get<TurnoCaixaResponse>('/financeiro/turno', { params: data ? { data } : undefined })
      .then((r) => r.data)
      .catch((e) => {
        if (e?.response?.status === 204) return null
        throw e
      }),

  abrir: (req: AbrirCaixaRequest) =>
    api.post<TurnoCaixaResponse>('/financeiro/turno/abrir', req).then((r) => r.data),

  fechar: (req: FecharCaixaRequest) =>
    api.post<TurnoCaixaResponse>('/financeiro/turno/fechar', req).then((r) => r.data),

  sangria: (req: RegistrarSangriaRequest) =>
    api.post<TurnoCaixaResponse>('/financeiro/turno/sangria', req).then((r) => r.data),

  reabrir: () =>
    api.post<TurnoCaixaResponse>('/financeiro/turno/reabrir').then((r) => r.data),
}
