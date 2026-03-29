import React from 'react'
import { AlertTriangle, CreditCard, ShoppingCart, TrendingUp, Receipt } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
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

export default function DashboardPage() {
  const { data, isLoading, isError } = useDashboard()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const chartColors = {
    bar:            isDark ? '#4ade80' : '#166534',
    grid:           isDark ? '#243040' : 'rgba(200,212,226,1)',
    label:          isDark ? '#94a3b8' : '#64748b',
    tooltipBg:      isDark ? '#161d27' : '#ffffff',
    tooltipBorder:  isDark ? '#243040' : 'rgb(200,212,226)',
    tooltipText:    isDark ? '#e2e8f0'  : 'rgb(7,9,18)',
  }

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Dashboard" subtitle="Visão geral do negócio" />
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 rounded-lg bg-muted" />
            ))}
          </div>
          <div className="h-64 rounded-lg bg-muted" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="h-52 rounded-lg bg-muted" />
            <div className="h-52 rounded-lg bg-muted" />
          </div>
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div>
        <PageHeader title="Dashboard" subtitle="Visão geral do negócio" />
        <p className="text-sm text-muted-foreground">Erro ao carregar dados. Tente novamente.</p>
      </div>
    )
  }

  const chartData = data.vendasUltimos30Dias.map((v) => ({
    data: formatarDataCurta(v.data),
    total: parseFloat(v.total),
    quantidade: v.quantidade,
  }))

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="Visão geral do negócio" />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Faturamento Hoje
              </p>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {formatarReais(data.faturamentoDia)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {data.quantidadeVendasDia}{' '}
              {data.quantidadeVendasDia === 1 ? 'venda' : 'vendas'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Faturamento do Mês
              </p>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {formatarReais(data.faturamentoMes)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {data.quantidadeVendasMes}{' '}
              {data.quantidadeVendasMes === 1 ? 'venda' : 'vendas'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                A Receber
              </p>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {formatarReais(data.titulosEmAberto.valorTotal)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {data.titulosEmAberto.quantidade}{' '}
              {data.titulosEmAberto.quantidade === 1 ? 'título' : 'títulos'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                A Pagar
              </p>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {formatarReais(data.contasAPagar.valorTotal)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {data.contasAPagar.quantidade}{' '}
              {data.contasAPagar.quantidade === 1 ? 'título' : 'títulos'} em aberto
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de vendas */}
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
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={chartColors.grid}
                />
                <XAxis
                  dataKey="data"
                  tick={{ fontSize: 11, fill: chartColors.label }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: chartColors.label }}
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
                    borderRadius: '0.5rem',
                    border: `1px solid ${chartColors.tooltipBorder}`,
                    backgroundColor: chartColors.tooltipBg,
                    color: chartColors.tooltipText,
                  }}
                />
                <Bar dataKey="total" fill={chartColors.bar} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top Produtos + Estoque Crítico */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <p className="mb-4 text-sm font-semibold text-foreground">
              Top 5 Produtos — últimos 30 dias
            </p>
            {data.topProdutos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem vendas no período</p>
            ) : (
              <div className="space-y-3">
                {data.topProdutos.map((p, i) => (
                  <div key={p.produtoId} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-900 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {p.produtoDescricao}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.totalM3 ? `${p.totalM3} m³` : `${p.quantidadeVendas} vendas`}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-foreground">
                      {formatarReais(p.totalValor)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="mb-4 text-sm font-semibold text-foreground">
              Estoque Crítico — menores saldos
            </p>
            {data.estoqueCritico.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum produto com saldo crítico
              </p>
            ) : (
              <div className="space-y-3">
                {data.estoqueCritico.map((e) => (
                  <div key={e.produtoId} className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {e.produtoDescricao}
                      </p>
                      <p className="text-xs text-muted-foreground">{e.produtoCodigo}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-warning">{e.saldoM3} m³</p>
                      {e.saldoMetroLinear && (
                        <p className="text-xs text-muted-foreground">{e.saldoMetroLinear} m</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
