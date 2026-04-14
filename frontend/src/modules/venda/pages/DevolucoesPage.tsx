import React, { useState, useMemo, useRef, useEffect } from 'react'
import { RotateCcw, Plus, X, ChevronLeft, AlertCircle } from 'lucide-react'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/shared/components/ui/Table'
import { useDevolucoes, useItensVenda, useRegistrarDevolucao } from '../hooks/useDevolucao'
import { useVendas } from '../hooks/useVenda'
import { useToast } from '@/shared/store/toastStore'
import { erroMsg } from '@/shared/utils/erroMsg'
import type { ItemVendaDetalhe } from '@/shared/api/devolucoes'

function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatarReais(v: string) {
  return parseFloat(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function quantidadeMaxima(item: ItemVendaDetalhe): number {
  if (item.tipoProduto === 'MADEIRA') return parseFloat(item.quantidadeMetroLinear ?? '0')
  return parseFloat(item.quantidadeUnidade ?? '0')
}

function labelQuantidade(item: ItemVendaDetalhe): string {
  if (item.tipoProduto === 'MADEIRA') return `Metros lineares (máx ${parseFloat(item.quantidadeMetroLinear ?? '0').toFixed(2)} m)`
  return `Quantidade (máx ${parseFloat(item.quantidadeUnidade ?? '0').toFixed(0)} ${item.unidadeSigla ?? 'un'})`
}

// ── Modal de Registro de Devolução ────────────────────────────────────────────

interface DevolucaoModalProps {
  onClose: () => void
}

function DevolucaoModal({ onClose }: DevolucaoModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const toast = useToast()

  // Step 1: venda selection
  const [step, setStep] = useState<'venda' | 'itens'>('venda')
  const [buscaVenda, setBuscaVenda] = useState('')
  const [vendaSelecionada, setVendaSelecionada] = useState<{ id: string; numero: string; clienteNome: string | null } | null>(null)

  // Step 2: item quantities and motivo
  const [quantidades, setQuantidades] = useState<Record<string, string>>({})
  const [motivo, setMotivo] = useState('')

  const { data: vendas, isLoading: loadingVendas } = useVendas(500)
  const { data: itens, isLoading: loadingItens } = useItensVenda(vendaSelecionada?.id ?? null)
  const registrar = useRegistrarDevolucao()

  const vendasFiltradas = useMemo(() => {
    if (!vendas) return []
    const t = buscaVenda.toLowerCase().trim()
    const confirmadas = vendas.filter((v) => v.status === 'CONFIRMADO')
    if (!t) return confirmadas.slice(0, 30)
    return confirmadas
      .filter((v) =>
        v.numero.toLowerCase().includes(t) ||
        (v.clienteNome ?? '').toLowerCase().includes(t),
      )
      .slice(0, 30)
  }, [vendas, buscaVenda])

  function selecionarVenda(v: { vendaId: string; numero: string; clienteNome: string | null }) {
    setVendaSelecionada({ id: v.vendaId, numero: v.numero, clienteNome: v.clienteNome })
    setQuantidades({})
    setStep('itens')
  }

  function voltarParaVenda() {
    setStep('venda')
    setVendaSelecionada(null)
    setQuantidades({})
    setMotivo('')
  }

  function setQtd(itemVendaId: string, value: string) {
    setQuantidades((prev) => ({ ...prev, [itemVendaId]: value }))
  }

  async function handleSubmit() {
    if (!vendaSelecionada || !itens) return

    const itensSelecionados = itens
      .map((item) => ({
        itemVendaId: item.itemVendaId,
        quantidade: quantidades[item.itemVendaId] ?? '0',
        max: quantidadeMaxima(item),
      }))
      .filter(({ quantidade }) => parseFloat(quantidade) > 0)

    if (!itensSelecionados.length) {
      toast.erro('Informe ao menos um item com quantidade maior que zero.')
      return
    }

    const invalido = itensSelecionados.find(({ quantidade, max }) => parseFloat(quantidade) > max)
    if (invalido) {
      toast.erro('Quantidade informada supera a quantidade original da venda.')
      return
    }

    try {
      await registrar.mutateAsync({
        vendaId: vendaSelecionada.id,
        req: {
          itens: itensSelecionados.map(({ itemVendaId, quantidade }) => ({ itemVendaId, quantidade })),
          motivo: motivo.trim() || undefined,
        },
      })
      toast.sucesso('Devolução registrada com sucesso!')
      onClose()
    } catch (e) {
      toast.erro(erroMsg(e, 'Erro ao registrar devolução'))
    }
  }

  // Close on overlay click
  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose()
  }

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleOverlayClick}
    >
      <div className="relative w-full max-w-2xl rounded-lg bg-background shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            {step === 'itens' && (
              <button
                onClick={voltarParaVenda}
                className="mr-1 rounded-md p-1 hover:bg-muted text-muted-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <h2 className="text-base font-semibold">Registrar Devolução</h2>
            {step === 'itens' && vendaSelecionada && (
              <Badge variant="outline" className="font-mono text-xs">
                {vendaSelecionada.numero}
              </Badge>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-muted text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === 'venda' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Selecione a venda confirmada que será devolvida.
              </p>
              <Input
                placeholder="Buscar por número ou cliente…"
                value={buscaVenda}
                onChange={(e) => setBuscaVenda(e.target.value)}
                autoFocus
                className="h-9 text-sm"
              />
              {loadingVendas ? (
                <div className="space-y-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-10 rounded bg-muted animate-pulse" />
                  ))}
                </div>
              ) : !vendasFiltradas.length ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {buscaVenda ? 'Nenhuma venda encontrada.' : 'Nenhuma venda confirmada disponível.'}
                </p>
              ) : (
                <div className="divide-y rounded-md border">
                  {vendasFiltradas.map((v) => (
                    <button
                      key={v.vendaId}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                      onClick={() => selecionarVenda(v)}
                    >
                      <div>
                        <span className="font-mono text-sm font-medium">{v.numero}</span>
                        {v.clienteNome && (
                          <span className="ml-2 text-sm text-muted-foreground">{v.clienteNome}</span>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{formatarReais(v.valorTotal)}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(v.createdAt).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'itens' && (
            <div className="space-y-4">
              {loadingItens ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 rounded bg-muted animate-pulse" />
                  ))}
                </div>
              ) : !itens?.length ? (
                <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  Nenhum item encontrado para esta venda.
                </div>
              ) : (
                <div className="space-y-3">
                  {itens.map((item) => {
                    const max = quantidadeMaxima(item)
                    const qtd = parseFloat(quantidades[item.itemVendaId] ?? '0')
                    const acimaDaMax = qtd > max
                    return (
                      <div key={item.itemVendaId} className="rounded-md border p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-mono text-xs text-muted-foreground">{item.produtoCodigo}</span>
                            <p className="text-sm font-medium leading-tight">{item.produtoDescricao}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm font-medium">{formatarReais(item.valorTotalItem)}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatarReais(item.precoUnitario)}/un
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">
                            {labelQuantidade(item)}
                          </label>
                          <Input
                            type="number"
                            min="0"
                            max={max}
                            step={item.tipoProduto === 'MADEIRA' ? '0.01' : '1'}
                            placeholder="0"
                            value={quantidades[item.itemVendaId] ?? ''}
                            onChange={(e) => setQtd(item.itemVendaId, e.target.value)}
                            className={`h-8 text-sm w-40 ${acimaDaMax ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                          />
                          {acimaDaMax && (
                            <p className="mt-1 text-xs text-destructive">
                              Máximo: {max}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">
                      Motivo da devolução (opcional)
                    </label>
                    <textarea
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      rows={3}
                      placeholder="Ex: produto com defeito, pedido errado…"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'itens' && !!itens?.length && (
          <div className="flex justify-end gap-2 border-t px-6 py-4 flex-shrink-0">
            <Button variant="outline" onClick={onClose} disabled={registrar.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={registrar.isPending}>
              {registrar.isPending ? 'Registrando…' : 'Registrar Devolução'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Página Principal ──────────────────────────────────────────────────────────

export default function DevolucoesPage() {
  const { data: devolucoes, isLoading, isError } = useDevolucoes()
  const [busca, setBusca] = useState('')
  const [modalAberto, setModalAberto] = useState(false)

  const filtradas = useMemo(() => {
    if (!devolucoes) return []
    const termo = busca.toLowerCase().trim()
    if (!termo) return devolucoes
    return devolucoes.filter((d) =>
      d.numero.toLowerCase().includes(termo) ||
      d.vendaNumero.toLowerCase().includes(termo) ||
      (d.clienteNome ?? '').toLowerCase().includes(termo) ||
      (d.motivo ?? '').toLowerCase().includes(termo),
    )
  }, [devolucoes, busca])

  return (
    <div className="space-y-4">
      <PageHeader
        title="Devoluções"
        subtitle="Histórico de mercadorias devolvidas"
        actions={
          <Button size="sm" onClick={() => setModalAberto(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Registrar Devolução
          </Button>
        }
      />

      <div className="flex items-center gap-3">
        <div className="flex-1 max-w-sm">
          <Input
            placeholder="Buscar por número, venda ou cliente…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        {devolucoes && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {filtradas.length === devolucoes.length
              ? `${devolucoes.length} devoluções`
              : `${filtradas.length} de ${devolucoes.length}`}
          </span>
        )}
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
              icon={<RotateCcw className="h-6 w-6" />}
              title="Erro ao carregar devoluções"
              description="Não foi possível buscar as devoluções. Tente novamente."
              className="py-16"
            />
          ) : !filtradas.length ? (
            <EmptyState
              icon={<RotateCcw className="h-6 w-6" />}
              title={busca ? 'Nenhuma devolução encontrada' : 'Nenhuma devolução registrada'}
              description={
                busca
                  ? 'Tente ajustar o filtro.'
                  : 'As devoluções registradas aparecerão aqui.'
              }
              className="py-16"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Venda</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Valor Devolvido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtradas.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {d.numero}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {d.vendaNumero}
                    </TableCell>
                    <TableCell className="text-sm">
                      {d.clienteNome ?? (
                        <span className="text-muted-foreground">Consumidor final</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {d.motivo ?? <span className="text-muted-foreground/50">—</span>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-foreground">
                      {formatarDataHora(d.createdAt)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium text-destructive">
                      {formatarReais(d.valorTotal)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {modalAberto && (
        <DevolucaoModal onClose={() => setModalAberto(false)} />
      )}
    </div>
  )
}
