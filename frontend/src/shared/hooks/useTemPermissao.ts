import { useAuthStore } from '@/shared/store/authStore'
import { perfilTemPermissao } from '@/shared/utils/permissions'

/**
 * Retorna `true` se o usuário logado tem a permissão informada.
 *
 * Uso:
 *   const podeEmitir = useTemPermissao(Perms.FIS_EMITIR_NF)
 *   const podeCancelar = useTemPermissao(Perms.VEN_CANCELAR)
 *
 * Reativo: re-renderiza automaticamente se o perfil mudar (re-login).
 */
export function useTemPermissao(permissao: string): boolean {
  const perfil = useAuthStore((s) => s.perfil)
  return perfilTemPermissao(perfil, permissao)
}
