import axios from 'axios'

const BASE = '/api/v1'

export interface TenantResponse {
  id: string
  slug: string
  razaoSocial: string
  cnpj: string
  schemaName: string
  ativo: boolean
  createdAt: string
}

export interface CriarTenantDto {
  slug: string
  razaoSocial: string
  cnpj: string
  adminEmail: string
  adminNome: string
  adminSenha: string
}

export interface CriarTenantResponse {
  tenantId: string
  slug: string
  schemaName: string
  adminUserId: string
  mensagem: string
}

function client(key: string) {
  return axios.create({
    baseURL: BASE,
    headers: { 'X-Admin-Key': key, 'Content-Type': 'application/json' },
  })
}

export const adminApi = {
  listarTenants: (key: string) =>
    client(key).get<TenantResponse[]>('/admin/tenants').then((r) => r.data),

  criarTenant: (key: string, dto: CriarTenantDto) =>
    client(key).post<CriarTenantResponse>('/admin/tenants', dto).then((r) => r.data),

  ativarTenant: (key: string, id: string) =>
    client(key).patch(`/admin/tenants/${id}/ativar`).then((r) => r.data),

  desativarTenant: (key: string, id: string) =>
    client(key).patch(`/admin/tenants/${id}/desativar`).then((r) => r.data),
}
