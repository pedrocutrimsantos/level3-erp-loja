import { api } from './client'

export interface UsuarioResponse {
  id: string
  nome: string
  email: string
  perfilCodigo: string
  perfilDescricao: string
  vendedor: boolean
  ativo: boolean
  ultimoAcesso: string | null
  createdAt: string
}

export interface PerfilResponse {
  id: string
  codigo: string
  descricao: string
}

export interface CriarUsuarioDto {
  nome: string
  email: string
  senha: string
  perfilCodigo: string
  vendedor?: boolean
}

export interface AtualizarUsuarioDto {
  nome?: string
  email?: string
  senha?: string
  perfilCodigo?: string
  vendedor?: boolean
}

export const usuariosApi = {
  listar: () =>
    api.get<UsuarioResponse[]>('/usuarios').then((r) => r.data),

  listarPerfis: () =>
    api.get<PerfilResponse[]>('/perfis').then((r) => r.data),

  criar: (dto: CriarUsuarioDto) =>
    api.post<UsuarioResponse>('/usuarios', dto).then((r) => r.data),

  atualizar: (id: string, dto: AtualizarUsuarioDto) =>
    api.put<UsuarioResponse>(`/usuarios/${id}`, dto).then((r) => r.data),

  ativar: (id: string) =>
    api.patch<UsuarioResponse>(`/usuarios/${id}/ativar`).then((r) => r.data),

  desativar: (id: string) =>
    api.patch<UsuarioResponse>(`/usuarios/${id}/desativar`).then((r) => r.data),
}
