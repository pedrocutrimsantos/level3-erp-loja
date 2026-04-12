import { api } from './client'

export interface ParcelaPendenteDto {
  parcelaId: string
  tituloId: string
  tituloNumero: string
  clienteId: string | null
  clienteNome: string | null
  telefone: string | null
  valor: number
  dataVencimento: string
  diasAtraso: number
  temTelefone: boolean
}

export interface ResultadoDisparoDto {
  enviados: number
  semFone: number
  erros: number
  detalhes: string[]
}

export interface CobrancaLogDto {
  id: string
  parcelaId: string
  tituloId: string
  clienteId: string | null
  telefone: string
  mensagem: string
  reguaDia: number
  status: string
  erroDetalhe: string | null
  enviadoEm: string
}

export const cobrancaApi = {
  pendentes: () =>
    api.get<ParcelaPendenteDto[]>('/cobranca/pendentes').then((r) => r.data),

  dispararLote: () =>
    api.post<ResultadoDisparoDto>('/cobranca/disparar-lote').then((r) => r.data),

  dispararUnica: (parcelaId: string) =>
    api.post<ResultadoDisparoDto>(`/cobranca/disparar/${parcelaId}`).then((r) => r.data),

  historico: (limit = 100) =>
    api.get<CobrancaLogDto[]>(`/cobranca/historico?limit=${limit}`).then((r) => r.data),

  historicoParcela: (parcelaId: string) =>
    api.get<CobrancaLogDto[]>(`/cobranca/historico/${parcelaId}`).then((r) => r.data),
}
