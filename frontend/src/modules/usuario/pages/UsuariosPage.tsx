import React, { useState } from 'react'
import { Users2 } from 'lucide-react'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Button } from '@/shared/components/ui/Button'
import { Badge } from '@/shared/components/ui/Badge'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import { Input } from '@/shared/components/ui/Input'
import { Modal } from '@/shared/components/ui/Modal'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/shared/components/ui/Table'
import { useAuthStore } from '@/shared/store/authStore'
import { usePagination } from '@/shared/hooks/usePagination'
import { Pagination } from '@/shared/components/ui/Pagination'
import {
  useUsuarios,
  usePerfis,
  useCriarUsuario,
  useAtualizarUsuario,
  useAtivarUsuario,
  useDesativarUsuario,
  useReenviarPrimeiroAcesso,
} from '../hooks/useUsuarios'
import type { UsuarioResponse } from '@/shared/api/usuarios'

// ── Skeleton ──────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-2 p-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 rounded bg-gray-100" />
      ))}
    </div>
  )
}

// ── Modal de criação/edição ───────────────────────────────────────────────────

interface UsuarioFormValues {
  nome: string
  email: string
  telefone: string
  senha: string        // só usado na edição (opcional)
  perfilCodigo: string
  vendedor: boolean
}

interface UsuarioModalProps {
  open: boolean
  onClose: () => void
  editando: UsuarioResponse | null
}

function UsuarioModal({ open, onClose, editando }: UsuarioModalProps) {
  const { data: perfis = [] } = usePerfis()
  const criar = useCriarUsuario()
  const atualizar = useAtualizarUsuario()

  const [form, setForm] = useState<UsuarioFormValues>({
    nome: editando?.nome ?? '',
    email: editando?.email ?? '',
    telefone: editando?.telefone ?? '',
    senha: '',
    perfilCodigo: editando?.perfilCodigo ?? (perfis[0]?.codigo ?? ''),
    vendedor: editando?.vendedor ?? false,
  })

  // Sincroniza form quando o editando muda (modal reabre para outro usuário)
  React.useEffect(() => {
    setForm({
      nome: editando?.nome ?? '',
      email: editando?.email ?? '',
      telefone: editando?.telefone ?? '',
      senha: '',
      perfilCodigo: editando?.perfilCodigo ?? (perfis[0]?.codigo ?? ''),
      vendedor: editando?.vendedor ?? false,
    })
  }, [editando, open]) // eslint-disable-line react-hooks/exhaustive-deps

  const isPending = criar.isPending || atualizar.isPending

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (editando) {
      atualizar.mutate(
        {
          id: editando.id,
          dto: {
            nome: form.nome || undefined,
            email: form.email || undefined,
            senha: form.senha || undefined,
            perfilCodigo: form.perfilCodigo || undefined,
            vendedor: form.vendedor,
            telefone: form.telefone || undefined,
          },
        },
        { onSuccess: onClose },
      )
    } else {
      criar.mutate(
        {
          nome: form.nome,
          email: form.email,
          telefone: form.telefone,
          perfilCodigo: form.perfilCodigo,
          vendedor: form.vendedor,
        },
        { onSuccess: onClose },
      )
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editando ? 'Editar usuário' : 'Novo usuário'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button form="usuario-form" type="submit" disabled={isPending}>
            {isPending ? 'Salvando...' : editando ? 'Salvar' : 'Criar'}
          </Button>
        </>
      }
    >
      <form id="usuario-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Nome <span className="text-destructive">*</span>
          </label>
          <Input
            required
            value={form.nome}
            onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            placeholder="Nome completo"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            E-mail <span className="text-destructive">*</span>
          </label>
          <Input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="usuario@empresa.com"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Telefone / WhatsApp {!editando && <span className="text-destructive">*</span>}
          </label>
          <Input
            required={!editando}
            type="tel"
            value={form.telefone}
            onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
            placeholder="(98) 99999-0000"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {editando
              ? 'Usado para envio do código de recuperação de senha'
              : 'Obrigatório — o código de primeiro acesso será enviado para este número'}
          </p>
        </div>

        {editando && (
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Nova senha
            </label>
            <Input
              type="password"
              value={form.senha}
              onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
              placeholder="Deixe em branco para manter a senha atual"
              minLength={form.senha.length > 0 ? 8 : undefined}
            />
          </div>
        )}

        {!editando && (
          <p className="rounded-lg bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
            O usuário receberá um código de primeiro acesso via WhatsApp para definir a própria senha.
          </p>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Perfil <span className="text-destructive">*</span>
          </label>
          <select
            required
            value={form.perfilCodigo}
            onChange={(e) =>
              setForm((f) => ({ ...f, perfilCodigo: e.target.value }))
            }
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Selecione um perfil</option>
            {perfis.map((p) => (
              <option key={p.id} value={p.codigo}>
                {p.codigo} — {p.descricao}
              </option>
            ))}
          </select>
        </div>

        <label className="flex cursor-pointer items-center gap-2 select-none">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            checked={form.vendedor}
            onChange={(e) =>
              setForm((f) => ({ ...f, vendedor: e.target.checked }))
            }
          />
          <span className="text-sm text-foreground">É vendedor</span>
        </label>
      </form>
    </Modal>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function UsuariosPage() {
  const { data: usuarios, isLoading, isError } = useUsuarios()
  const ativar = useAtivarUsuario()
  const desativar = useDesativarUsuario()
  const reenviar = useReenviarPrimeiroAcesso()
  const userId = useAuthStore((s) => s.userId)

  const { paginatedItems: usuariosPaginados, page, setPage, perPage, setPerPage, totalPages, totalItems } = usePagination(usuarios ?? [])

  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<UsuarioResponse | null>(null)

  function abrirCriar() {
    setEditando(null)
    setModalAberto(true)
  }

  function abrirEditar(u: UsuarioResponse) {
    setEditando(u)
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setEditando(null)
  }

  return (
    <div>
      <PageHeader
        title="Usuários"
        subtitle="Gerencie os usuários do sistema"
        actions={
          <Button onClick={abrirCriar}>+ Novo usuário</Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton />
          ) : isError ? (
            <EmptyState
              icon={<Users2 className="h-6 w-6" />}
              title="Erro ao carregar usuários"
              description="Não foi possível buscar a lista. Tente novamente."
              className="py-16"
            />
          ) : !usuarios || usuarios.length === 0 ? (
            <EmptyState
              icon={<Users2 className="h-6 w-6" />}
              title="Nenhum usuário cadastrado"
              description="Crie o primeiro usuário do sistema."
              action={
                <Button size="sm" onClick={abrirCriar}>
                  + Novo usuário
                </Button>
              }
              className="py-16"
            />
          ) : (
            <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Último acesso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuariosPaginados.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium text-sm">{u.nome}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{u.perfilCodigo}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {u.vendedor ? (
                        <Badge variant="default">Sim</Badge>
                      ) : (
                        <span className="text-muted-foreground">Não</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {u.primeiroAcessoPendente ? (
                        <Badge variant="outline">Aguardando 1º acesso</Badge>
                      ) : u.ativo ? (
                        <Badge variant="success">Ativo</Badge>
                      ) : (
                        <Badge variant="destructive">Inativo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.ultimoAcesso
                        ? new Date(u.ultimoAcesso).toLocaleString('pt-BR')
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => abrirEditar(u)}
                        >
                          Editar
                        </Button>
                        {u.primeiroAcessoPendente && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => reenviar.mutate(u.email)}
                            disabled={reenviar.isPending}
                          >
                            Reenviar código
                          </Button>
                        )}
                        {u.id !== userId && !u.primeiroAcessoPendente && (
                          u.ativo ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => desativar.mutate(u.id)}
                              disabled={desativar.isPending}
                            >
                              Desativar
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => ativar.mutate(u.id)}
                              disabled={ativar.isPending}
                            >
                              Ativar
                            </Button>
                          )
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="border-t border-border px-4 dark:border-[#243040]">
              <Pagination page={page} totalPages={totalPages} totalItems={totalItems} perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage} />
            </div>
            </>
          )}
        </CardContent>
      </Card>

      <UsuarioModal
        open={modalAberto}
        onClose={fecharModal}
        editando={editando}
      />
    </div>
  )
}
