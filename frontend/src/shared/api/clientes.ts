import { api } from './client'

export interface ClienteResponse {
  id: string
  tipoPessoa: 'PF' | 'PJ' | 'ANONIMO'
  cnpjCpf: string | null
  razaoSocial: string
  nomeFantasia: string | null
  email: string | null
  telefone: string | null
  limiteCred: string
  saldoDevedor: string
  statusInad: 'REGULAR' | 'ALERTA' | 'BLOQUEADO'
  ativo: boolean
}

export interface CriarClienteRequest {
  tipoPessoa: 'PF' | 'PJ'
  cnpjCpf?: string
  razaoSocial: string
  nomeFantasia?: string
  email?: string
  telefone?: string
}

export interface AtualizarClienteRequest {
  razaoSocial: string
  nomeFantasia?: string
  email?: string
  telefone?: string
}

export const clientesApi = {
  listar: (apenasAtivos = true) =>
    api.get<ClienteResponse[]>('/clientes', { params: { ativo: apenasAtivos } }).then((r) => r.data),

  buscar: (id: string) =>
    api.get<ClienteResponse>(`/clientes/${id}`).then((r) => r.data),

  criar: (req: CriarClienteRequest) =>
    api.post<ClienteResponse>('/clientes', req).then((r) => r.data),

  atualizar: (id: string, req: AtualizarClienteRequest) =>
    api.put<ClienteResponse>(`/clientes/${id}`, req).then((r) => r.data),

  inativar: (id: string) =>
    api.delete<ClienteResponse>(`/clientes/${id}`).then((r) => r.data),
}
