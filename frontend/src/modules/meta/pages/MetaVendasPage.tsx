import React, { useState } from 'react'
import { Target, Pencil, X, Check } from 'lucide-react'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/Card'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/shared/components/ui/Table'
import { useDesempenho, useSalvarMeta, useRemoverMeta } from '../hooks/useMetaVendas'
import type { DesempenhoVendedorItem } from '@/shared/api/metaVendas'

// ── Helpers ───────────────────────────────────────────────────────────────────

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function hoje() {
  const d = new Date()
  return { ano: d.getFullYear(), mes: d.getMonth() + 1 }
}

function fmtBrl(v: string | null | undefined) {
  if (!v) return '—'
  return parseFloat(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function corProgresso(pct: number): string {
  if (pct >= 100) return 'bg-emerald-500'
  if (pct >= 75)  return 'bg-green-400'
  if (pct >= 50)  return 'bg-yellow-400'
  if (pct >= 25)  return 'bg-orange-400'
  return 'bg-red-400'
}

function badgePct(pct: number | null) {
  if (pct === null) return <Badge variant="outline">Sem meta</Badge>
  if (pct >= 100)   return <Badge variant="success">{pct.toFixed(1)}%</Badge>
  if (pct >= 75)    return <Badge variant="default">{pct.toFixed(1)}%</Badge>
  if (pct >= 50)    return <Badge variant="warning">{pct.toFixed(1)}%</Badge>
  return <Badge variant="destructive">{pct.toFixed(1)}%</Badge>
}

// ── Linha editável de meta ────────────────────────────────────────────────────

function LinhaVendedor({
  item,
  ano,
  mes,
}: {
  item: DesempenhoVendedorItem
  ano: number
  mes: number
}) {
  const [editando, setEditando] = useState(false)
  const [valor, setValor] = useState(item.metaFaturamento ?? '')
  const salvar  = useSalvarMeta()
  const remover = useRemoverMeta()

  const pct = item.percentualAtingido !== null ? parseFloat(item.percentualAtingido) : null
  const barWidth = Math.min(100, pct ?? 0)

  function handleSalvar() {
    const num = parseFloat(valor.replace(',', '.'))
    if (isNaN(num) || num <= 0) return
    salvar.mutate(
      { vendedorId: item.vendedorId, ano, mes, metaFaturamento: num.toFixed(2) },
      { onSuccess: () => setEditando(false) },
    )
  }

  function handleRemover() {
    remover.mutate({ vendedorId: item.vendedorId, ano, mes }, {
      onSuccess: () => { setEditando(false); setValor('') },
    })
  }

  return (
    <TableRow>
      <TableCell className="font-medium text-sm">{item.vendedorNome}</TableCell>

      {/* Meta */}
      <TableCell>
        {editando ? (
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">R$</span>
            <input
              autoFocus
              type="number"
              min="0"
              step="100"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSalvar(); if (e.key === 'Escape') setEditando(false) }}
              className="w-32 rounded-md border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              onClick={handleSalvar}
              disabled={salvar.isPending}
              className="rounded p-1 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={() => setEditando(false)}
              className="rounded p-1 text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
            {item.temMeta && (
              <button
                onClick={handleRemover}
                disabled={remover.isPending}
                className="rounded p-1 text-destructive hover:bg-red-50 disabled:opacity-50"
                title="Remover meta"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono">
              {item.metaFaturamento ? fmtBrl(item.metaFaturamento) : <span className="text-muted-foreground">—</span>}
            </span>
            <button
              onClick={() => { setValor(item.metaFaturamento ?? ''); setEditando(true) }}
              className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </div>
        )}
      </TableCell>

      {/* Realizado */}
      <TableCell className="font-mono text-sm font-medium">
        {fmtBrl(item.realizadoFaturamento)}
      </TableCell>

      {/* Progresso */}
      <TableCell className="w-48">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            {badgePct(pct)}
          </div>
          {item.temMeta && (
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all ${corProgresso(barWidth)}`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
          )}
        </div>
      </TableCell>

      {/* Qtd Vendas */}
      <TableCell className="text-center text-sm">{item.totalVendas}</TableCell>

      {/* Ticket Médio */}
      <TableCell className="text-right text-sm">{fmtBrl(item.ticketMedio)}</TableCell>

      {/* Volume m³ */}
      <TableCell className="text-right text-sm font-mono text-amber-700">
        {parseFloat(item.totalM3) > 0 ? `${parseFloat(item.totalM3).toFixed(4)} m³` : '—'}
      </TableCell>
    </TableRow>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-2 p-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 rounded bg-muted" />
      ))}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function MetaVendasPage() {
  const now = hoje()
  const [ano, setAno] = useState(now.ano)
  const [mes, setMes] = useState(now.mes)

  const { data, isLoading, isError } = useDesempenho(ano, mes)

  const anosOpts = Array.from({ length: 4 }, (_, i) => now.ano - 1 + i)

  const pctGeral = data?.percentualGeralAtingido !== null
    ? parseFloat(data?.percentualGeralAtingido ?? '0')
    : null

  return (
    <div className="space-y-4">
      <PageHeader
        title="Metas de Vendas"
        subtitle="Acompanhe o desempenho de cada vendedor frente à meta do mês"
      />

      {/* Seletor mês/ano */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={mes}
          onChange={(e) => setMes(Number(e.target.value))}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 dark:bg-[#0d1117] dark:border-[#243040]"
        >
          {MESES.map((m, i) => (
            <option key={i + 1} value={i + 1}>{m}</option>
          ))}
        </select>
        <select
          value={ano}
          onChange={(e) => setAno(Number(e.target.value))}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 dark:bg-[#0d1117] dark:border-[#243040]"
        >
          {anosOpts.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* Cards de resumo */}
      {data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card>
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Faturamento Total
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <p className="text-lg font-bold text-gray-900">{fmtBrl(data.totalFaturamento)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Meta Total
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <p className="text-lg font-bold text-gray-900">
                {parseFloat(data.totalMeta) > 0 ? fmtBrl(data.totalMeta) : <span className="text-muted-foreground text-sm">Sem meta</span>}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Atingimento Geral
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <p className={`text-lg font-bold ${
                pctGeral === null ? 'text-muted-foreground' :
                pctGeral >= 100  ? 'text-emerald-600' :
                pctGeral >= 75   ? 'text-green-500' :
                pctGeral >= 50   ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {pctGeral !== null ? `${pctGeral.toFixed(1)}%` : '—'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Vendedores ativos
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <p className="text-lg font-bold text-gray-900">{data.itens.length}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton />
          ) : isError ? (
            <EmptyState
              icon={<Target className="h-6 w-6" />}
              title="Erro ao carregar desempenho"
              description="Não foi possível buscar os dados. Tente novamente."
              className="py-16"
            />
          ) : !data || data.itens.length === 0 ? (
            <EmptyState
              icon={<Target className="h-6 w-6" />}
              title="Nenhum vendedor ativo"
              description="Cadastre usuários com o perfil Vendedor para acompanhar as metas."
              className="py-16"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Meta</TableHead>
                  <TableHead>Realizado</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead className="text-center">Vendas</TableHead>
                  <TableHead className="text-right">Ticket Médio</TableHead>
                  <TableHead className="text-right">Volume m³</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.itens.map((item) => (
                  <LinhaVendedor
                    key={item.vendedorId}
                    item={item}
                    ano={ano}
                    mes={mes}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Clique no ícone de lápis ao lado de cada meta para editá-la. Metas consideram vendas com status Confirmado, Em Entrega, Entregue Parcial ou Concluído.
      </p>
    </div>
  )
}
