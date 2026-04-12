import React, { useState } from 'react'
import { TrendingUp, TrendingDown, AlertCircle, Info } from 'lucide-react'
import { useDre } from '../hooks/useDre'
import type { DreCategoriaDto } from '@/shared/api/relatorios'

// ── Utilitários ───────────────────────────────────────────────────────────────

function fmt(value: string) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    parseFloat(value),
  )
}

function fmtPct(value: string) {
  return `${parseFloat(value).toFixed(2)}%`
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function firstOfMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  pct,
  positive,
  muted,
}: {
  label: string
  value: string
  pct?: string
  positive?: boolean
  muted?: boolean
}) {
  const colorClass = muted
    ? 'text-muted-foreground'
    : positive === true
      ? 'text-emerald-500'
      : positive === false
        ? 'text-rose-500'
        : 'text-foreground'

  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${colorClass}`}>{value}</p>
      {pct !== undefined && (
        <p className="mt-0.5 text-xs text-muted-foreground">{pct} da receita líquida</p>
      )}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h3>
  )
}

function DespesasTable({ despesas }: { despesas: DreCategoriaDto[] }) {
  if (despesas.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Nenhuma despesa paga registrada no período.
      </p>
    )
  }
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">Categoria</th>
            <th className="px-4 py-2 text-right font-medium text-muted-foreground">Valor</th>
            <th className="px-4 py-2 text-right font-medium text-muted-foreground">% Receita</th>
          </tr>
        </thead>
        <tbody>
          {despesas.map((d) => (
            <tr key={d.categoria} className="border-b last:border-0 hover:bg-muted/20">
              <td className="px-4 py-2">{d.categoria}</td>
              <td className="px-4 py-2 text-right tabular-nums">{fmt(d.valor)}</td>
              <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                {fmtPct(d.percentualSobreReceita)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function DrePage() {
  const [dataInicio, setDataInicio] = useState(firstOfMonth())
  const [dataFim, setDataFim] = useState(today())
  const [applied, setApplied] = useState({ ini: firstOfMonth(), fim: today() })

  const { data, isLoading, isError } = useDre(applied.ini, applied.fim)

  function aplicar() {
    setApplied({ ini: dataInicio, fim: dataFim })
  }

  return (
    <div className="space-y-6 p-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold">DRE — Demonstrativo de Resultado</h1>
        <p className="text-sm text-muted-foreground">
          Receita, custos, despesas e resultado operacional do período.
        </p>
      </div>

      {/* Filtro de período */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Data início</label>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="rounded-md border bg-background px-3 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Data fim</label>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="rounded-md border bg-background px-3 py-1.5 text-sm"
          />
        </div>
        <button
          onClick={aplicar}
          className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Gerar DRE
        </button>
      </div>

      {/* Estados de carregamento/erro */}
      {isLoading && (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}
      {isError && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 p-4 text-rose-700 dark:bg-rose-950/30">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="text-sm">Erro ao carregar o DRE. Verifique o período e tente novamente.</span>
        </div>
      )}

      {/* Conteúdo */}
      {data && (
        <div className="space-y-2">
          {/* Banner resultado */}
          <div
            className={`flex items-center gap-3 rounded-xl border p-4 ${
              data.resultadoPositivo
                ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30'
                : 'border-rose-300 bg-rose-50 dark:bg-rose-950/30'
            }`}
          >
            {data.resultadoPositivo ? (
              <TrendingUp className="h-6 w-6 text-emerald-500" />
            ) : (
              <TrendingDown className="h-6 w-6 text-rose-500" />
            )}
            <div>
              <p className="text-sm font-semibold">
                Resultado Operacional:{' '}
                <span className={data.resultadoPositivo ? 'text-emerald-600' : 'text-rose-600'}>
                  {fmt(data.resultadoOperacional)}
                </span>{' '}
                <span className="font-normal text-muted-foreground">
                  ({fmtPct(data.margemOperacional)} da receita líquida)
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                Período: {data.dataInicio} a {data.dataFim} · Gerado em: {data.geradoEm}
              </p>
            </div>
          </div>

          {/* Receita */}
          <SectionTitle>Receita</SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <MetricCard label="Receita Bruta" value={fmt(data.receitaBruta)} />
            <MetricCard
              label="Devoluções"
              value={fmt(data.devolucoes)}
              positive={parseFloat(data.devolucoes) === 0 ? undefined : false}
            />
            <MetricCard label="Receita Líquida" value={fmt(data.receitaLiquida)} />
            <MetricCard
              label="Vendas / Ticket Médio"
              value={`${data.quantidadeVendas} · ${fmt(data.ticketMedio)}`}
              muted
            />
          </div>

          {/* CMV */}
          <SectionTitle>Custo de Mercadoria Vendida</SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MetricCard
              label="CMV"
              value={fmt(data.custoMercadorias)}
              pct={fmtPct(
                parseFloat(data.receitaLiquida) > 0
                  ? String(
                      (parseFloat(data.custoMercadorias) / parseFloat(data.receitaLiquida)) * 100,
                    )
                  : '0',
              )}
              positive={false}
            />
            <MetricCard
              label="Lucro Bruto"
              value={fmt(data.lucroBruto)}
              pct={fmtPct(data.margemBruta)}
              positive={parseFloat(data.lucroBruto) >= 0}
            />
          </div>
          {data.cmvEstimado && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600">
              <Info className="h-3.5 w-3.5 shrink-0" />
              CMV calculado pelo custo médio atual — estimativa (custo histórico por transação não rastreado).
            </div>
          )}

          {/* Despesas */}
          <SectionTitle>Despesas Operacionais</SectionTitle>
          <DespesasTable despesas={data.despesas} />
          {data.despesas.length > 0 && (
            <div className="flex justify-end">
              <p className="text-sm font-semibold">
                Total despesas: {fmt(data.totalDespesas)}
              </p>
            </div>
          )}

          {/* Resultado final */}
          <SectionTitle>Resultado</SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MetricCard
              label="Resultado Operacional"
              value={fmt(data.resultadoOperacional)}
              pct={fmtPct(data.margemOperacional)}
              positive={data.resultadoPositivo}
            />
          </div>
        </div>
      )}
    </div>
  )
}
