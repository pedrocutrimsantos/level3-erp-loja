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

  solicitarReset: (email: string) =>
    api.post<{ token: string }>('/auth/solicitar-reset', { email }).then((r) => r.data),

  confirmarReset: (token: string, novaSenha: string) =>
    api.post<{ ok: boolean }>('/auth/confirmar-reset', { token, novaSenha }).then((r) => r.data),

  alterarSenha: (senhaAtual: string, novaSenha: string) =>
    api.post<{ ok: boolean }>('/auth/alterar-senha', { senhaAtual, novaSenha }).then((r) => r.data),

  // ── Primeiro acesso ─────────────────────────────────────────────────────────

  primeiroAcessoSolicitar: (email: string, canal = 'WHATSAPP') =>
    api.post<{ mensagem: string }>('/auth/primeiro-acesso/solicitar', { email, canal }).then((r) => r.data),

  primeiroAcessoValidarToken: (email: string, token: string) =>
    api.post<{ valido: boolean }>('/auth/primeiro-acesso/validar-token', { email, token }).then((r) => r.data),

  primeiroAcessoDefinirSenha: (email: string, token: string, novaSenha: string, confirmacaoSenha: string) =>
    api.post<{ ok: boolean; mensagem: string }>('/auth/primeiro-acesso/definir-senha', {
      email, token, novaSenha, confirmacaoSenha,
    }).then((r) => r.data),

  primeiroAcessoReenviar: (email: string, canal = 'WHATSAPP') =>
    api.post<{ mensagem: string }>('/auth/primeiro-acesso/reenviar', { email, canal }).then((r) => r.data),
}
