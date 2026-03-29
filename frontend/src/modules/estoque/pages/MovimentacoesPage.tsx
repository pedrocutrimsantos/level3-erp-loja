import React, { useMemo, useState } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/shared/components/ui/Table'
import { Badge } from '@/shared/components/ui/Badge'
import { useMovimentacoesGeral } from '../hooks/useEstoque'
import { useProdutos } from '@/modules/produto/hooks/useProdutos'

// ── Mapeamentos ────────────────────────────────────────────────────────────────

const TIPO_LABEL: Record<string, string> = {
  ENTRADA_COMPRA:       'Entrada Compra',
  SAIDA_VENDA:          'Saída Venda',
  AJUSTE_POSITIVO:      'Ajuste +',
  AJUSTE_NEGATIVO:      'Ajuste −',
  RESERVA:              'Reserva',
  LIBERACAO_RESERVA:    'Lib. Reserva',
  PERDA:                'Perda',
  TRANSFERENCIA_SAIDA:  'Transf. Saída',
  TRANSFERENCIA_ENTRADA:'Transf. Entrada',
  SOBRA_ENTRADA:        'Sobra Entrada',
  DEVOLUCAO_ENTRADA:    'Devolução Entrada',
  DEVOLUCAO_SAIDA:      'Devolução Saída',
}

const TIPO_VARIANT: Record<string, 'default' | 'success' | 'destructive' | 'warning' | 'outline'> = {
  ENTRADA_COMPRA:        'success',
  SAIDA_VENDA:           'destructive',
  AJUSTE_POSITIVO:       'success',
  AJUSTE_NEGATIVO:       'warning',
  RESERVA:               'outline',
  LIBERACAO_RESERVA:     'outline',
  PERDA:                 'destructive',
  TRANSFERENCIA_SAIDA:   'outline',
  TRANSFERENCIA_ENTRADA: 'outline',
  SOBRA_ENTRADA:         'success',
  DEVOLUCAO_ENTRADA:     'success',
  DEVOLUCAO_SAIDA:       'destructive',
}

const TODOS_OS_TIPOS = [
  'ENTRADA_COMPRA', 'SAIDA_VENDA', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO',
  'RESERVA', 'LIBERACAO_RESERVA', 'PERDA',
  'TRANSFERENCIA_SAIDA', 'TRANSFERENCIA_ENTRADA',
  'SOBRA_ENTRADA', 'DEVOLUCAO_ENTRADA', 'DEVOLUCAO_SAIDA',
]

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatarQtd(m3: string | null, und: string | null, sinal: string) {
  const prefixo = sinal === 'POSITIVO' ? '+' : '−'
  if (m3 != null) return `${prefixo} ${parseFloat(m3).toLocaleString('pt-BR', { minimumFractionDigits: 4 })} m³`
  if (und != null) return `${prefixo} ${parseFloat(und).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  return '—'
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function MovimentacoesPage() {
  const [produtoFiltro, setProdutoFiltro] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState('')

  const { data: produtos } = useProdutos(true)

  const params = useMemo(() => ({
    produtoId: produtoFiltro || undefined,
    tipo:      tipoFiltro || undefined,
    limit:     200,
  }), [produtoFiltro, tipoFiltro])

  const { data: movs, isLoading, isError } = useMovimentacoesGeral(params)

  return (
    <div>
      <PageHeader
        title="Movimentações de Estoque"
        subtitle="Histórico de entradas, saídas e ajustes"
      />

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={produtoFiltro}
          onChange={(e) => setProdutoFiltro(e.target.value)}
          className="rounded-md border border-border bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 min-w-[220px]"
        >
          <option value="">Todos os produtos</option>
          {(produtos ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.codigo} — {p.descricao}
            </option>
          ))}
        </select>

        <select
          value={tipoFiltro}
          onChange={(e) => setTipoFiltro(e.target.value)}
          className="rounded-md border border-border bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="">Todos os tipos</option>
          {TODOS_OS_TIPOS.map((t) => (
            <option key={t} value={t}>{TIPO_LABEL[t] ?? t}</option>
          ))}
        </select>

        {(produtoFiltro || tipoFiltro) && (
          <button
            onClick={() => { setProdutoFiltro(''); setTipoFiltro('') }}
            className="rounded-md border border-border bg-white px-3 py-1.5 text-xs text-gray-600 hover:bg-muted/50 transition-colors"
          >
            Limpar filtros
          </button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="animate-pulse space-y-2 p-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-10 rounded bg-gray-100" />
              ))}
            </div>
          ) : isError ? (
            <EmptyState
              icon={<ArrowLeftRight className="h-6 w-6" />}
              title="Erro ao carregar movimentações"
              description="Não foi possível buscar o histórico. Tente novamente."
              className="py-16"
            />
          ) : !movs || movs.length === 0 ? (
            <EmptyState
              icon={<ArrowLeftRight className="h-6 w-6" />}
              title="Nenhuma movimentação encontrada"
              description={
                produtoFiltro || tipoFiltro
                  ? 'Nenhum resultado para os filtros selecionados.'
                  : 'As movimentações de estoque aparecerão aqui.'
              }
              className="py-16"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data / Hora</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead className="text-right">Saldo Antes</TableHead>
                  <TableHead className="text-right">Saldo Depois</TableHead>
                  <TableHead>Observação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movs.map((mov) => (
                  <TableRow key={mov.id}>
                    <TableCell className="whitespace-nowrap text-sm text-gray-700">
                      {formatarDataHora(mov.dataHora)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {mov.produtoCodigo && mov.produtoDescricao ? (
                        <div>
                          <p className="font-medium text-gray-900 truncate max-w-[200px]">{mov.produtoDescricao}</p>
                          <p className="text-xs font-mono text-muted-foreground">{mov.produtoCodigo}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={TIPO_VARIANT[mov.tipoMovimentacao] ?? 'default'}>
                        {TIPO_LABEL[mov.tipoMovimentacao] ?? mov.tipoMovimentacao}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right tabular-nums text-sm font-medium ${
                      mov.sinal === 'POSITIVO' ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {formatarQtd(mov.quantidadeM3, mov.quantidadeUnidade, mov.sinal)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                      {mov.saldoAntesM3 != null
                        ? `${parseFloat(mov.saldoAntesM3).toLocaleString('pt-BR', { minimumFractionDigits: 4 })} m³`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm text-gray-700">
                      {mov.saldoDepoisM3 != null
                        ? `${parseFloat(mov.saldoDepoisM3).toLocaleString('pt-BR', { minimumFractionDigits: 4 })} m³`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">
                      {mov.observacao ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
