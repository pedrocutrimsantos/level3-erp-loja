import React from 'react'
import { X } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import { Badge } from '@/shared/components/ui/Badge'
import { vendasApi } from '@/shared/api/vendas'
import { useQuery } from '@tanstack/react-query'

interface Props {
  vendaId: string
  onClose: () => void
}

const STATUS_LABEL: Record<string, string> = {
  RASCUNHO:          'Rascunho',
  ORCAMENTO:         'Orçamento',
  CONFIRMADO:        'Confirmado',
  EM_ENTREGA:        'Em Entrega',
  ENTREGUE_PARCIAL:  'Entregue Parcial',
  CONCLUIDO:         'Concluído',
  CANCELADO:         'Cancelado',
  DEVOLVIDO_PARCIAL: 'Dev. Parcial',
  DEVOLVIDO:         'Devolvido',
}

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'destructive' | 'warning' | 'outline'> = {
  CONFIRMADO:        'success',
  CONCLUIDO:         'success',
  EM_ENTREGA:        'warning',
  ENTREGUE_PARCIAL:  'warning',
  DEVOLVIDO_PARCIAL: 'warning',
  CANCELADO:         'destructive',
  ORCAMENTO:         'outline',
  RASCUNHO:          'outline',
  DEVOLVIDO:         'outline',
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

const TIPO_LABEL: Record<string, string> = {
  BALCAO:      'Balcão',
  COM_ENTREGA: 'Com Entrega',
  ORCAMENTO:   'Orçamento',
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatarReais(v: string) {
  return parseFloat(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function qtdLabel(item: { tipoProduto: string; quantidadeMetroLinear: string | null; quantidadeUnidade: string | null; unidadeSigla: string | null }) {
  if (item.tipoProduto === 'MADEIRA') {
    const m = parseFloat(item.quantidadeMetroLinear ?? '0')
    return `${m.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} m`
  }
  const u = parseFloat(item.quantidadeUnidade ?? '0')
  return `${u.toLocaleString('pt-BR', { maximumFractionDigits: 4 })} ${item.unidadeSigla ?? 'un'}`
}

function precoLabel(item: { tipoProduto: string; precoUnitario: string }) {
  const p = parseFloat(item.precoUnitario)
  const fmt = p.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  return item.tipoProduto === 'MADEIRA' ? `${fmt}/m` : `${fmt}/un`
}

export function VendaDetalheModal({ vendaId, onClose }: Props) {
  const { data: venda, isLoading, isError } = useQuery({
    queryKey: ['venda-detalhe', vendaId],
    queryFn: () => vendasApi.buscar(vendaId),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-card text-card-foreground shadow-2xl flex flex-col border border-border">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 sticky top-0 bg-card z-10">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">
              {venda ? venda.numero : 'Detalhes da Venda'}
            </h2>
            {venda && (
              <Badge variant={STATUS_VARIANT[venda.status] ?? 'default'}>
                {STATUS_LABEL[venda.status] ?? venda.status}
              </Badge>
            )}
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-6">

          {isLoading && (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          )}

          {isError && (
            <p className="text-sm text-destructive">Erro ao carregar detalhes da venda.</p>
          )}

          {venda && (
            <>
              {/* Info geral */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Data / Hora</span>
                  <p className="font-medium">{formatarData(venda.createdAt)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Tipo</span>
                  <p className="font-medium">{TIPO_LABEL[venda.tipo] ?? venda.tipo}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Cliente</span>
                  <p className="font-medium">{venda.clienteNome ?? 'Consumidor final'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Forma de pagamento</span>
                  <p className="font-medium">
                    {venda.formaPagamento
                      ? (FORMA_LABEL[venda.formaPagamento] ?? venda.formaPagamento)
                      : '—'}
                  </p>
                </div>
                {venda.observacao && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Observação</span>
                    <p className="font-medium">{venda.observacao}</p>
                  </div>
                )}
              </div>

              {/* Itens */}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Itens ({venda.itens.length})
                </h3>
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Produto</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Quantidade</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Preço unit.</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {venda.itens.map((item, i) => (
                        <tr key={i} className="hover:bg-muted/20">
                          <td className="px-3 py-2">
                            <p className="font-medium leading-tight">{item.produtoDescricao}</p>
                            <p className="text-xs text-muted-foreground">{item.produtoCodigo}</p>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {qtdLabel(item)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                            {precoLabel(item)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums font-medium">
                            {formatarReais(item.valorTotalItem)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3">
                <span className="font-semibold">Total da venda</span>
                <span className="text-xl font-bold tabular-nums">
                  {formatarReais(venda.valorTotal)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
