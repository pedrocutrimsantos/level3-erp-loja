import React, { useState } from 'react'
import { CreditCard, Plus } from 'lucide-react'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import { Modal } from '@/shared/components/ui/Modal'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/shared/components/ui/Table'
import { useTitulos, useBaixaTitulo, useCriarDespesa } from '../hooks/useTitulos'
import type { TituloResponse } from '@/shared/api/titulos'

// ── Mapeamentos de exibição ───────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  ABERTO:     'Aberto',
  PAGO_PARCIAL: 'Pago Parcial',
  PAGO:       'Pago',
  VENCIDO:    'Vencido',
  CANCELADO:  'Cancelado',
  NEGOCIADO:  'Negociado',
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

function formatarData(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR')
}

function formatarReais(valor: string) {
  return parseFloat(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ── Modal de baixa ────────────────────────────────────────────────────────────

const FORMAS_BAIXA = ['DINHEIRO', 'PIX', 'CARTAO_DEBITO', 'CARTAO_CREDITO', 'BOLETO', 'CHEQUE'] as const

function BaixaModal({
  titulo,
  open,
  onClose,
}: {
  titulo: TituloResponse | null
  open: boolean
  onClose: () => void
}) {
  const { mutate: baixar, isPending } = useBaixaTitulo()
  const [forma, setForma] = useState<string>('DINHEIRO')
  const [dataPgto, setDataPgto] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  function handleConfirmar() {
    if (!titulo) return
    setErro(null)
    baixar(
      { id: titulo.id, req: { formaPagamento: forma, dataPagamento: dataPgto || undefined } },
      {
        onSuccess: onClose,
        onError: (err: unknown) => {
          const msg =
            (err as any)?.response?.data?.detalhes ??
            (err as any)?.response?.data?.erro ??
            'Erro ao registrar baixa.'
          setErro(msg)
        },
      },
    )
  }

  function handleFechar() {
    setForma('DINHEIRO')
    setDataPgto('')
    setErro(null)
    onClose()
  }

  if (!titulo) return null

  return (
    <Modal
      open={open}
      onClose={handleFechar}
      title="Registrar Baixa"
      footer={
        <>
          <Button variant="outline" onClick={handleFechar} disabled={isPending}>Cancelar</Button>
          <Button onClick={handleConfirmar} loading={isPending}>Confirmar Baixa</Button>
        </>
      }
    >
      <div className="space-y-4 text-sm">
        <div className="rounded-md bg-muted/40 px-4 py-3 space-y-1">
          <p className="font-semibold text-foreground">{titulo.numero}</p>
          {(titulo.tipo === 'PAGAR' ? titulo.fornecedorNome : titulo.clienteNome) && (
            <p className="text-muted-foreground">
              {titulo.tipo === 'PAGAR' ? titulo.fornecedorNome : titulo.clienteNome}
            </p>
          )}
          <p className="text-lg font-bold text-foreground">{formatarReais(titulo.valorRestante)}</p>
          <p className="text-xs text-muted-foreground">Vencimento: {formatarData(titulo.dataVencimento)}</p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-foreground">Forma de Pagamento *</label>
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
          <label className="text-sm font-medium text-foreground">
            Data do Pagamento <span className="text-muted-foreground">(vazio = hoje)</span>
          </label>
          <input
            type="date"
            value={dataPgto}
            onChange={(e) => setDataPgto(e.target.value)}
            className="w-full rounded-md border border-border bg-input text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {erro && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</p>
        )}
      </div>
    </Modal>
  )
}

// ── Modal nova despesa ────────────────────────────────────────────────────────

function NovaDespesaModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { mutate: criar, isPending } = useCriarDespesa()
  const [descricao, setDescricao] = useState('')
  const [valor,     setValor]     = useState('')
  const [dataVenc,  setDataVenc]  = useState('')
  const [erro,      setErro]      = useState<string | null>(null)

  function handleConfirmar() {
    setErro(null)
    const valorNum = parseFloat(valor.replace(',', '.'))
    if (!descricao.trim()) { setErro('Descrição é obrigatória.'); return }
    if (isNaN(valorNum) || valorNum <= 0) { setErro('Informe um valor válido.'); return }
    if (!dataVenc) { setErro('Informe a data de vencimento.'); return }

    criar(
      { descricao: descricao.trim(), valor: valorNum.toFixed(2), dataVencimento: dataVenc },
      {
        onSuccess: handleFechar,
        onError: (err: unknown) => {
          const msg =
            (err as any)?.response?.data?.detalhes ??
            (err as any)?.response?.data?.erro ??
            'Erro ao lançar despesa.'
          setErro(msg)
        },
      },
    )
  }

  function handleFechar() {
    setDescricao('')
    setValor('')
    setDataVenc('')
    setErro(null)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleFechar}
      title="Nova Despesa"
      footer={
        <>
          <Button variant="outline" onClick={handleFechar} disabled={isPending}>Cancelar</Button>
          <Button onClick={handleConfirmar} loading={isPending}>Lançar Despesa</Button>
        </>
      }
    >
      <div className="space-y-4 text-sm">
        <div className="flex flex-col gap-1">
          <label className="font-medium text-foreground">Descrição *</label>
          <input
            type="text"
            placeholder="Ex: Aluguel março/2026, Energia elétrica..."
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="w-full rounded-md border border-border bg-input text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            maxLength={120}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="font-medium text-foreground">Valor (R$) *</label>
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
            <label className="font-medium text-foreground">Vencimento *</label>
            <input
              type="date"
              value={dataVenc}
              onChange={(e) => setDataVenc(e.target.value)}
              className="w-full rounded-md border border-border bg-input text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {erro && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</p>
        )}
      </div>
    </Modal>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

type TabTipo = 'RECEBER' | 'PAGAR'
type TabStatus = 'ABERTO' | 'TODOS'

export default function TitulosPage() {
  const [tabTipo, setTabTipo] = useState<TabTipo>('RECEBER')
  const [tabStatus, setTabStatus] = useState<TabStatus>('ABERTO')
  const [tituloParaBaixa, setTituloParaBaixa] = useState<TituloResponse | null>(null)
  const [novaDespesaOpen, setNovaDespesaOpen] = useState(false)

  const { data: titulos, isLoading, isError } = useTitulos({
    tipo:   tabTipo,
    status: tabStatus === 'ABERTO' ? 'ABERTO' : undefined,
    limit:  200,
  })

  return (
    <div>
      <PageHeader
        title="Títulos Financeiros"
        subtitle="Contas a receber e a pagar"
      />

      {/* Barra de abas + ações */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {/* Abas de tipo */}
        <div className="flex rounded-lg border border-border dark:border-[#243040] overflow-hidden">
          {(['RECEBER', 'PAGAR'] as TabTipo[]).map((t) => (
            <button
              key={t}
              onClick={() => setTabTipo(t)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                tabTipo === t
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card dark:bg-[#161d27] text-foreground dark:text-[#e2e8f0] hover:bg-muted/60 dark:hover:bg-[#243040]'
              }`}
            >
              {t === 'RECEBER' ? 'A Receber' : 'A Pagar'}
            </button>
          ))}
        </div>

        {tabTipo === 'PAGAR' && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => setNovaDespesaOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Nova Despesa
          </Button>
        )}

        {/* Filtro de status — alinhado à direita */}
        <div className="ml-auto flex rounded-lg border border-border dark:border-[#243040] overflow-hidden">
          {(['ABERTO', 'TODOS'] as TabStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setTabStatus(s)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                tabStatus === s
                  ? 'bg-foreground dark:bg-[#e2e8f0] text-background dark:text-[#0d1117]'
                  : 'bg-card dark:bg-[#161d27] text-muted-foreground hover:bg-muted/50 dark:hover:bg-[#243040]'
              }`}
            >
              {s === 'ABERTO' ? 'Somente abertos' : 'Todos'}
            </button>
          ))}
        </div>
      </div>

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
              title="Erro ao carregar títulos"
              description="Não foi possível buscar os títulos. Tente novamente."
              className="py-16"
            />
          ) : !titulos || titulos.length === 0 ? (
            <EmptyState
              icon={<CreditCard className="h-6 w-6" />}
              title={tabTipo === 'RECEBER' ? 'Nenhum título a receber' : 'Nenhum título a pagar'}
              description={
                tabStatus === 'ABERTO'
                  ? 'Nenhum título em aberto. Títulos FIADO aparecem aqui ao finalizar uma venda.'
                  : 'Nenhum título encontrado.'
              }
              className="py-16"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente / Fornecedor</TableHead>
                  <TableHead>Venda</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Restante</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Forma</TableHead>
                  <TableHead>Status</TableHead>
                  {tabStatus === 'ABERTO' && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {titulos.map((t) => {
                  const isVencido = t.dataVencimento && t.status === 'ABERTO' &&
                    new Date(t.dataVencimento) < new Date()

                  return (
                    <TableRow key={t.id}>
                      <TableCell>
                        <p className="font-mono text-sm font-medium">{t.numero}</p>
                        {t.descricao && (
                          <p className="text-xs text-muted-foreground">{t.descricao}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {(t.tipo === 'PAGAR' ? t.fornecedorNome : t.clienteNome) ??
                          <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {t.vendaNumero ?? '—'}
                      </TableCell>
                      <TableCell className="tabular-nums text-sm">
                        {formatarReais(t.valorOriginal)}
                      </TableCell>
                      <TableCell className={`tabular-nums text-sm font-medium ${
                        parseFloat(t.valorRestante) > 0 ? 'text-destructive' : 'text-success'
                      }`}>
                        {formatarReais(t.valorRestante)}
                      </TableCell>
                      <TableCell className={`text-sm ${isVencido ? 'text-destructive font-medium' : 'text-foreground'}`}>
                        {formatarData(t.dataVencimento)}
                        {isVencido && <span className="ml-1 text-xs">(vencido)</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {t.formaPagamento ? (FORMA_LABEL[t.formaPagamento] ?? t.formaPagamento) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[t.status] ?? 'default'}>
                          {STATUS_LABEL[t.status] ?? t.status}
                        </Badge>
                      </TableCell>
                      {tabStatus === 'ABERTO' && (
                        <TableCell className="text-right">
                          {(t.status === 'ABERTO' || t.status === 'VENCIDO' || t.status === 'PAGO_PARCIAL') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setTituloParaBaixa(t)}
                            >
                              Baixar
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <BaixaModal
        titulo={tituloParaBaixa}
        open={!!tituloParaBaixa}
        onClose={() => setTituloParaBaixa(null)}
      />

      <NovaDespesaModal
        open={novaDespesaOpen}
        onClose={() => setNovaDespesaOpen(false)}
      />
    </div>
  )
}
