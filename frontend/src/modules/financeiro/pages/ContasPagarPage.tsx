import React, { useState, useMemo } from 'react'
import { AlertTriangle, Ban, CreditCard, Plus, TrendingDown } from 'lucide-react'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import { Modal } from '@/shared/components/ui/Modal'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/shared/components/ui/Table'
import { useTitulos, useBaixaTitulo, useCriarDespesa, useCancelarTitulo, useResumoPagar } from '../hooks/useTitulos'
import { useFornecedores } from '@/modules/fornecedor/hooks/useFornecedores'
import type { TituloResponse } from '@/shared/api/titulos'

// ── Constantes ────────────────────────────────────────────────────────────────

const CATEGORIAS = [
  { value: 'FORNECEDOR', label: 'Fornecedor' },
  { value: 'ALUGUEL',    label: 'Aluguel' },
  { value: 'FOLHA',      label: 'Folha de Pagamento' },
  { value: 'IMPOSTOS',   label: 'Impostos / Taxas' },
  { value: 'SERVICOS',   label: 'Serviços' },
  { value: 'OUTROS',     label: 'Outros' },
] as const

const FORMAS_BAIXA = ['DINHEIRO', 'PIX', 'CARTAO_DEBITO', 'CARTAO_CREDITO', 'BOLETO', 'CHEQUE'] as const

const STATUS_LABEL: Record<string, string> = {
  ABERTO:       'Aberto',
  PAGO_PARCIAL: 'Pago Parcial',
  PAGO:         'Pago',
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

// ── Modal: Nova Despesa ────────────────────────────────────────────────────────

function NovaDespesaModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { mutate: criar, isPending } = useCriarDespesa()
  const { data: fornecedores } = useFornecedores(true)

  const [descricao,     setDescricao]     = useState('')
  const [valor,         setValor]         = useState('')
  const [dataVenc,      setDataVenc]      = useState('')
  const [fornecedorId,  setFornecedorId]  = useState('')
  const [categoria,     setCategoria]     = useState('')
  const [nParcelas,     setNParcelas]     = useState(1)
  const [intervalo,     setIntervalo]     = useState(30)
  const [erro,          setErro]          = useState<string | null>(null)

  const valorNum = parseFloat(valor.replace(',', '.'))
  const valorParcela = nParcelas > 1 && !isNaN(valorNum) && valorNum > 0
    ? (valorNum / nParcelas).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : null

  function handleConfirmar() {
    setErro(null)
    if (!descricao.trim()) { setErro('Descrição é obrigatória.'); return }
    if (isNaN(valorNum) || valorNum <= 0) { setErro('Informe um valor válido.'); return }
    if (!dataVenc) { setErro('Informe a data de vencimento da 1ª parcela.'); return }

    criar(
      {
        descricao:              descricao.trim(),
        valor:                  valorNum.toFixed(2),
        dataVencimento:         dataVenc,
        fornecedorId:           fornecedorId || undefined,
        categoria:              categoria || undefined,
        numeroParcelas:         nParcelas,
        intervaloDiasParcelas:  intervalo,
      },
      {
        onSuccess: handleFechar,
        onError: (err: unknown) => {
          setErro(
            (err as any)?.response?.data?.detalhes ??
            (err as any)?.response?.data?.erro ??
            'Erro ao lançar despesa.'
          )
        },
      },
    )
  }

  function handleFechar() {
    setDescricao('')
    setValor('')
    setDataVenc('')
    setFornecedorId('')
    setCategoria('')
    setNParcelas(1)
    setIntervalo(30)
    setErro(null)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleFechar}
      title="Nova Conta a Pagar"
      footer={
        <>
          <Button variant="outline" onClick={handleFechar} disabled={isPending}>Cancelar</Button>
          <Button onClick={handleConfirmar} loading={isPending}>Lançar</Button>
        </>
      }
    >
      <div className="space-y-4 text-sm">

        {/* Descrição */}
        <div className="flex flex-col gap-1">
          <label className="font-medium text-foreground">Descrição *</label>
          <input
            type="text"
            placeholder="Ex: Aluguel março, Conta de luz, NF 1234…"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="w-full rounded-md border border-border bg-input text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            maxLength={120}
          />
        </div>

        {/* Fornecedor + Categoria */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="font-medium text-foreground">Fornecedor</label>
            <select
              value={fornecedorId}
              onChange={(e) => setFornecedorId(e.target.value)}
              className="w-full rounded-md border border-border bg-input text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">— nenhum —</option>
              {(fornecedores ?? []).map((f) => (
                <option key={f.id} value={f.id}>{f.razaoSocial}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-medium text-foreground">Categoria</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full rounded-md border border-border bg-input text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">— nenhuma —</option>
              {CATEGORIAS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Valor + Vencimento */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="font-medium text-foreground">Valor Total (R$) *</label>
            <input
              type="number"
              placeholder="0,00"
              min="0.01"
              step="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="w-full rounded-md border border-border bg-input text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-medium text-foreground">Vencimento (1ª parcela) *</label>
            <input
              type="date"
              value={dataVenc}
              onChange={(e) => setDataVenc(e.target.value)}
              className="w-full rounded-md border border-border bg-input text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Parcelamento */}
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parcelamento</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-medium text-foreground">Nº de Parcelas</label>
              <select
                value={nParcelas}
                onChange={(e) => setNParcelas(Number(e.target.value))}
                className="w-full rounded-md border border-border bg-input text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24, 36].map((n) => (
                  <option key={n} value={n}>{n === 1 ? 'À vista (1x)' : `${n}×`}</option>
                ))}
              </select>
            </div>
            {nParcelas > 1 && (
              <div className="flex flex-col gap-1">
                <label className="font-medium text-foreground">Intervalo (dias)</label>
                <select
                  value={intervalo}
                  onChange={(e) => setIntervalo(Number(e.target.value))}
                  className="w-full rounded-md border border-border bg-input text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value={7}>7 dias (semanal)</option>
                  <option value={15}>15 dias (quinzenal)</option>
                  <option value={30}>30 dias (mensal)</option>
                  <option value={60}>60 dias (bimestral)</option>
                </select>
              </div>
            )}
          </div>
          {valorParcela && (
            <p className="text-xs text-muted-foreground">
              Cada parcela: <span className="font-semibold text-foreground">{valorParcela}</span>
            </p>
          )}
        </div>

        {erro && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</p>
        )}
      </div>
    </Modal>
  )
}

// ── Modal: Baixa ──────────────────────────────────────────────────────────────

function BaixaModal({
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
            'Erro ao registrar baixa.'
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
      title="Registrar Pagamento"
      footer={
        <>
          <Button variant="outline" onClick={handleFechar} disabled={isPending}>Cancelar</Button>
          <Button onClick={handleConfirmar} loading={isPending}>Confirmar Pagamento</Button>
        </>
      }
    >
      <div className="space-y-4 text-sm">
        <div className="rounded-md bg-muted/40 px-4 py-3 space-y-1">
          <p className="font-semibold text-foreground">{titulo.numero}{parcInfo}</p>
          {titulo.descricao && <p className="text-muted-foreground">{titulo.descricao}</p>}
          {titulo.fornecedorNome && <p className="text-muted-foreground">{titulo.fornecedorNome}</p>}
          <p className="text-lg font-bold text-foreground">{restante}</p>
          <p className="text-xs text-muted-foreground">Vencimento: {fmtData(titulo.dataVencimento)}</p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-medium text-foreground">Forma de Pagamento *</label>
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
            Data do Pagamento <span className="text-muted-foreground">(vazio = hoje)</span>
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
      title="Cancelar Título"
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
        {titulo.descricao && <p className="text-muted-foreground">{titulo.descricao}</p>}
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
type FiltroCategoria = string | 'TODAS'

export default function ContasPagarPage() {
  const [tabStatus,       setTabStatus]       = useState<TabStatus>('ABERTO')
  const [filtroCategoria, setFiltroCategoria] = useState<FiltroCategoria>('TODAS')
  const [tituloParaBaixa,     setTituloParaBaixa]     = useState<TituloResponse | null>(null)
  const [tituloParaCancelar,  setTituloParaCancelar]  = useState<TituloResponse | null>(null)
  const [novaDespesaOpen, setNovaDespesaOpen] = useState(false)

  const { data: resumo, isLoading: loadingResumo } = useResumoPagar()
  const { data: titulos, isLoading, isError } = useTitulos({
    tipo:   'PAGAR',
    status: tabStatus === 'ABERTO' ? 'ABERTO' : undefined,
    limit:  500,
  })

  const titulosFiltrados = useMemo(() => {
    if (!titulos) return []
    if (filtroCategoria === 'TODAS') return titulos
    return titulos.filter((t) => t.categoria === filtroCategoria)
  }, [titulos, filtroCategoria])

  const categoriasDisponiveis = useMemo(() => {
    if (!titulos) return []
    const set = new Set(titulos.map((t) => t.categoria).filter(Boolean) as string[])
    return Array.from(set)
  }, [titulos])

  return (
    <div>
      <PageHeader
        title="Contas a Pagar"
        subtitle="Despesas, fornecedores e obrigações financeiras"
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => setNovaDespesaOpen(true)}>
            <Plus className="h-4 w-4" />
            Nova Conta
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard
          label="Total em Aberto"
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
        {/* Status */}
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

        {/* Categoria */}
        {categoriasDisponiveis.length > 0 && (
          <div className="ml-2 flex gap-1.5 flex-wrap">
            <button
              onClick={() => setFiltroCategoria('TODAS')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium border transition-colors ${
                filtroCategoria === 'TODAS'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50'
              }`}
            >
              Todas categorias
            </button>
            {categoriasDisponiveis.map((cat) => {
              const catLabel = CATEGORIAS.find((c) => c.value === cat)?.label ?? cat
              return (
                <button
                  key={cat}
                  onClick={() => setFiltroCategoria(cat)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium border transition-colors ${
                    filtroCategoria === cat
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {catLabel}
                </button>
              )
            })}
          </div>
        )}
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
              icon={<TrendingDown className="h-6 w-6" />}
              title="Erro ao carregar contas"
              description="Não foi possível buscar as contas a pagar."
              className="py-16"
            />
          ) : titulosFiltrados.length === 0 ? (
            <EmptyState
              icon={<TrendingDown className="h-6 w-6" />}
              title="Nenhuma conta a pagar"
              description={
                tabStatus === 'ABERTO'
                  ? 'Nenhuma conta em aberto. Use o botão "Nova Conta" para lançar uma despesa.'
                  : 'Nenhuma conta encontrada.'
              }
              className="py-16"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número / Descrição</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Categoria</TableHead>
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
                  const catLabel = t.categoria
                    ? (CATEGORIAS.find((c) => c.value === t.categoria)?.label ?? t.categoria)
                    : null

                  return (
                    <TableRow key={t.id} className={vencido ? 'bg-red-50/40 dark:bg-red-900/10' : undefined}>
                      <TableCell>
                        <p className="font-mono text-sm font-medium">{t.numero}</p>
                        {t.descricao && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{t.descricao}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {t.fornecedorNome ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {catLabel ? (
                          <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                            {catLabel}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
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
                              onClick={() => setTituloParaBaixa(t)}
                            >
                              Pagar
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

      <NovaDespesaModal open={novaDespesaOpen} onClose={() => setNovaDespesaOpen(false)} />
      <BaixaModal titulo={tituloParaBaixa} onClose={() => setTituloParaBaixa(null)} />
      <CancelarModal titulo={tituloParaCancelar} onClose={() => setTituloParaCancelar(null)} />
    </div>
  )
}
