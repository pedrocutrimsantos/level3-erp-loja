import React, { useState } from 'react'
import { ChevronDown, ChevronRight, AlertCircle, TrendingUp, Info } from 'lucide-react'
import { useMargemPeriodo } from '../hooks/useMargemPeriodo'
import type { RelatorioMargemPeriodoLinha, MargemPeriodoDetalhe } from '@/shared/api/relatorios'

// ── Utilitários ───────────────────────────────────────────────────────────────

function fmt(value: string | null | undefined) {
  if (value == null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    parseFloat(value),
  )
}

function fmtPct(value: string | null | undefined) {
  if (value == null) return '—'
  return `${parseFloat(value).toFixed(2)}%`
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function firstOfMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function margemColor(margem: string | null) {
  if (margem == null) return 'text-muted-foreground'
  const v = parseFloat(margem)
  if (v >= 30) return 'text-emerald-600'
  if (v >= 15) return 'text-amber-600'
  return 'text-rose-600'
}

// ── Linha da tabela com drill-down ────────────────────────────────────────────

function DetalheTable({ rows }: { rows: MargemPeriodoDetalhe[] }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b bg-muted/30">
          <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Venda</th>
          <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Data</th>
          <th className="px-3 py-1.5 text-right font-medium text-muted-foreground">Qtd</th>
          <th className="px-3 py-1.5 text-right font-medium text-muted-foreground">Preço Unit.</th>
          <th className="px-3 py-1.5 text-right font-medium text-muted-foreground">Total</th>
          <th className="px-3 py-1.5 text-right font-medium text-muted-foreground">Custo Est.</th>
          <th className="px-3 py-1.5 text-right font-medium text-muted-foreground">Lucro Est.</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((d, i) => {
          const lucroNum = d.lucroEstimado ? parseFloat(d.lucroEstimado) : null
          return (
            <tr key={i} className="border-b last:border-0">
              <td className="px-3 py-1.5 font-mono">{d.vendaNumero}</td>
              <td className="px-3 py-1.5">{d.data}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{d.quantidade}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{fmt(d.precoUnitario)}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{fmt(d.valorTotal)}</td>
              <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                {fmt(d.custoEstimado)}
              </td>
              <td
                className={`px-3 py-1.5 text-right tabular-nums ${
                  lucroNum == null
                    ? 'text-muted-foreground'
                    : lucroNum >= 0
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                }`}
              >
                {fmt(d.lucroEstimado)}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function ProdutoRow({ linha }: { linha: RelatorioMargemPeriodoLinha }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <tr
        className="cursor-pointer border-b hover:bg-muted/20"
        onClick={() => setOpen((p) => !p)}
      >
        <td className="px-3 py-2.5">
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </td>
        <td className="px-3 py-2.5">
          <p className="font-medium">{linha.produtoDescricao}</p>
          <p className="text-xs text-muted-foreground">{linha.produtoCodigo}</p>
        </td>
        <td className="px-3 py-2.5 text-center">
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
            {linha.tipo === 'MADEIRA' ? 'Madeira' : 'Normal'}
          </span>
        </td>
        <td className="px-3 py-2.5 text-right tabular-nums text-sm">{linha.quantidadeVendida}</td>
        <td className="px-3 py-2.5 text-right tabular-nums">{fmt(linha.receitaTotal)}</td>
        <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
          {fmt(linha.custoTotal)}
        </td>
        <td className="px-3 py-2.5 text-right tabular-nums">
          {linha.lucroBruto == null ? (
            <span className="text-muted-foreground">—</span>
          ) : parseFloat(linha.lucroBruto) >= 0 ? (
            <span className="text-emerald-600">{fmt(linha.lucroBruto)}</span>
          ) : (
            <span className="text-rose-600">{fmt(linha.lucroBruto)}</span>
          )}
        </td>
        <td className={`px-3 py-2.5 text-right tabular-nums font-semibold ${margemColor(linha.margemBruta)}`}>
          {fmtPct(linha.margemBruta)}
        </td>
        <td className="px-3 py-2.5 text-right tabular-nums text-sm text-muted-foreground">
          {linha.quantidadeVendas}× · {fmt(linha.ticketMedio)}
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={9} className="bg-muted/10 px-4 pb-3 pt-1">
            <DetalheTable rows={linha.detalhe} />
          </td>
        </tr>
      )}
    </>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

type SortKey = 'receita' | 'margem' | 'lucro' | 'qtd'

export default function MargemPeriodoPage() {
  const [dataInicio, setDataInicio] = useState(firstOfMonth())
  const [dataFim, setDataFim] = useState(today())
  const [applied, setApplied] = useState({ ini: firstOfMonth(), fim: today() })
  const [sort, setSort] = useState<SortKey>('receita')
  const [tipoFiltro, setTipoFiltro] = useState<'TODOS' | 'MADEIRA' | 'NORMAL'>('TODOS')

  const { data, isLoading, isError } = useMargemPeriodo(applied.ini, applied.fim)

  function aplicar() {
    setApplied({ ini: dataInicio, fim: dataFim })
  }

  const linhas = React.useMemo(() => {
    if (!data) return []
    let l = data.linhas
    if (tipoFiltro !== 'TODOS') l = l.filter((x) => x.tipo === tipoFiltro)
    return [...l].sort((a, b) => {
      switch (sort) {
        case 'receita': return parseFloat(b.receitaTotal) - parseFloat(a.receitaTotal)
        case 'margem':  return (parseFloat(b.margemBruta ?? '-1')) - (parseFloat(a.margemBruta ?? '-1'))
        case 'lucro':   return (parseFloat(b.lucroBruto ?? '0')) - (parseFloat(a.lucroBruto ?? '0'))
        case 'qtd':     return b.quantidadeVendas - a.quantidadeVendas
        default: return 0
      }
    })
  }, [data, sort, tipoFiltro])

  return (
    <div className="space-y-6 p-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold">Margem por Período</h1>
        <p className="text-sm text-muted-foreground">
          Receita, custo e margem produto a produto com drill-down por venda.
        </p>
      </div>

      {/* Filtros */}
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
          Gerar
        </button>
        <div className="ml-2 flex gap-1">
          {(['TODOS', 'MADEIRA', 'NORMAL'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTipoFiltro(t)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                tipoFiltro === t
                  ? 'bg-primary text-primary-foreground'
                  : 'border bg-background hover:bg-muted'
              }`}
            >
              {t === 'TODOS' ? 'Todos' : t === 'MADEIRA' ? 'Madeira' : 'Normal'}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 p-4 text-rose-700 dark:bg-rose-950/30">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="text-sm">Erro ao carregar o relatório.</span>
        </div>
      )}

      {data && (
        <div className="space-y-4">
          {/* Cards de resumo */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">Receita Total</p>
              <p className="mt-1 text-xl font-semibold">{fmt(data.receitaTotalPeriodo)}</p>
              <p className="text-xs text-muted-foreground">{data.totalProdutos} produtos</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">Custo Total (est.)</p>
              <p className="mt-1 text-xl font-semibold text-muted-foreground">{fmt(data.custoTotalPeriodo)}</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">Lucro Bruto</p>
              <p className={`mt-1 text-xl font-semibold ${parseFloat(data.lucroBrutoPeriodo) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {fmt(data.lucroBrutoPeriodo)}
              </p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">Margem Ponderada</p>
              <p className={`mt-1 text-xl font-semibold ${margemColor(data.margemMediaPonderada)}`}>
                {fmtPct(data.margemMediaPonderada)}
              </p>
              {data.produtosSemCusto > 0 && (
                <p className="mt-0.5 text-xs text-amber-600">
                  {data.produtosSemCusto} sem custo excluídos
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-amber-600">
            <Info className="h-3.5 w-3.5 shrink-0" />
            Custo calculado pelo custo médio atual — estimativa.
          </div>

          {/* Ordenação */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Ordenar por:</span>
            {([
              { key: 'receita', label: 'Receita' },
              { key: 'margem',  label: 'Margem %' },
              { key: 'lucro',   label: 'Lucro R$' },
              { key: 'qtd',     label: 'Nº vendas' },
            ] as { key: SortKey; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSort(key)}
                className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                  sort === key
                    ? 'bg-primary text-primary-foreground'
                    : 'border bg-background hover:bg-muted'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tabela */}
          {linhas.length === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-lg border">
              <p className="text-sm text-muted-foreground">Nenhuma venda no período selecionado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="w-8 px-3 py-2.5" />
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Produto</th>
                    <th className="px-3 py-2.5 text-center font-medium text-muted-foreground">Tipo</th>
                    <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Qtd Vendida</th>
                    <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Receita</th>
                    <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Custo Est.</th>
                    <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Lucro Est.</th>
                    <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Margem</th>
                    <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Vendas / Ticket</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((linha) => (
                    <ProdutoRow key={linha.produtoCodigo} linha={linha} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
