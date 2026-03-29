import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil, X, Check } from 'lucide-react'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Badge } from '@/shared/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/Card'
import { Modal } from '@/shared/components/ui/Modal'
import { useCliente, useAtualizarCliente, useInativarCliente } from '../hooks/useClientes'

// ── Modal: confirmar inativação ───────────────────────────────────────────────

function ConfirmarInativacaoModal({
  clienteId,
  nome,
  open,
  onClose,
}: {
  clienteId: string
  nome: string
  open: boolean
  onClose: () => void
}) {
  const navigate = useNavigate()
  const { mutate: inativar, isPending } = useInativarCliente()

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Inativar cliente"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            loading={isPending}
            onClick={() =>
              inativar(clienteId, {
                onSuccess: () => navigate('/clientes'),
              })
            }
          >
            Inativar
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        <p className="text-sm text-gray-700">
          Deseja inativar o cliente <span className="font-semibold">{nome}</span>?
        </p>
        <p className="text-xs text-muted-foreground">
          O cliente não será excluído — apenas marcado como inativo e não aparecerá nas listagens padrão.
        </p>
      </div>
    </Modal>
  )
}

// ── Card: dados do cliente com edição inline ──────────────────────────────────

function DadosCard({ clienteId }: { clienteId: string }) {
  const { data: cliente } = useCliente(clienteId)
  const { mutate: atualizar, isPending } = useAtualizarCliente()

  const [editando, setEditando] = useState(false)
  const [razaoSocial, setRazaoSocial] = useState('')
  const [nomeFantasia, setNomeFantasia] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function iniciarEdicao() {
    if (!cliente) return
    setRazaoSocial(cliente.razaoSocial)
    setNomeFantasia(cliente.nomeFantasia ?? '')
    setEmail(cliente.email ?? '')
    setTelefone(cliente.telefone ?? '')
    setErrors({})
    setEditando(true)
  }

  function cancelarEdicao() {
    setEditando(false)
    setErrors({})
  }

  function handleSalvar() {
    const erros: Record<string, string> = {}
    if (!razaoSocial.trim()) erros.razaoSocial = 'Campo obrigatório'
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) erros.email = 'E-mail inválido'
    setErrors(erros)
    if (Object.keys(erros).length > 0) return

    atualizar(
      {
        id: clienteId,
        req: {
          razaoSocial: razaoSocial.trim(),
          nomeFantasia: nomeFantasia.trim() || undefined,
          email: email.trim() || undefined,
          telefone: telefone.trim() || undefined,
        },
      },
      { onSuccess: () => setEditando(false) },
    )
  }

  if (!cliente) return null

  const labelRazaoSocial = cliente.tipoPessoa === 'PJ' ? 'Razão Social' : 'Nome'
  const labelNomeFantasia = cliente.tipoPessoa === 'PJ' ? 'Nome Fantasia' : 'Apelido'

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Dados do Cliente</CardTitle>
        {!editando && (
          <Button variant="ghost" size="sm" onClick={iniciarEdicao}>
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Campos somente-leitura */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Tipo</p>
            <Badge variant="outline" className="mt-0.5">
              {cliente.tipoPessoa === 'PF'
                ? 'Pessoa Física'
                : cliente.tipoPessoa === 'PJ'
                ? 'Pessoa Jurídica'
                : 'Anônimo'}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
            <Badge
              variant={cliente.ativo ? 'success' : 'destructive'}
              className="mt-0.5"
            >
              {cliente.ativo ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
          {cliente.cnpjCpf && (
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {cliente.tipoPessoa === 'PF' ? 'CPF' : 'CNPJ'}
              </p>
              <p className="font-mono font-medium">{cliente.cnpjCpf}</p>
            </div>
          )}
        </div>

        <div className="border-t border-border pt-3 space-y-3">
          {editando ? (
            <>
              <Input
                label={`${labelRazaoSocial} *`}
                value={razaoSocial}
                onChange={(e) => setRazaoSocial(e.target.value)}
                error={errors.razaoSocial}
              />
              <Input
                label={labelNomeFantasia}
                value={nomeFantasia}
                onChange={(e) => setNomeFantasia(e.target.value)}
              />
              <Input
                label="Telefone"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
              />
              <Input
                label="E-mail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
              />
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={handleSalvar} loading={isPending}>
                  <Check className="mr-1 h-3.5 w-3.5" />
                  Salvar
                </Button>
                <Button size="sm" variant="outline" onClick={cancelarEdicao} disabled={isPending}>
                  <X className="mr-1 h-3.5 w-3.5" />
                  Cancelar
                </Button>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  {labelRazaoSocial}
                </p>
                <p className="font-medium text-sm">{cliente.razaoSocial}</p>
              </div>
              {cliente.nomeFantasia && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    {labelNomeFantasia}
                  </p>
                  <p className="text-sm">{cliente.nomeFantasia}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Telefone</p>
                  <p className="text-sm">{cliente.telefone ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">E-mail</p>
                  <p className="text-sm">{cliente.email ?? '—'}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Card: situação financeira ─────────────────────────────────────────────────

function FinanceiroCard({ clienteId }: { clienteId: string }) {
  const { data: cliente } = useCliente(clienteId)
  if (!cliente) return null

  const statusMap = {
    REGULAR:   { variant: 'success' as const,      label: 'Regular' },
    ALERTA:    { variant: 'default' as const,       label: 'Alerta' },
    BLOQUEADO: { variant: 'destructive' as const,   label: 'Bloqueado' },
  }
  const status = statusMap[cliente.statusInad]

  const limiteCred = parseFloat(cliente.limiteCred)
  const saldoDevedor = parseFloat(cliente.saldoDevedor)
  const limiteDisponivel = limiteCred - saldoDevedor
  const percentualUsado = limiteCred > 0 ? (saldoDevedor / limiteCred) * 100 : 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Situação Financeira</CardTitle>
        <Badge variant={status.variant}>{status.label}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Limite de Crédito</p>
            <p className="font-medium">
              {limiteCred.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Saldo Devedor</p>
            <p className={`font-medium ${saldoDevedor > 0 ? 'text-destructive' : 'text-gray-900'}`}>
              {saldoDevedor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Limite Disponível</p>
            <p className={`font-medium ${limiteDisponivel < 0 ? 'text-destructive' : 'text-success'}`}>
              {limiteDisponivel.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Utilização</p>
            <p className="font-medium">{percentualUsado.toFixed(1)}%</p>
          </div>
        </div>

        {limiteCred > 0 && (
          <div className="space-y-1">
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full transition-all ${
                  percentualUsado >= 100
                    ? 'bg-destructive'
                    : percentualUsado >= 80
                    ? 'bg-amber-500'
                    : 'bg-success'
                }`}
                style={{ width: `${Math.min(percentualUsado, 100)}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function ClienteDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [inativacaoAberta, setInativacaoAberta] = useState(false)

  const { data: cliente, isLoading } = useCliente(id ?? '')

  if (!id) return null

  return (
    <div>
      <PageHeader
        title={isLoading ? 'Carregando…' : (cliente?.razaoSocial ?? 'Cliente')}
        subtitle={
          cliente?.nomeFantasia
            ? `Nome Fantasia: ${cliente.nomeFantasia}`
            : cliente?.cnpjCpf
            ? cliente.cnpjCpf
            : undefined
        }
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/clientes')}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Voltar
            </Button>
            {cliente?.ativo && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setInativacaoAberta(true)}
              >
                Inativar cliente
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <DadosCard clienteId={id} />
        <FinanceiroCard clienteId={id} />
      </div>

      {cliente && (
        <ConfirmarInativacaoModal
          clienteId={id}
          nome={cliente.razaoSocial}
          open={inativacaoAberta}
          onClose={() => setInativacaoAberta(false)}
        />
      )}
    </div>
  )
}
