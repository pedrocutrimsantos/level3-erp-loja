import { api } from './client'

export interface EmpresaResponse {
  id: string | null
  cnpj: string
  razaoSocial: string
  nomeFantasia: string | null
  ie: string | null
  logradouro: string
  numero: string
  bairro: string
  cidade: string
  uf: string
  cep: string
  regimeTributario: string
}

export interface EmpresaRequest {
  cnpj: string
  razaoSocial: string
  nomeFantasia?: string
  ie?: string
  logradouro: string
  numero: string
  bairro: string
  cidade: string
  uf: string
  cep: string
  regimeTributario: string
}

export const empresaApi = {
  get: () =>
    api.get<EmpresaResponse>('/empresa').then((r) => r.data),

  salvar: (dto: EmpresaRequest) =>
    api.put<EmpresaResponse>('/empresa', dto).then((r) => r.data),
}
