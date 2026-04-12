import React, { useState, useMemo } from 'react'
import { AlertTriangle, Ban, CreditCard } from 'lucide-react'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import { Modal } from '@/shared/components/ui/Modal'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/shared/components/ui/Table'
import { useTitulos, useBaixaTitulo, useCancelarTitulo, useResumoReceber } from '../hooks/useTitulos'
import type { TituloResponse } from '@/shared/api/titulos'

// ── Constantes ────────────────────────────────────────────────────────────────

const FORMAS_BAIXA = ['DINHEIRO', 'PIX', 'CARTAO_DEBITO', 'CARTAO_CREDITO', 'BOLETO', 'CHEQUE'] as const

const STATUS_LABEL: Record<string, string> = {
  ABERTO:       'Aberto',
  PAGO_PARCIAL: 'Pago Parcial',
  PAGO:         'Recebido',
  VENCIDO:      'Vencido',
  CANCELADO:    'Cancelado',
  NEGOCIADO:    'Negociado',
}

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'destructive' | 'warning' | 'outline'> = {
  ABERTO:       'default',
  PAGO_PARCIAL: 'warning',
  PAGO:         'success',
  VENCIDO:      'destructive',
  CANCELADO:    'outline',
  NEGOCIADO:    'warning',
}

const FORMA_LABEL: Record<string, string> = {
  DINHEIRO:       'Dinheiro',
  CARTAO_DEBITO:  'Cartão Débito',
  CARTAO_CREDITO: 'Cartão Crédito',
  PIX:            'PIX',
  BOLETO:         'Boleto',
  CHEQUE:         'Cheque',
  FIADO:          'Fiado',
}

const ORIGEM_LABEL: Record<string, string> = {
  FIADO:          'Venda Fiado',
  CARTAO_CREDITO: 'Cartão Crédito',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(valor: string) {
  return parseFloat(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtData(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR')
}

function isVencido(titulo: TituloResponse) {
  return (titulo.status === 'ABERTO' || titulo.status === 'PAGO_PARCIAL') &&
    titulo.dataVencimento != null &&
    new Date(titulo.dataVencimento) < new Date(new Date().toDateString())
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  valor,
  cor,
  loading,
}: {
  label: string
  valor: string
  cor: 'red' | 'amber' | 'blue' | 'gray'
  loading: boolean
}) {
  const colorMap = {
    red:   'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
    amber: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800',
    blue:  'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
    gray:  'bg-card border-border',
  }
  const textMap = {
    red:   'text-red-700 dark:text-red-400',
    amber: 'text-amber-700 dark:text-amber-400',
    blue:  'text-blue-700 dark:text-blue-400',
    gray:  'text-foreground',
  }

  return (
    <div className={`rounded-xl border px-4 py-4 ${colorMap[cor]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
      {loading ? (
        <div className="h-7 w-28 animate-pulse rounded bg-muted" />
      ) : (
        <p className={`text-xl font-black tabular-nums ${textMap[cor]}`}>{valor}</p>
      )}
    </div>
  )
}

// ── Modal: Registrar Recebimento ──────────────────────────────────────────────

function ReceberModal({
  titulo,
  onClose,
}: {
  titulo: TituloResponse | null
  onClose: () => void
}) {
  const { mutate: baixar, isPending } = useBaixaTitulo()
  const [forma,    setForma]    = useState('DINHEIRO')
  const [dataPgto, setDataPgto] = useState('')
  const [erro,     setErro]     = useState<string | null>(null)

  function handleConfirmar() {
    if (!titulo) return
    setErro(null)
    baixar(
      { id: titulo.id, req: { formaPagamento: forma, dataPagamento: dataPgto || undefined } },
      {
        onSuccess: () => { setForma('DINHEIRO'); setDataPgto(''); setErro(null); onClose() },
        onError: (err: unknown) => {
          setErro(
            (err as any)?.response?.data?.detalhes ??
            (err as any)?.response?.data?.erro ??
            'Erro ao registrar recebimento.'
          )
        },
      },
    )
  }

  function handleFechar() { setForma('DINHEIRO'); setDataPgto(''); setErro(null); onClose() }

  if (!titulo) return null

  const restante = fmt(titulo.valorRestante)
  const parcInfo = titulo.numeroParcelas > 1
    ? ` · Parcela ${titulo.parcelasPagas + 1}/${titulo.numeroParcelas}`
    : ''

  return (
    <Modal
      open={!!titulo}
      onClose={handleFechar}
      title="Registrar Recebimento"
      footer={
        <>
          <Button variant="outline" onClick={handleFechar} disabled={isPending}>Cancelar</Button>
          <Button onClick={handleConfirmar} loading={isPending}>Confirmar Recebimento</Button>
        </>
      }
    >
      <div className="space-y-4 text-sm">
        <div className="rounded-md bg-muted/40 px-4 py-3 space-y-1">
          <p className="font-semibold text-foreground">{titulo.numero}{parcInfo}</p>
          {titulo.clienteNome && <p className="text-muted-foreground">{titulo.clienteNome}</p>}
          {titulo.vendaNumero && (
            <p className="text-xs text-muted-foreground">Venda {titulo.vendaNumero}</p>
          )}
          <p className="text-lg font-bold text-foreground">{restante}</p>
          <p className="text-xs text-muted-foreground">Vencimento: {fmtData(titulo.dataVencimento)}</p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-medium text-foreground">Forma de Recebimento *</label>
          <select
            value={forma}
            onChange={(e) => setForma(e.target.value)}
            className="w-full rounded-md border border-border bg-input text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {FORMAS_BAIXA.map((f) => (
              <option key={f} value={f}>{FORMA_LABEL[f] ?? f}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-medium text-foreground">
            Data do Recebimento <span className="text-muted-foreground">(vazio = hoje)</span>
          </label>
          <input
            type="date"
            value={dataPgto}
            onChange={(e) => setDataPgto(e.target.value)}
            className="w-full rounded-md border border-border bg-input text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {erro && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</p>}
      </div>
    </Modal>
  )
}

// ── Modal: Cancelar ───────────────────────────────────────────────────────────

function CancelarModal({
  titulo,
  onClose,
}: {
  titulo: TituloResponse | null
  onClose: () => void
}) {
  const { mutate: cancelar, isPending } = useCancelarTitulo()
  const [erro, setErro] = useState<string | null>(null)

  function handleConfirmar() {
    if (!titulo) return
    cancelar(titulo.id, {
      onSuccess: () => { setErro(null); onClose() },
      onError: (err: unknown) => {
        setErro(
          (err as any)?.response?.data?.detalhes ??
          (err as any)?.response?.data?.erro ??
          'Erro ao cancelar título.'
        )
      },
    })
  }

  if (!titulo) return null

  return (
    <Modal
      open={!!titulo}
      onClose={onClose}
      title="Cancelar Recebível"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Voltar</Button>
          <Button variant="destructive" onClick={handleConfirmar} loading={isPending}>
            Confirmar Cancelamento
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <p className="text-foreground">
          Deseja cancelar o título <span className="font-semibold">{titulo.numero}</span>?
        </p>
        {titulo.clienteNome && <p className="text-muted-foreground">{titulo.clienteNome}</p>}
        <p className="font-semibold text-foreground">{fmt(titulo.valorOriginal)}</p>
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Esta ação não pode ser desfeita. Todas as parcelas em aberto serão canceladas.
        </p>
        {erro && <p className="rounded-md bg-destructive/10 px-3 py-2 text-destructive">{erro}</p>}
      </div>
    </Modal>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

type TabStatus = 'ABERTO' | 'TODOS'

export default function ContasReceberPage() {
  const [tabStatus,          setTabStatus]          = useState<TabStatus>('ABERTO')
  const [tituloParaReceber,  setTituloParaReceber]  = useState<TituloResponse | null>(null)
  const [tituloParaCancelar, setTituloParaCancelar] = useState<TituloResponse | null>(null)

  const { data: resumo, isLoading: loadingResumo } = useResumoReceber()
  const { data: titulos, isLoading, isError } = useTitulos({
    tipo:   'RECEBER',
    status: tabStatus === 'ABERTO' ? 'ABERTO' : undefined,
    limit:  500,
  })

  const titulosFiltrados = useMemo(() => titulos ?? [], [titulos])

  return (
    <div>
      <PageHeader
        title="Contas a Receber"
        subtitle="Vendas a prazo, fiado e crédito parcelado"
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard
          label="Total a Receber"
          valor={resumo ? fmt(resumo.totalAberto) : 'R$ 0,00'}
          cor="gray"
          loading={loadingResumo}
        />
        <KpiCard
          label="Vencido"
          valor={resumo ? fmt(resumo.totalVencido) : 'R$ 0,00'}
          cor="red"
          loading={loadingResumo}
        />
        <KpiCard
          label="Vence Hoje"
          valor={resumo ? fmt(resumo.totalVenceHoje) : 'R$ 0,00'}
          cor="amber"
          loading={loadingResumo}
        />
        <KpiCard
          label="Próximos 7 Dias"
          valor={resumo ? fmt(resumo.totalVenceSemana) : 'R$ 0,00'}
          cor="blue"
          loading={loadingResumo}
        />
      </div>

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(['ABERTO', 'TODOS'] as TabStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setTabStatus(s)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tabStatus === s
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border border-border text-foreground hover:bg-muted/50'
            }`}
          >
            {s === 'ABERTO' ? 'Em aberto' : 'Todos'}
          </button>
        ))}
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="animate-pulse space-y-2 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 rounded bg-muted" />
              ))}
            </div>
          ) : isError ? (
            <EmptyState
              icon={<CreditCard className="h-6 w-6" />}
              title="Erro ao carregar recebíveis"
              description="Não foi possível buscar as contas a receber."
              className="py-16"
            />
          ) : titulosFiltrados.length === 0 ? (
            <EmptyState
              icon={<CreditCard className="h-6 w-6" />}
              title="Nenhum recebível"
              description={
                tabStatus === 'ABERTO'
                  ? 'Nenhum valor em aberto. Recebíveis são gerados automaticamente nas vendas a prazo.'
                  : 'Nenhum recebível encontrado.'
              }
              className="py-16"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número / Origem</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Restante</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Parcelas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {titulosFiltrados.map((t) => {
                  const vencido = isVencido(t)
                  const origemLabel = t.formaPagamento
                    ? (ORIGEM_LABEL[t.formaPagamento] ?? null)
                    : null

                  return (
                    <TableRow key={t.id} className={vencido ? 'bg-red-50/40 dark:bg-red-900/10' : undefined}>
                      <TableCell>
                        <p className="font-mono text-sm font-medium">{t.numero}</p>
                        {(origemLabel ?? t.vendaNumero) && (
                          <p className="text-xs text-muted-foreground">
                            {origemLabel ?? `Venda ${t.vendaNumero}`}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {t.clienteNome ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="tabular-nums text-sm">{fmt(t.valorOriginal)}</TableCell>
                      <TableCell className={`tabular-nums text-sm font-semibold ${
                        parseFloat(t.valorRestante) > 0 && t.status !== 'CANCELADO'
                          ? vencido ? 'text-destructive' : 'text-foreground'
                          : 'text-muted-foreground'
                      }`}>
                        {t.status === 'CANCELADO' ? '—' : fmt(t.valorRestante)}
                      </TableCell>
                      <TableCell className={`text-sm ${vencido ? 'text-destructive font-semibold' : 'text-foreground'}`}>
                        {fmtData(t.dataVencimento)}
                        {vencido && (
                          <span className="ml-1 inline-flex items-center gap-0.5 text-xs text-destructive">
                            <AlertTriangle className="h-3 w-3" />
                            vencido
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {t.numeroParcelas > 1
                          ? `${t.parcelasPagas}/${t.numeroParcelas}`
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[t.status] ?? 'default'}>
                          {STATUS_LABEL[t.status] ?? t.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {(t.status === 'ABERTO' || t.status === 'VENCIDO' || t.status === 'PAGO_PARCIAL') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setTituloParaReceber(t)}
                            >
                              Receber
                            </Button>
                          )}
                          {(t.status === 'ABERTO' || t.status === 'VENCIDO' || t.status === 'PAGO_PARCIAL') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => setTituloParaCancelar(t)}
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ReceberModal titulo={tituloParaReceber} onClose={() => setTituloParaReceber(null)} />
      <CancelarModal titulo={tituloParaCancelar} onClose={() => setTituloParaCancelar(null)} />
    </div>
  )
}
