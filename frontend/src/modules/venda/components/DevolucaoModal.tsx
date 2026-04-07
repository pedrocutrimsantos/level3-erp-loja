import React, { useState } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Modal } from '@/shared/components/ui/Modal'
import { Button } from '@/shared/components/ui/Button'
import { Badge } from '@/shared/components/ui/Badge'
import { Input } from '@/shared/components/ui/Input'
import { useItensVenda, useRegistrarDevolucao } from '../hooks/useDevolucao'
import type { DevolucaoResponse } from '@/shared/api/devolucoes'

interface Props {
  vendaId: string
  vendaNumero: string
  onClose: () => void
}

function fmt(v: string) {
  return parseFloat(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function DevolucaoModal({ vendaId, vendaNumero, onClose }: Props) {
  const { data: itens, isLoading, isError } = useItensVenda(vendaId)
  const { mutate, isPending } = useRegistrarDevolucao()

  const [quantidades, setQuantidades] = useState<Record<string, string>>({})
  const [motivo,    setMotivo]    = useState('')
  const [erro,      setErro]      = useState<string | null>(null)
  const [resultado, setResultado] = useState<DevolucaoResponse | null>(null)

  function setQtd(itemVendaId: string, value: string) {
    setQuantidades((prev) => ({ ...prev, [itemVendaId]: value }))
  }

  function handleDevolver() {
    setErro(null)
    const itensSelecionados = (itens ?? [])
      .filter((item) => {
        const q = quantidades[item.itemVendaId]
        return q && parseFloat(q) > 0
      })
      .map((item) => ({
        itemVendaId: item.itemVendaId,
        quantidade:  parseFloat(quantidades[item.itemVendaId]).toString(),
      }))

    if (itensSelecionados.length === 0) {
      setErro('Informe a quantidade de pelo menos um item para devolver.')
      return
    }

    mutate(
      { vendaId, req: { itens: itensSelecionados, motivo: motivo.trim() || undefined } },
      {
        onSuccess: (data) => setResultado(data),
        onError: (e: unknown) => setErro(
          (e as any)?.response?.data?.detalhes ??
          (e as any)?.response?.data?.erro ??
          (e instanceof Error ? e.message : 'Erro ao registrar devolução.')
        ),
      },
    )
  }

  // ── Tela de sucesso ───────────────────────────────────────────────────────

  if (resultado) {
    return (
      <Modal
        open
        onClose={onClose}
        title="Devolução Registrada"
        footer={<Button onClick={onClose}>Fechar</Button>}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20 px-4 py-3">
            <RotateCcw className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                Devolução <span className="font-mono">{resultado.numero}</span> registrada!
              </p>
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                Valor devolvido: <span className="font-bold">{fmt(resultado.valorTotal)}</span>
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {resultado.itens.map((item, i) => (
              <div key={i} className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm">
                <p className="font-medium text-foreground">{item.produtoDescricao}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.quantidadeMLinear != null
                    ? `${parseFloat(item.quantidadeMLinear).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} m linear · ${item.volumeM3 ? parseFloat(item.volumeM3).toLocaleString('pt-BR', { maximumFractionDigits: 4 }) + ' m³' : ''}`
                    : `${parseFloat(item.quantidadeUnidade ?? '0').toLocaleString('pt-BR', { maximumFractionDigits: 4 })} un`}
                  {' · '}
                  <span className="font-semibold text-foreground">{fmt(item.valorDevolvido)}</span>
                </p>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            O estoque foi revertido para {resultado.itens.length}{' '}
            {resultado.itens.length === 1 ? 'item' : 'itens'}.
          </p>
        </div>
      </Modal>
    )
  }

  // ── Formulário ────────────────────────────────────────────────────────────

  return (
    <Modal
      open
      onClose={onClose}
      title={`Registrar Devolução — Venda ${vendaNumero}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleDevolver}
            loading={isPending}
            disabled={isLoading || isError || !itens?.length}
          >
            Confirmar Devolução
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {isLoading && (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        )}

        {isError && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Erro ao carregar itens da venda.
          </div>
        )}

        {itens && itens.length > 0 && (
          <>
            <p className="text-sm text-muted-foreground">
              Informe a quantidade a devolver por item. Deixe em branco ou zero para não devolver.
            </p>

            <div className="space-y-2">
              {itens.map((item) => {
                const isMadeira = item.tipoProduto === 'MADEIRA'
                const maxQtd = isMadeira
                  ? parseFloat(item.quantidadeMetroLinear ?? '0')
                  : parseFloat(item.quantidadeUnidade ?? '0')
                const unidade = isMadeira ? 'm' : (item.unidadeSigla ?? 'un')

                return (
                  <div
                    key={item.itemVendaId}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-sm text-foreground truncate">
                          {item.produtoDescricao}
                        </p>
                        <Badge variant={isMadeira ? 'default' : 'outline'} className="text-xs shrink-0">
                          {isMadeira ? 'Madeira' : 'Normal'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.produtoCodigo}
                        {' · '}
                        Vendido:{' '}
                        <span className="font-medium text-foreground">
                          {maxQtd.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} {unidade}
                        </span>
                        {' · '}
                        {fmt(item.valorTotalItem)}
                      </p>
                    </div>
                    <div className="w-36 shrink-0">
                      <Input
                        type="number"
                        min="0"
                        max={maxQtd}
                        step={isMadeira ? '0.001' : '1'}
                        placeholder={`0 ${unidade}`}
                        value={quantidades[item.itemVendaId] ?? ''}
                        onChange={(e) => setQtd(item.itemVendaId, e.target.value)}
                        className="text-right"
                      />
                      <p className="text-xs text-muted-foreground text-right mt-0.5">
                        máx {maxQtd.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} {unidade}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">
                Motivo <span className="text-muted-foreground font-normal">(opcional)</span>
              </label>
              <textarea
                className="w-full rounded-lg border border-border bg-input text-foreground px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                rows={2}
                placeholder="Ex: produto com defeito, troca de espécie, erro de pedido…"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                maxLength={500}
              />
            </div>
          </>
        )}

        {erro && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {erro}
          </div>
        )}
      </div>
    </Modal>
  )
}
