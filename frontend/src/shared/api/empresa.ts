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
  // ── Fiscal ────────────────────────────────────────────────────────────────
  cfopPadrao: string
  codigoMunicipioIbge: string | null
  serieNfe: string
  ambienteNfe: 'HOMOLOGACAO' | 'PRODUCAO'
  nfeConfigurada: boolean
  // ── Certificado A1 ────────────────────────────────────────────────────────
  certificadoConfigurado: boolean
  certificadoNome: string | null      // Common Name do titular
  certificadoVencimento: string | null  // ISO-8601
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
  // ── Fiscal ────────────────────────────────────────────────────────────────
  cfopPadrao?: string
  codigoMunicipioIbge?: string
  serieNfe?: string
  ambienteNfe?: string
}

export interface CertificadoInfoResponse {
  nome: string
  vencimento: string
}

export const empresaApi = {
  get: () =>
    api.get<EmpresaResponse>('/empresa').then((r) => r.data),

  salvar: (dto: EmpresaRequest) =>
    api.put<EmpresaResponse>('/empresa', dto).then((r) => r.data),

  uploadCertificado: (certificadoBase64: string, senha: string) =>
    api.post<CertificadoInfoResponse>('/empresa/certificado', { certificadoBase64, senha })
      .then((r) => r.data),

  removerCertificado: () =>
    api.delete('/empresa/certificado'),
}
