import { api } from './client'

export interface LoginRequest {
  email: string
  senha: string
}

export interface LoginResponse {
  token:      string
  userId:     string
  nome:       string
  perfil:     string
  tenantSlug: string
}

export interface MeResponse {
  userId: string
  nome:   string
  email:  string
  perfil: string
  tenant: string
}

export const authApi = {
  login: (data: LoginRequest) =>
    api.post<LoginResponse>('/auth/login', data).then((r) => r.data),

  me: () =>
    api.get<MeResponse>('/auth/me').then((r) => r.data),
}
