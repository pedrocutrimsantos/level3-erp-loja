import React, { useState } from 'react'
import { Button } from '@/shared/components/ui/Button'
import { Badge } from '@/shared/components/ui/Badge'
import { useEntrega, useConfirmarEntrega } from '../hooks/useEntregas'
import type { EntregaResponse } from '@/shared/api/entregas'

interface Props {
  entregaId: string
  onClose: () => void
}

function formatarReais(v: string) {
  return parseFloat(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function ConfirmarEntregaModal({ entregaId, onClose }: Props) {
  const { data: entrega, isLoading, isError } = useEntrega(entregaId)
  const { mutate, isPending } = useConfirmarEntrega()

  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [erro, setErro] = useState<string | null>(null)
  const [resultado, setResultado] = useState<EntregaResponse | null>(null)

  // Inicializa todos os itens PENDENTE como selecionados quando dados carregam
  React.useEffect(() => {
    if (entrega && selecionados.size === 0) {
      const pendentes = entrega.itens
        .filter((i) => i.statusEntrega === 'PENDENTE')
        .map((i) => i.itemVendaId)
      setSelecionados(new Set(pendentes))
    }
  }, [entrega])

  function toggle(id: string) {
    setSelecionados((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleConfirmar() {
    setErro(null)
    mutate(
      { entregaId, req: { itensEntregues: Array.from(selecionados) } },
      {
        onSuccess: (data) => setResultado(data),
        onError: (e: unknown) => setErro((e as Error)?.message ?? 'Erro ao confirmar entrega.'),
      },
    )
  }

  const itensPendentes = entrega?.itens.filter((i) => i.statusEntrega === 'PENDENTE') ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl rounded-lg bg-card dark:bg-[#161d27] shadow-xl flex flex-col max-h-[90vh] border border-border dark:border-[#243040]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border dark:border-[#243040] px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground dark:text-[#e2e8f0]">Confirmar Entrega</h2>
            {entrega && (
              <p className="text-sm text-muted-foreground dark:text-[#94a3b8]">
                {entrega.numero} · Venda {entrega.vendaNumero}
              </p>
            )}
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
            <p className="text-sm text-destructive">Erro ao carregar dados da entrega.</p>
          )}

          {resultado ? (
            <div className="rounded-lg border border-success/30 bg-success/10 p-5 space-y-2 text-sm">
              <p className="font-semibold text-success text-base">Entrega confirmada!</p>
              <p className="text-success">
                Itens entregues:{' '}
                <span className="font-bold">
                  {resultado.itens.filter((i) => i.statusEntrega === 'ENTREGUE').length}
                </span>{' '}
                de {resultado.itens.length}
              </p>
              <p className="text-success">
                Status da venda atualizado para{' '}
                <span className="font-bold">
                  {resultado.itens.every(
                    (i) => i.statusEntrega === 'ENTREGUE' || i.statusEntrega === 'DEVOLVIDO',
                  )
                    ? 'Concluído'
                    : 'Entregue Parcial'}
                </span>
                .
              </p>
            </div>
          ) : (
            entrega && (
              <div className="space-y-3">
                {entrega.enderecoEntrega && (
                  <div className="rounded-md bg-muted/50 dark:bg-[#1c2636] px-3 py-2 text-sm text-foreground dark:text-[#e2e8f0]">
                    <span className="font-medium">Endereço: </span>
                    {entrega.enderecoEntrega}
                  </div>
                )}

                <p className="text-sm text-muted-foreground dark:text-[#94a3b8]">
                  Marque os itens que foram efetivamente entregues.
                </p>

                {itensPendentes.length === 0 ? (
                  <p className="text-sm text-muted-foreground dark:text-[#94a3b8] italic">
                    Todos os itens já foram entregues ou devolvidos.
                  </p>
                ) : (
                  itensPendentes.map((item) => {
                    const isMadeira = item.tipoProduto === 'MADEIRA'
                    const qtdLabel = isMadeira
                      ? `${parseFloat(item.quantidadeMetroLinear ?? '0').toLocaleString('pt-BR', { maximumFractionDigits: 3 })} m`
                      : `${parseFloat(item.quantidadeUnidade ?? '0').toLocaleString('pt-BR', { maximumFractionDigits: 4 })} ${item.unidadeSigla ?? 'un'}`

                    return (
                      <label
                        key={item.itemVendaId}
                        className="flex items-center gap-3 rounded-md border border-border dark:border-[#243040] p-3 cursor-pointer hover:bg-muted/30 dark:hover:bg-[#1c2636]"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary"
                          checked={selecionados.has(item.itemVendaId)}
                          onChange={() => toggle(item.itemVendaId)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate text-foreground dark:text-[#e2e8f0]">{item.produtoDescricao}</p>
                          <p className="text-xs text-muted-foreground dark:text-[#94a3b8]">
                            <Badge variant="outline" className="text-xs mr-1">
                              {isMadeira ? 'Madeira' : 'Normal'}
                            </Badge>
                            {qtdLabel} · {formatarReais(item.valorTotalItem)}
                          </p>
                        </div>
                      </label>
                    )
                  })
                )}

                {erro && <p className="text-sm text-destructive">{erro}</p>}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-border dark:border-[#243040] px-6 py-4">
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            {resultado ? 'Fechar' : 'Cancelar'}
          </Button>
          {!resultado && itensPendentes.length > 0 && (
            <Button
              onClick={handleConfirmar}
              disabled={isPending || isLoading || isError || selecionados.size === 0}
            >
              {isPending ? 'Confirmando...' : `Confirmar (${selecionados.size} ${selecionados.size === 1 ? 'item' : 'itens'})`}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
