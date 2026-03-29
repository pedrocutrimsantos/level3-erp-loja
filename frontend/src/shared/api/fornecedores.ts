import { api } from './client'

export interface FornecedorResponse {
  id: string
  tipoPessoa: 'PF' | 'PJ'
  cnpjCpf: string
  razaoSocial: string
  nomeFantasia: string | null
  email: string | null
  telefone: string | null
  uf: string | null
  cidade: string | null
  ativo: boolean
}

export interface CriarFornecedorRequest {
  tipoPessoa: 'PF' | 'PJ'
  cnpjCpf: string
  razaoSocial: string
  nomeFantasia?: string
  inscricaoEstadual?: string
  email?: string
  telefone?: string
  uf?: string
  cep?: string
  logradouro?: string
  numero?: string
  bairro?: string
  cidade?: string
}

export const fornecedoresApi = {
  listar: (apenasAtivos = true) =>
    api.get<FornecedorResponse[]>('/fornecedores', { params: { ativo: apenasAtivos } }).then((r) => r.data),

  buscar: (id: string) =>
    api.get<FornecedorResponse>(`/fornecedores/${id}`).then((r) => r.data),

  criar: (req: CriarFornecedorRequest) =>
    api.post<FornecedorResponse>('/fornecedores', req).then((r) => r.data),
}
