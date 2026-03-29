import React, { useMemo, useState } from 'react'
import { AlertTriangle, TrendingDown, TrendingUp, CalendarClock } from 'lucide-react'
import { useFluxoCaixa } from '../hooks/useTitulos'
import type { LancamentoFluxo } from '@/shared/api/titulos'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatarReais(v: string) {
  return parseFloat(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarData(iso: string) {
  // iso = yyyy-MM-dd
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: '2-digit',
  })
}

function classeValor(tipo: 'RECEBER' | 'PAGAR') {
  return tipo === 'RECEBER' ? 'text-emerald-700' : 'text-red-700'
}

// ── Card de totais ────────────────────────────────────────────────────────────

function CardTotal({
  label, valor, icon, variant,
}: {
  label: string
  valor: string
  icon: React.ReactNode
  variant: 'receber' | 'pagar' | 'vencido-receber' | 'vencido-pagar'
}) {
  const bg: Record<string, string> = {
    'receber':        'bg-emerald-50 border-emerald-200',
    'pagar':          'bg-red-50    border-red-200',
    'vencido-receber':'bg-orange-50 border-orange-300',
    'vencido-pagar':  'bg-rose-50   border-rose-300',
  }
  const text: Record<string, string> = {
    'receber':        'text-emerald-700',
    'pagar':          'text-red-700',
    'vencido-receber':'text-orange-700',
    'vencido-pagar':  'text-rose-700',
  }

  return (
    <div className={`rounded-lg border px-5 py-4 flex items-center gap-4 ${bg[variant]}`}>
      <div className={`shrink-0 ${text[variant]}`}>{icon}</div>
      <div>
        <p className={`text-xs font-medium uppercase tracking-wide ${text[variant]}`}>{label}</p>
        <p className={`text-xl font-bold tabular-nums ${text[variant]}`}>{formatarReais(valor)}</p>
      </div>
    </div>
  )
}

// ── Linha de lançamento ───────────────────────────────────────────────────────

function LinhaLancamento({ l }: { l: LancamentoFluxo }) {
  return (
    <div className={`flex items-center gap-3 rounded-md border px-3 py-2.5 ${
      l.vencido ? 'border-red-200 bg-red-50' : 'border-border bg-white hover:bg-muted/20'
    }`}>
      {/* Tipo badge */}
      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
        l.tipo === 'RECEBER'
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-red-100 text-red-700'
      }`}>
        {l.tipo === 'RECEBER' ? 'Rec.' : 'Pag.'}
      </span>

      {/* Número do título */}
      <span className="font-mono text-xs text-gray-500 shrink-0 w-28 truncate">{l.tituloNumero}</span>

      {/* Contraparte */}
      <span className="flex-1 text-sm text-gray-700 truncate min-w-0">
        {l.contraparte ?? <span className="text-muted-foreground italic">—</span>}
      </span>

      {/* Alerta de atraso */}
      {l.vencido && l.diasAtraso !== null && (
        <span className="shrink-0 text-xs text-red-600 font-medium whitespace-nowrap">
          {l.diasAtraso === 0 ? 'Hoje' : `${l.diasAtraso}d atraso`}
        </span>
      )}

      {/* Valor */}
      <span className={`shrink-0 tabular-nums text-sm font-semibold ${classeValor(l.tipo)}`}>
        {l.tipo === 'PAGAR' ? '−' : '+'}{formatarReais(l.valor)}
      </span>
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

type FiltroTipo = 'TODOS' | 'RECEBER' | 'PAGAR'

export default function FluxoCaixaPage() {
  const [dias, setDias]           = useState(30)
  const [filtro, setFiltro]       = useState<FiltroTipo>('TODOS')
  const [soVencidos, setSoVencidos] = useState(false)

  const { data, isLoading, isError } = useFluxoCaixa(dias)

  // Agrupa lançamentos por data de vencimento
  const grupos = useMemo(() => {
    if (!data || typeof data !== 'object' || !('lancamentos' in data)) return []
    const lance = (data.lancamentos ?? []).filter((l) => {
      if (filtro !== 'TODOS' && l.tipo !== filtro) return false
      if (soVencidos && !l.vencido) return false
      return true
    })

    const mapa = new Map<string, LancamentoFluxo[]>()
    for (const l of lance) {
      const arr = mapa.get(l.dataVencimento) ?? []
      arr.push(l)
      mapa.set(l.dataVencimento, arr)
    }
    return Array.from(mapa.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [data, filtro, soVencidos])

  const temVencido = (parseFloat(data?.totalVencidoReceber ?? '0') + parseFloat(data?.totalVencidoPagar ?? '0')) > 0

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Fluxo de Caixa</h1>
        <p className="text-sm text-muted-foreground">Vencimentos em aberto — vencidos e próximos</p>
      </div>

      {/* Alerta de vencidos */}
      {!isLoading && temVencido && (
        <div className="flex items-start gap-3 rounded-lg border border-orange-300 bg-orange-50 px-4 py-3 text-sm text-orange-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
          <span>
            Existem títulos vencidos. Verifique os lançamentos marcados em vermelho abaixo.
          </span>
        </div>
      )}

      {/* Cards de totais */}
      {data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <CardTotal
            label="Vencidos a receber"
            valor={data.totalVencidoReceber}
            icon={<AlertTriangle className="h-6 w-6" />}
            variant="vencido-receber"
          />
          <CardTotal
            label="Vencidos a pagar"
            valor={data.totalVencidoPagar}
            icon={<AlertTriangle className="h-6 w-6" />}
            variant="vencido-pagar"
          />
          <CardTotal
            label={`A receber (${dias}d)`}
            valor={data.totalProximosReceber}
            icon={<TrendingUp className="h-6 w-6" />}
            variant="receber"
          />
          <CardTotal
            label={`A pagar (${dias}d)`}
            valor={data.totalProximosPagar}
            icon={<TrendingDown className="h-6 w-6" />}
            variant="pagar"
          />
        </div>
      )}

      {/* Barra de controles */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-2.5">
        {/* Horizonte de dias */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-xs font-medium text-muted-foreground">Horizonte:</span>
          {[15, 30, 60, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDias(d)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                dias === d
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-white border border-border text-gray-600 hover:bg-muted/50'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-border" />

        {/* Filtro tipo */}
        {(['TODOS', 'RECEBER', 'PAGAR'] as FiltroTipo[]).map((t) => (
          <button
            key={t}
            onClick={() => setFiltro(t)}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              filtro === t
                ? 'bg-gray-800 text-white'
                : 'bg-white border border-border text-gray-600 hover:bg-muted/50'
            }`}
          >
            {t === 'TODOS' ? 'Todos' : t === 'RECEBER' ? 'A Receber' : 'A Pagar'}
          </button>
        ))}

        <div className="h-4 w-px bg-border" />

        {/* Somente vencidos */}
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-700">
          <input
            type="checkbox"
            checked={soVencidos}
            onChange={(e) => setSoVencidos(e.target.checked)}
            className="h-3.5 w-3.5 accent-primary"
          />
          Somente vencidos
        </label>

        {data && (
          <span className="ml-auto text-xs text-muted-foreground">
            {grupos.reduce((acc, [, l]) => acc + l.length, 0)} lançamentos em {grupos.length} datas
          </span>
        )}
      </div>

      {isLoading && (
        <div className="flex h-40 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-red-600">Erro ao carregar fluxo de caixa.</p>
      )}

      {!isLoading && !isError && grupos.length === 0 && (
        <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
          <CalendarClock className="h-8 w-8" />
          <p className="text-sm">Nenhum lançamento encontrado para o período.</p>
        </div>
      )}

      {/* Timeline por data */}
      {grupos.length > 0 && (
        <div className="space-y-4">
          {grupos.map(([data, lancamentos]) => {
            const totalDia = lancamentos.reduce((acc, l) => {
              const v = parseFloat(l.valor)
              return acc + (l.tipo === 'RECEBER' ? v : -v)
            }, 0)
            const eVencido = lancamentos[0]?.vencido

            return (
              <div key={data}>
                {/* Cabeçalho do grupo */}
                <div className={`mb-2 flex items-center gap-2 ${eVencido ? 'text-red-700' : 'text-gray-700'}`}>
                  <span className={`text-xs font-semibold uppercase tracking-wide ${eVencido ? 'text-red-500' : 'text-muted-foreground'}`}>
                    {eVencido ? '⚠ ' : ''}{formatarData(data)}
                  </span>
                  <div className="flex-1 border-t border-dashed border-border" />
                  <span className={`text-xs font-semibold tabular-nums ${
                    totalDia >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {totalDia >= 0 ? '+' : ''}{totalDia.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>

                {/* Lançamentos */}
                <div className="space-y-1.5">
                  {lancamentos.map((l) => (
                    <LinhaLancamento key={l.parcelaId} l={l} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
