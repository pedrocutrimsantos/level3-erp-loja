import React, { useState } from 'react'
import { MessageSquare, Send, Clock, AlertTriangle, CheckCircle, XCircle, Phone } from 'lucide-react'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/shared/components/ui/Table'
import {
  useCobrancaPendentes,
  useCobrancaHistorico,
  useDispararLote,
  useDispararUnica,
} from '../hooks/useCobranca'
import type { ParcelaPendenteDto, ResultadoDisparoDto } from '@/shared/api/cobranca'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtData(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR')
}

function fmtReais(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR')
}

function labelDiasAtraso(dias: number): string {
  if (dias === -1) return 'Vence amanhã'
  if (dias === 0) return 'Vence hoje'
  if (dias === 1) return '1 dia em atraso'
  if (dias > 0) return `${dias} dias em atraso`
  return `em ${Math.abs(dias)} dias`
}

function variantDiasAtraso(dias: number): 'default' | 'warning' | 'destructive' | 'success' {
  if (dias < 0) return 'success'
  if (dias === 0) return 'warning'
  if (dias <= 7) return 'warning'
  return 'destructive'
}

// ── Componente de resultado ───────────────────────────────────────────────────

function ResultadoCard({ resultado, onFechar }: { resultado: ResultadoDisparoDto; onFechar: () => void }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm">Resultado do disparo</span>
        <button onClick={onFechar} className="text-muted-foreground hover:text-foreground text-xs">fechar</button>
      </div>
      <div className="flex gap-6 text-sm">
        <span className="flex items-center gap-1 text-green-600">
          <CheckCircle className="h-4 w-4" /> {resultado.enviados} enviados
        </span>
        <span className="flex items-center gap-1 text-yellow-600">
          <Phone className="h-4 w-4" /> {resultado.semFone} sem fone
        </span>
        <span className="flex items-center gap-1 text-red-600">
          <XCircle className="h-4 w-4" /> {resultado.erros} erros
        </span>
      </div>
      {resultado.detalhes.length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
          {resultado.detalhes.map((d, i) => <li key={i}>• {d}</li>)}
        </ul>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

type Tab = 'pendentes' | 'historico'

export default function CobrancaPage() {
  const [aba, setAba] = useState<Tab>('pendentes')
  const [resultado, setResultado] = useState<ResultadoDisparoDto | null>(null)

  const { data: pendentes = [], isLoading: loadPend } = useCobrancaPendentes()
  const { data: historico = [], isLoading: loadHist } = useCobrancaHistorico(200)

  const dispararLote  = useDispararLote()
  const dispararUnica = useDispararUnica()

  function handleDispararLote() {
    dispararLote.mutate(undefined, {
      onSuccess: (res) => setResultado(res),
    })
  }

  function handleDispararUnica(parcelaId: string) {
    dispararUnica.mutate(parcelaId, {
      onSuccess: (res) => setResultado(res),
    })
  }

  const semFone = pendentes.filter((p) => !p.temTelefone).length

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Régua de Cobrança"
        subtitle="Envio automático de lembretes de vencimento via WhatsApp"
        actions={
          <Button
            onClick={handleDispararLote}
            disabled={dispararLote.isPending}
            className="flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            {dispararLote.isPending ? 'Disparando...' : 'Disparar tudo agora'}
          </Button>
        }
      />

      {resultado && (
        <ResultadoCard resultado={resultado} onFechar={() => setResultado(null)} />
      )}

      {/* Abas */}
      <div className="flex border-b border-border gap-6">
        {(['pendentes', 'historico'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setAba(t)}
            className={`pb-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              aba === t
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'pendentes' ? `Pendentes hoje (${pendentes.length})` : `Histórico`}
          </button>
        ))}
      </div>

      {aba === 'pendentes' && (
        <>
          {semFone > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950 px-4 py-2 text-sm text-yellow-800 dark:text-yellow-200">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {semFone} parcela(s) sem telefone cadastrado — não serão enviadas
            </div>
          )}

          <Card>
            <CardContent className="p-0">
              {loadPend ? (
                <p className="p-6 text-sm text-muted-foreground">Carregando...</p>
              ) : pendentes.length === 0 ? (
                <EmptyState
                  icon={<MessageSquare className="h-8 w-8" />}
                  title="Nenhuma cobrança pendente hoje"
                  description="Não há parcelas nos dias da régua para hoje."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Situação</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendentes.map((p) => (
                      <TableRow key={p.parcelaId}>
                        <TableCell className="font-mono text-xs">{p.tituloNumero}</TableCell>
                        <TableCell>{p.clienteNome ?? '—'}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {p.telefone ?? (
                            <span className="text-muted-foreground italic">sem telefone</span>
                          )}
                        </TableCell>
                        <TableCell>{fmtReais(p.valor)}</TableCell>
                        <TableCell>{fmtData(p.dataVencimento)}</TableCell>
                        <TableCell>
                          <Badge variant={variantDiasAtraso(p.diasAtraso)}>
                            {labelDiasAtraso(p.diasAtraso)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {p.temTelefone && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDispararUnica(p.parcelaId)}
                              disabled={dispararUnica.isPending}
                            >
                              <Send className="h-3 w-3 mr-1" />
                              Enviar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {aba === 'historico' && (
        <Card>
          <CardContent className="p-0">
            {loadHist ? (
              <p className="p-6 text-sm text-muted-foreground">Carregando...</p>
            ) : historico.length === 0 ? (
              <EmptyState
                icon={<Clock className="h-8 w-8" />}
                title="Nenhuma cobrança enviada ainda"
                description="O histórico aparecerá aqui após o primeiro disparo."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Enviado em</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Régua</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Mensagem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historico.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {fmtDataHora(h.enviadoEm)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{h.tituloId.slice(0, 8)}…</TableCell>
                      <TableCell className="font-mono text-xs">{h.telefone}</TableCell>
                      <TableCell className="text-xs">
                        {h.reguaDia === -1
                          ? 'Véspera'
                          : h.reguaDia === 0
                          ? 'Vencimento'
                          : `D+${h.reguaDia}`}
                      </TableCell>
                      <TableCell>
                        <Badge variant={h.status === 'ENVIADO' ? 'success' : 'destructive'}>
                          {h.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-xs text-muted-foreground" title={h.mensagem}>
                        {h.mensagem}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
