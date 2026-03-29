import React, { useState } from 'react'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Badge } from '@/shared/components/ui/Badge'
import { useItensVenda, useRegistrarDevolucao } from '../hooks/useDevolucao'
import type { DevolucaoResponse } from '@/shared/api/devolucoes'

interface Props {
  vendaId: string
  vendaNumero: string
  onClose: () => void
}

function formatarReais(v: string) {
  return parseFloat(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function DevolucaoModal({ vendaId, vendaNumero, onClose }: Props) {
  const { data: itens, isLoading, isError } = useItensVenda(vendaId)
  const { mutate, isPending } = useRegistrarDevolucao()

  // quantidade digitada por item (string para input controlado)
  const [quantidades, setQuantidades] = useState<Record<string, string>>({})
  const [motivo, setMotivo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
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
        onError:   (e: unknown) => setErro((e as Error)?.message ?? 'Erro ao registrar devolução.'),
      },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">Devolução</h2>
            <p className="text-sm text-muted-foreground">Venda {vendaNumero}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {isLoading && (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          )}

          {isError && (
            <p className="text-sm text-red-600">Erro ao carregar itens da venda.</p>
          )}

          {resultado ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-5 space-y-2 text-sm">
              <p className="font-semibold text-green-700 text-base">Devolução registrada!</p>
              <p className="text-green-800">Número: <span className="font-mono font-bold">{resultado.numero}</span></p>
              <p className="text-green-800">
                Valor devolvido:{' '}
                <span className="font-bold">{formatarReais(resultado.valorTotal)}</span>
              </p>
              <p className="text-green-800">
                O estoque foi revertido para {resultado.itens.length}{' '}
                {resultado.itens.length === 1 ? 'item' : 'itens'}.
              </p>
            </div>
          ) : (
            itens && itens.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Informe a quantidade a devolver por item (deixe em branco ou zero para não devolver).
                </p>

                {itens.map((item) => {
                  const isMadeira = item.tipoProduto === 'MADEIRA'
                  const maxQtd    = isMadeira
                    ? parseFloat(item.quantidadeMetroLinear ?? '0')
                    : parseFloat(item.quantidadeUnidade ?? '0')
                  const unidade   = isMadeira ? 'm' : (item.unidadeSigla ?? 'un')

                  return (
                    <div
                      key={item.itemVendaId}
                      className="flex items-center gap-3 rounded-md border border-border p-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.produtoDescricao}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.produtoCodigo} ·{' '}
                          <Badge variant="outline" className="text-xs">
                            {isMadeira ? 'Madeira' : 'Normal'}
                          </Badge>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Vendido: <span className="font-medium">
                            {maxQtd.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} {unidade}
                          </span>
                          {' · '}
                          {formatarReais(item.valorTotalItem)}
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
                        <p className="text-xs text-muted-foreground text-right mt-0.5">máx {maxQtd} {unidade}</p>
                      </div>
                    </div>
                  )
                })}

                <div>
                  <label className="text-sm font-medium text-gray-700">Motivo (opcional)</label>
                  <textarea
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none"
                    rows={2}
                    placeholder="Ex: produto com defeito, troca de espécie..."
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                  />
                </div>

                {erro && <p className="text-sm text-red-600">{erro}</p>}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            {resultado ? 'Fechar' : 'Cancelar'}
          </Button>
          {!resultado && (
            <Button
              onClick={handleDevolver}
              disabled={isPending || isLoading || isError || !itens?.length}
            >
              {isPending ? 'Registrando...' : 'Confirmar Devolução'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
