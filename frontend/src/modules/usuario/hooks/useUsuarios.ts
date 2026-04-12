import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  usuariosApi,
  type CriarUsuarioDto,
  type AtualizarUsuarioDto,
} from '@/shared/api/usuarios'
import { authApi } from '@/shared/api/auth'
import { useToast } from '@/shared/store/toastStore'
import { erroMsg } from '@/shared/utils/erroMsg'

export function useUsuarios() {
  return useQuery({
    queryKey: ['usuarios'],
    queryFn: () => usuariosApi.listar(),
  })
}

export function usePerfis() {
  return useQuery({
    queryKey: ['perfis'],
    queryFn: () => usuariosApi.listarPerfis(),
  })
}

export function useCriarUsuario() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (dto: CriarUsuarioDto) => usuariosApi.criar(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      toast.sucesso('Usuário criado com sucesso')
    },
    onError: (err: unknown) => {
      toast.erro(erroMsg(err, 'Erro ao criar usuário'))
    },
  })
}

export function useAtualizarUsuario() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: AtualizarUsuarioDto }) =>
      usuariosApi.atualizar(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      toast.sucesso('Usuário atualizado com sucesso')
    },
    onError: (err: unknown) => {
      toast.erro(erroMsg(err, 'Erro ao atualizar usuário'))
    },
  })
}

export function useAtivarUsuario() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (id: string) => usuariosApi.ativar(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      toast.sucesso('Usuário ativado')
    },
    onError: (err: unknown) => {
      toast.erro(erroMsg(err, 'Erro ao ativar usuário'))
    },
  })
}

export function useDesativarUsuario() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (id: string) => usuariosApi.desativar(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      toast.sucesso('Usuário desativado')
    },
    onError: (err: unknown) => {
      toast.erro(erroMsg(err, 'Erro ao desativar usuário'))
    },
  })
}

export function useReenviarPrimeiroAcesso() {
  const toast = useToast()
  return useMutation({
    mutationFn: (email: string) => authApi.primeiroAcessoReenviar(email),
    onSuccess: () => {
      toast.sucesso('Código de primeiro acesso reenviado via WhatsApp')
    },
    onError: (err: unknown) => {
      toast.erro(erroMsg(err, 'Não foi possível reenviar o código'))
    },
  })
}
