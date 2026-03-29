import React, { useState } from 'react'
import { useEntregas, useCancelarEntrega } from '../hooks/useEntregas'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/shared/components/ui/Table'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import { Printer, Truck, XCircle } from 'lucide-react'
import { ConfirmarEntregaModal } from '../components/ConfirmarEntregaModal'
import { entregasApi, type EntregaResumoResponse } from '@/shared/api/entregas'
import { imprimirRomaneio } from '../utils/imprimirRomaneio'

type Filtro = 'TODAS' | 'PENDENTE' | 'CONCLUIDA' | 'CANCELADA'

const STATUS_LABEL: Record<string, string> = {
  PENDENTE:  'Pendente',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
}

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'destructive' | 'warning' | 'outline'> = {
  PENDENTE:  'warning',
  CONCLUIDA: 'success',
  CANCELADA: 'destructive',
}

const TURNO_LABEL: Record<string, string> = {
  MANHA:   'Manhã',
  TARDE:   'Tarde',
  DIA_TODO: 'Dia todo',
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const FILTROS: { key: Filtro; label: string }[] = [
  { key: 'TODAS',     label: 'Todas' },
  { key: 'PENDENTE',  label: 'Pendentes' },
  { key: 'CONCLUIDA', label: 'Concluídas' },
  { key: 'CANCELADA', label: 'Canceladas' },
]

export default function EntregasPage() {
  const { data: entregas, isLoading, isError } = useEntregas()
  const { mutate: cancelar, isPending: cancelando } = useCancelarEntrega()

  const [confirmarId,  setConfirmarId]  = useState<string | null>(null)
  const [cancelarId,   setCancelarId]   = useState<string | null>(null)
  const [imprimindoId, setImprimindoId] = useState<string | null>(null)
  const [filtro,       setFiltro]       = useState<Filtro>('TODAS')
  const [erroCancel,   setErroCancel]   = useState<string | null>(null)

  const entregasFiltradas: EntregaResumoResponse[] = React.useMemo(() => {
    if (!entregas) return []
    return filtro === 'TODAS' ? entregas : entregas.filter((e) => e.status === filtro)
  }, [entregas, filtro])

  async function handleImprimir(id: string, clienteNome: string | null) {
    setImprimindoId(id)
    try {
      const entrega = await entregasApi.buscarPorId(id)
      imprimirRomaneio(entrega, clienteNome)
    } finally {
      setImprimindoId(null)
    }
  }

  function handleCancelar() {
    if (!cancelarId) return
    setErroCancel(null)
    cancelar(cancelarId, {
      onSuccess: () => setCancelarId(null),
      onError: (e: unknown) => setErroCancel((e as Error)?.message ?? 'Erro ao cancelar entrega.'),
    })
  }

  const counts = React.useMemo(() => {
    if (!entregas) return { PENDENTE: 0, CONCLUIDA: 0, CANCELADA: 0 }
    return entregas.reduce((acc, e) => {
      acc[e.status as keyof typeof acc] = (acc[e.status as keyof typeof acc] ?? 0) + 1
      return acc
    }, { PENDENTE: 0, CONCLUIDA: 0, CANCELADA: 0 })
  }, [entregas])

  return (
    <div className="space-y-4">
      <PageHeader
        title="Entregas"
        subtitle="Romaneios de entrega gerados a partir de vendas"
      />

      {/* Filtros */}
      <div className="flex gap-1 border-b border-border dark:border-[#243040]">
        {FILTROS.map(({ key, label }) => {
          const count = key === 'TODAS' ? (entregas?.length ?? 0) : counts[key as keyof typeof counts]
          return (
            <button
              key={key}
              onClick={() => setFiltro(key)}
              className={[
                'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
                filtro === key
                  ? 'border-primary text-primary dark:text-[#4ade80] dark:border-[#4ade80]'
                  : 'border-transparent text-muted-foreground dark:text-[#94a3b8] hover:text-foreground dark:hover:text-[#e2e8f0]',
              ].join(' ')}
            >
              {label}
              {count > 0 && (
                <span className="ml-1.5 rounded-full bg-muted dark:bg-[#243040] px-1.5 py-0.5 text-xs">
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {isLoading && (
        <div className="flex h-40 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-destructive">Erro ao carregar entregas.</p>
      )}

      {!isLoading && !isError && entregasFiltradas.length === 0 && (
        <EmptyState
          icon={<Truck className="h-6 w-6" />}
          title={filtro === 'TODAS' ? 'Nenhuma entrega registrada' : `Nenhuma entrega ${STATUS_LABEL[filtro]?.toLowerCase()}`}
          description={filtro === 'TODAS' ? 'Gere um romaneio a partir do Histórico de Vendas.' : 'Altere o filtro para ver outras entregas.'}
        />
      )}

      {!isLoading && !isError && entregasFiltradas.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Romaneio</TableHead>
              <TableHead>Venda</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Agendamento</TableHead>
              <TableHead>Motorista</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criada em</TableHead>
              <TableHead className="text-right">Itens</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {entregasFiltradas.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-mono text-sm font-medium">{e.numero}</TableCell>
                <TableCell className="font-mono text-sm">{e.vendaNumero}</TableCell>
                <TableCell className="text-sm">
                  {e.clienteNome ?? <span className="text-muted-foreground dark:text-[#94a3b8]">Consumidor final</span>}
                </TableCell>
                <TableCell className="text-sm whitespace-nowrap">
                  {e.dataAgendada ? (
                    <span>
                      {formatarData(e.dataAgendada + 'T00:00:00')}
                      {e.turno && (
                        <span className="ml-1 text-xs text-muted-foreground dark:text-[#94a3b8]">
                          {TURNO_LABEL[e.turno]}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground dark:text-[#94a3b8]">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {e.motorista ?? <span className="text-muted-foreground dark:text-[#94a3b8]">—</span>}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[e.status] ?? 'default'}>
                    {STATUS_LABEL[e.status] ?? e.status}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {formatarDataHora(e.createdAt)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {e.itensEntregues}/{e.totalItens}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {e.status === 'PENDENTE' && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmarId(e.id)}
                        >
                          Confirmar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setErroCancel(null); setCancelarId(e.id) }}
                          title="Cancelar entrega"
                          className="text-destructive hover:text-destructive"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleImprimir(e.id, e.clienteNome)}
                      disabled={imprimindoId === e.id}
                      title="Imprimir romaneio"
                    >
                      {imprimindoId === e.id
                        ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent inline-block" />
                        : <Printer className="h-3.5 w-3.5" />
                      }
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {confirmarId && (
        <ConfirmarEntregaModal
          entregaId={confirmarId}
          onClose={() => setConfirmarId(null)}
        />
      )}

      {/* Diálogo de cancelamento */}
      {cancelarId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-lg bg-card dark:bg-[#161d27] shadow-xl p-6 space-y-4 border border-border dark:border-[#243040]">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground dark:text-[#e2e8f0]">Cancelar entrega</h3>
                <p className="text-sm text-muted-foreground dark:text-[#94a3b8] mt-1">
                  Esta ação irá cancelar o romaneio e reverter o status da venda. Deseja continuar?
                </p>
              </div>
            </div>
            {erroCancel && <p className="text-sm text-destructive">{erroCancel}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setCancelarId(null)} disabled={cancelando}>
                Não
              </Button>
              <Button variant="destructive" onClick={handleCancelar} disabled={cancelando}>
                {cancelando ? 'Cancelando...' : 'Sim, cancelar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
