import React from 'react'
import { AlertTriangle, CreditCard, ShoppingCart, TrendingUp, Receipt } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { useDashboard } from '../hooks/useDashboard'
import { useTheme } from '@/shared/theme/ThemeContext'

function formatarReais(valor: string) {
  return parseFloat(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarDataCurta(iso: string) {
  const [, mes, dia] = iso.split('-')
  return `${dia}/${mes}`
}

// ── Paleta de cores para os gráficos ─────────────────────────────────────────

const BAR_COLORS_LIGHT = [
  '#1B4332', '#2563EB', '#7C3AED', '#DB2777', '#EA580C',
  '#D97706', '#059669', '#0891B2', '#4F46E5', '#DC2626',
]
const BAR_COLORS_DARK = [
  '#4ade80', '#60a5fa', '#a78bfa', '#f472b6', '#fb923c',
  '#fbbf24', '#34d399', '#22d3ee', '#818cf8', '#f87171',
]

const TOP_COLORS = ['#1B4332', '#2563EB', '#7C3AED', '#DB2777', '#EA580C']
const TOP_COLORS_DARK = ['#4ade80', '#60a5fa', '#a78bfa', '#f472b6', '#fb923c']

// ── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string
  valor: string
  sub: string
  icon: React.ReactNode
  iconBg: string
  iconColor: string
}

function KpiCard({ label, valor, sub, icon, iconBg, iconColor }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground leading-none">{valor}</p>
            <p className="mt-1.5 text-xs text-muted-foreground">{sub}</p>
          </div>
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
            <span className={iconColor}>{icon}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data, isLoading, isError } = useDashboard()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const barColors   = isDark ? BAR_COLORS_DARK  : BAR_COLORS_LIGHT
  const topColors   = isDark ? TOP_COLORS_DARK  : TOP_COLORS

  const chartStyle = {
    grid:          isDark ? '#243040'  : '#E3EBF6',
    label:         isDark ? '#94a3b8'  : '#697586',
    tooltipBg:     isDark ? '#161d27'  : '#ffffff',
    tooltipBorder: isDark ? '#243040'  : '#E3EBF6',
    tooltipText:   isDark ? '#e2e8f0'  : '#212121',
  }

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Dashboard" subtitle="Visão geral do negócio" />
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 rounded-xl bg-muted" />)}
          </div>
          <div className="h-64 rounded-xl bg-muted" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="h-52 rounded-xl bg-muted" />
            <div className="h-52 rounded-xl bg-muted" />
          </div>
        </div>
      </div>
    )
  }

  if (isError || !data || typeof data !== 'object' || !('titulosEmAberto' in data)) {
    return (
      <div>
        <PageHeader title="Dashboard" subtitle="Visão geral do negócio" />
        <p className="text-sm text-muted-foreground">Erro ao carregar dados. Tente novamente.</p>
      </div>
    )
  }

  const chartData = (data.vendasUltimos30Dias ?? []).map((v) => ({
    data: formatarDataCurta(v.data),
    total: parseFloat(v.total),
    quantidade: v.quantidade,
  }))

  const topProdutos = data.topProdutos ?? []
  const maxValorTop = topProdutos.reduce(
    (max, p) => Math.max(max, parseFloat(p.totalValor)),
    0
  )

  return (
    <div className="space-y-5">
      <PageHeader title="Dashboard" subtitle="Visão geral do negócio" />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Faturamento Hoje"
          valor={formatarReais(data.faturamentoDia ?? '0')}
          sub={`${data.quantidadeVendasDia ?? 0} ${(data.quantidadeVendasDia ?? 0) === 1 ? 'venda' : 'vendas'}`}
          icon={<ShoppingCart className="h-5 w-5" />}
          iconBg="bg-emerald-100 dark:bg-emerald-900/30"
          iconColor="text-emerald-600 dark:text-emerald-400"
        />
        <KpiCard
          label="Faturamento do Mês"
          valor={formatarReais(data.faturamentoMes ?? '0')}
          sub={`${data.quantidadeVendasMes ?? 0} ${(data.quantidadeVendasMes ?? 0) === 1 ? 'venda' : 'vendas'}`}
          icon={<TrendingUp className="h-5 w-5" />}
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          iconColor="text-blue-600 dark:text-blue-400"
        />
        <KpiCard
          label="A Receber"
          valor={formatarReais(data.titulosEmAberto?.valorTotal ?? '0')}
          sub={`${data.titulosEmAberto?.quantidade ?? 0} ${(data.titulosEmAberto?.quantidade ?? 0) === 1 ? 'título' : 'títulos'}`}
          icon={<CreditCard className="h-5 w-5" />}
          iconBg="bg-orange-100 dark:bg-orange-900/30"
          iconColor="text-orange-600 dark:text-orange-400"
        />
        <KpiCard
          label="A Pagar"
          valor={formatarReais(data.contasAPagar?.valorTotal ?? '0')}
          sub={`${data.contasAPagar?.quantidade ?? 0} ${(data.contasAPagar?.quantidade ?? 0) === 1 ? 'título' : 'títulos'} em aberto`}
          icon={<Receipt className="h-5 w-5" />}
          iconBg="bg-red-100 dark:bg-red-900/30"
          iconColor="text-red-600 dark:text-red-400"
        />
      </div>

      {/* Gráfico de vendas — barras multicoloridas */}
      <Card>
        <CardContent className="p-5">
          <p className="mb-4 text-sm font-semibold text-foreground">
            Vendas — últimos 30 dias
          </p>
          {chartData.length === 0 ? (
            <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
              Sem vendas no período
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartStyle.grid} />
                <XAxis
                  dataKey="data"
                  tick={{ fontSize: 11, fill: chartStyle.label }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: chartStyle.label }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`
                  }
                />
                <Tooltip
                  formatter={(value: number) => [
                    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                    'Total',
                  ]}
                  labelFormatter={(label) => `Data: ${label}`}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: '0.75rem',
                    border: `1px solid ${chartStyle.tooltipBorder}`,
                    backgroundColor: chartStyle.tooltipBg,
                    color: chartStyle.tooltipText,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                  cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
                />
                <Bar dataKey="total" radius={[5, 5, 0, 0]}>
                  {chartData.map((_, index) => (
                    <Cell key={index} fill={barColors[index % barColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top Produtos + Estoque Crítico */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Top 5 Produtos com barra de progresso colorida */}
        <Card>
          <CardContent className="p-5">
            <p className="mb-4 text-sm font-semibold text-foreground">
              Top 5 Produtos — últimos 30 dias
            </p>
            {topProdutos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem vendas no período</p>
            ) : (
              <div className="space-y-4">
                {topProdutos.map((p, i) => {
                  const pct = maxValorTop > 0
                    ? Math.round((parseFloat(p.totalValor) / maxValorTop) * 100)
                    : 0
                  const cor = topColors[i % topColors.length]
                  return (
                    <div key={p.produtoId}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white"
                            style={{ backgroundColor: cor }}
                          >
                            {i + 1}
                          </span>
                          <p className="truncate text-sm font-medium text-foreground">
                            {p.produtoDescricao}
                          </p>
                        </div>
                        <p className="shrink-0 ml-2 text-sm font-semibold text-foreground">
                          {formatarReais(p.totalValor)}
                        </p>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: cor }}
                        />
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {p.totalM3 ? `${p.totalM3} m³` : `${p.quantidadeVendas} vendas`}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Estoque Crítico */}
        <Card>
          <CardContent className="p-5">
            <p className="mb-4 text-sm font-semibold text-foreground">
              Estoque Crítico — menores saldos
            </p>
            {(data.estoqueCritico ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum produto com saldo crítico
              </p>
            ) : (
              <div className="space-y-3">
                {(data.estoqueCritico ?? []).map((e, i) => {
                  const alertColors = [
                    'text-red-500 bg-red-100 dark:bg-red-900/30',
                    'text-orange-500 bg-orange-100 dark:bg-orange-900/30',
                    'text-amber-500 bg-amber-100 dark:bg-amber-900/30',
                    'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30',
                    'text-lime-500 bg-lime-100 dark:bg-lime-900/30',
                  ]
                  return (
                    <div key={e.produtoId} className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${alertColors[i % alertColors.length]}`}>
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {e.produtoDescricao}
                        </p>
                        <p className="text-xs text-muted-foreground">{e.produtoCodigo}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold text-warning">{e.saldoM3} m³</p>
                        {e.saldoMetroLinear && (
                          <p className="text-xs text-muted-foreground">{e.saldoMetroLinear} m</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
