import React, { useState } from 'react'
import { AlertTriangle, ArrowDownCircle, Lock, Unlock, Wallet } from 'lucide-react'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { Button } from '@/shared/components/ui/Button'
import { useCaixa } from '../hooks/useCaixa'
import { useTurno, useAbrirCaixa, useFecharCaixa, useRegistrarSangria, useReabrirCaixa } from '../hooks/useTurno'
import type { TurnoCaixaResponse } from '@/shared/api/turno'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatarReais(v: string | number) {
  const n = typeof v === 'string' ? parseFloat(v) : v
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function hojeIso() {
  return new Date().toISOString().slice(0, 10)
}

// ── Linha de resumo ───────────────────────────────────────────────────────────

function LinhaResumo({ label, valor, destaque, negativo }: {
  label: string
  valor: string
  destaque?: boolean
  negativo?: boolean
}) {
  return (
    <div className={`flex justify-between py-2 ${destaque ? 'border-t border-border mt-1 pt-3' : ''}`}>
      <span className={`text-sm ${destaque ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{label}</span>
      <span className={`tabular-nums text-sm font-medium ${
        destaque
          ? negativo ? 'text-destructive font-bold' : 'text-foreground font-bold'
          : negativo ? 'text-destructive' : 'text-foreground'
      }`}>
        {negativo && parseFloat(valor) !== 0 ? '−' : ''}{formatarReais(Math.abs(parseFloat(valor)).toString())}
      </span>
    </div>
  )
}

// ── Modal de abertura ─────────────────────────────────────────────────────────

function ModalAbertura({ onClose }: { onClose: () => void }) {
  const { mutate, isPending } = useAbrirCaixa()
  const [valor, setValor] = useState('0,00')
  const [erro, setErro] = useState<string | null>(null)

  function handleAbrir() {
    setErro(null)
    const v = parseFloat(valor.replace(',', '.'))
    mutate(
      { valorAbertura: isNaN(v) ? 0 : v },
      {
        onSuccess: onClose,
        onError: (e: unknown) => setErro((e as any)?.response?.data?.erro ?? 'Erro ao abrir caixa.'),
      },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-lg bg-card text-card-foreground shadow-xl p-6 space-y-5 border border-border">
        <div>
          <h2 className="text-lg font-semibold">Abrir Caixa</h2>
          <p className="text-sm text-muted-foreground">Informe o fundo de troco disponível no caixa.</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">Fundo de abertura (R$)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="w-full rounded-md border border-border px-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40"
            autoFocus
          />
          <p className="mt-1 text-xs text-muted-foreground">Deixe 0 caso não haja fundo inicial.</p>
        </div>
        {erro && <p className="text-sm text-destructive">{erro}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isPending}>Cancelar</Button>
          <Button onClick={handleAbrir} disabled={isPending}>
            {isPending ? 'Abrindo…' : 'Abrir Caixa'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Modal de sangria ──────────────────────────────────────────────────────────

function ModalSangria({ onClose }: { onClose: () => void }) {
  const { mutate, isPending } = useRegistrarSangria()
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  function handleRegistrar() {
    setErro(null)
    const v = parseFloat(valor.replace(',', '.'))
    if (!descricao.trim()) { setErro('Informe a descrição.'); return }
    if (isNaN(v) || v <= 0) { setErro('Valor deve ser positivo.'); return }
    mutate(
      { descricao: descricao.trim(), valor: v },
      {
        onSuccess: onClose,
        onError: (e: unknown) => setErro((e as any)?.response?.data?.erro ?? 'Erro ao registrar sangria.'),
      },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-lg bg-card text-card-foreground shadow-xl p-6 space-y-4 border border-border">
        <div>
          <h2 className="text-lg font-semibold">Registrar Saída</h2>
          <p className="text-sm text-muted-foreground">Saída de dinheiro do caixa (sangria).</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Descrição *</label>
            <input
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Abastecimento, Pagamento funcionário…"
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Valor (R$) *</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>
        {erro && <p className="text-sm text-destructive">{erro}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isPending}>Cancelar</Button>
          <Button variant="destructive" onClick={handleRegistrar} disabled={isPending}>
            {isPending ? 'Registrando…' : 'Registrar Saída'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Modal de fechamento ───────────────────────────────────────────────────────

function ModalFechamento({ turno, onClose }: { turno: TurnoCaixaResponse; onClose: () => void }) {
  const { mutate, isPending } = useFecharCaixa()
  const [valor, setValor] = useState(turno.saldoEsperado
    ? parseFloat(turno.saldoEsperado).toFixed(2)
    : '')
  const [observacao, setObservacao] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  const diferenca = valor
    ? parseFloat(valor.replace(',', '.')) - parseFloat(turno.saldoEsperado)
    : null

  function handleFechar() {
    setErro(null)
    const v = parseFloat(valor.replace(',', '.'))
    if (isNaN(v)) { setErro('Informe o valor contado.'); return }
    mutate(
      { valorFechamento: v, observacao: observacao.trim() || undefined },
      {
        onSuccess: onClose,
        onError: (e: unknown) => setErro((e as any)?.response?.data?.erro ?? 'Erro ao fechar caixa.'),
      },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-lg bg-card text-card-foreground shadow-xl p-6 space-y-4 border border-border">
        <div>
          <h2 className="text-lg font-semibold">Fechar Caixa</h2>
          <p className="text-sm text-muted-foreground">Informe o valor físico contado no caixa.</p>
        </div>

        <div className="rounded-md bg-muted/40 px-4 py-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Saldo esperado</span>
            <span className="font-medium tabular-nums">{formatarReais(turno.saldoEsperado)}</span>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Valor contado (R$) *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40"
              autoFocus
            />
          </div>
          {diferenca !== null && !isNaN(diferenca) && (
            <p className={`text-sm font-medium ${diferenca < 0 ? 'text-destructive' : diferenca > 0 ? 'text-success' : 'text-muted-foreground'}`}>
              {diferenca === 0
                ? 'Caixa exato — sem diferença.'
                : diferenca > 0
                  ? `Sobra de ${formatarReais(diferenca.toString())}`
                  : `Falta de ${formatarReais(Math.abs(diferenca).toString())}`}
            </p>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Observação</label>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={2}
              placeholder="Opcional…"
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
          </div>
        </div>

        {erro && <p className="text-sm text-destructive">{erro}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isPending}>Cancelar</Button>
          <Button onClick={handleFechar} disabled={isPending}>
            {isPending ? 'Fechando…' : 'Confirmar Fechamento'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Painel do turno ───────────────────────────────────────────────────────────

function PainelTurno({ turno }: { turno: TurnoCaixaResponse }) {
  const [modalSangria,    setModalSangria]    = useState(false)
  const [modalFechamento, setModalFechamento] = useState(false)
  const { mutate: reabrir, isPending: reabrindo } = useReabrirCaixa()

  const aberto   = turno.status === 'ABERTO'
  const diferenca = turno.diferenca ? parseFloat(turno.diferenca) : null

  return (
    <div className="space-y-5">
      {/* Status header */}
      <div className={`flex items-center gap-3 rounded-lg px-5 py-3 ${aberto ? 'bg-success/10 border border-success/30' : 'bg-muted/40 border border-border'}`}>
        {aberto
          ? <Unlock className="h-5 w-5 text-success" />
          : <Lock className="h-5 w-5 text-muted-foreground" />}
        <div className="flex-1">
          <p className={`text-sm font-semibold ${aberto ? 'text-success' : 'text-foreground'}`}>
            {aberto ? 'Caixa aberto' : 'Caixa fechado'}
          </p>
          <p className="text-xs text-muted-foreground">
            {new Date(turno.data + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </p>
        </div>
        {aberto ? (
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setModalSangria(true)} className="gap-1">
              <ArrowDownCircle className="h-4 w-4" />
              Saída
            </Button>
            <Button size="sm" onClick={() => setModalFechamento(true)} className="gap-1">
              <Lock className="h-4 w-4" />
              Fechar Caixa
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => reabrir()} disabled={reabrindo} className="gap-1">
            <Unlock className="h-4 w-4" />
            {reabrindo ? 'Reabrindo…' : 'Reabrir Caixa'}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Apuração */}
        <Card>
          <CardContent className="p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Apuração do Caixa</p>
            <div className="divide-y divide-border">
              <LinhaResumo label="Fundo de abertura"     valor={turno.valorAbertura} />
              <LinhaResumo label="Entradas em dinheiro"  valor={turno.totalEntradas} />
              <LinhaResumo label="Total de saídas"       valor={turno.totalSangrias} negativo />
              <LinhaResumo label="Saldo esperado"        valor={turno.saldoEsperado} destaque />
              {turno.valorFechamento !== null && (
                <>
                  <LinhaResumo label="Valor contado"     valor={turno.valorFechamento} />
                  {diferenca !== null && (
                    <LinhaResumo
                      label={diferenca >= 0 ? 'Sobra' : 'Falta'}
                      valor={Math.abs(diferenca).toString()}
                      destaque
                      negativo={diferenca < 0}
                    />
                  )}
                </>
              )}
            </div>
            {turno.observacao && (
              <p className="mt-3 text-xs text-muted-foreground italic">{turno.observacao}</p>
            )}
          </CardContent>
        </Card>

        {/* Saídas */}
        <Card>
          <CardContent className="p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Saídas registradas {turno.sangrias.length > 0 && `(${turno.sangrias.length})`}
            </p>
            {turno.sangrias.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhuma saída registrada.</p>
            ) : (
              <div className="space-y-2">
                {turno.sangrias.map((s) => (
                  <div key={s.id} className="flex items-start justify-between gap-2 rounded-md bg-muted/30 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{s.descricao}</p>
                      <p className="text-xs text-muted-foreground">{formatarHora(s.createdAt)}</p>
                    </div>
                    <span className="shrink-0 tabular-nums text-sm font-semibold text-destructive">
                      −{formatarReais(s.valor)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="text-sm font-semibold text-foreground">Total saídas</span>
                  <span className="tabular-nums text-sm font-bold text-destructive">
                    −{formatarReais(turno.totalSangrias)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerta de diferença */}
      {!aberto && diferenca !== null && diferenca !== 0 && (
        <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
          diferenca < 0
            ? 'border-destructive/30 bg-destructive/10 text-destructive'
            : 'border-success/30 bg-success/10 text-success'
        }`}>
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {diferenca < 0
              ? `Falta ${formatarReais(Math.abs(diferenca).toString())} em relação ao saldo esperado.`
              : `Sobra ${formatarReais(diferenca.toString())} em relação ao saldo esperado.`}
          </span>
        </div>
      )}

      {modalSangria    && <ModalSangria    onClose={() => setModalSangria(false)} />}
      {modalFechamento && <ModalFechamento turno={turno} onClose={() => setModalFechamento(false)} />}
    </div>
  )
}

// ── Resumo de vendas (reutiliza CaixaDia) ────────────────────────────────────

const FORMA_LABEL: Record<string, string> = {
  DINHEIRO:       'Dinheiro',
  CARTAO_DEBITO:  'Débito',
  CARTAO_CREDITO: 'Crédito',
  PIX:            'PIX',
  BOLETO:         'Boleto',
  CHEQUE:         'Cheque',
  FIADO:          'Fiado',
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function CaixaPage() {
  const [data,        setData]        = useState(hojeIso())
  const [modalAbertura, setModalAbertura] = useState(false)

  const { data: turno,  isLoading: loadingTurno  } = useTurno(data === hojeIso() ? undefined : data)
  const { data: caixa,  isLoading: loadingCaixa  } = useCaixa(data)

  const isHoje = data === hojeIso()

  return (
    <div className="space-y-5">
      <PageHeader title="Caixa" subtitle="Abertura, saídas e fechamento do dia" />

      {/* Seletor de data */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-foreground">Data:</label>
        <input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className="rounded-md border border-border bg-input text-foreground px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        {!isHoje && (
          <button
            onClick={() => setData(hojeIso())}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            Hoje
          </button>
        )}
      </div>

      {loadingTurno ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : turno ? (
        <PainelTurno turno={turno} />
      ) : isHoje ? (
        /* Caixa não aberto hoje */
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-border py-16">
          <Wallet className="h-10 w-10 text-muted-foreground" />
          <div className="text-center">
            <p className="font-semibold text-foreground">Caixa não foi aberto hoje</p>
            <p className="text-sm text-muted-foreground">Abra o caixa para registrar o fundo inicial e habilitar saídas.</p>
          </div>
          <Button onClick={() => setModalAbertura(true)} className="gap-2">
            <Unlock className="h-4 w-4" />
            Abrir Caixa
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">Nenhum turno registrado para esta data.</p>
      )}

      {/* Resumo de vendas do dia */}
      {!loadingCaixa && caixa && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Vendas do Dia
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Card className="col-span-2 sm:col-span-1">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="mt-1 text-xl font-bold tabular-nums">{formatarReais(caixa.totalVendas)}</p>
                <p className="text-xs text-muted-foreground">{caixa.quantidadeVendas} vendas</p>
              </CardContent>
            </Card>
            {caixa.resumoPorForma.map((r) => (
              <Card key={r.formaPagamento}>
                <CardContent className="p-4">
                  <p className="text-xs font-medium text-muted-foreground">{FORMA_LABEL[r.formaPagamento] ?? r.formaPagamento}</p>
                  <p className="mt-1 text-lg font-bold tabular-nums">{formatarReais(r.total)}</p>
                  <p className="text-xs text-muted-foreground">{r.quantidade} {r.quantidade === 1 ? 'venda' : 'vendas'}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {modalAbertura && <ModalAbertura onClose={() => setModalAbertura(false)} />}
    </div>
  )
}
