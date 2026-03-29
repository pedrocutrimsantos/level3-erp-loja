import React, { useState } from 'react'
import { FileCheck, Send, XCircle } from 'lucide-react'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/shared/components/ui/Table'
import { Modal } from '@/shared/components/ui/Modal'
import { useCancelarNfe, useEmitirNfe, useNfeLista, useNfePendentes } from '../hooks/useNfe'

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  PENDENTE:     'Pendente',
  AGUARDANDO:   'Aguardando',
  AUTORIZADA:   'Autorizada',
  REJEITADA:    'Rejeitada',
  CANCELADA:    'Cancelada',
  DENEGADA:     'Denegada',
  CONTINGENCIA: 'Contingência',
  INUTILIZADA:  'Inutilizada',
}

const STATUS_COR: Record<string, string> = {
  AUTORIZADA:   'bg-green-100 text-green-800',
  PENDENTE:     'bg-yellow-100 text-yellow-800',
  AGUARDANDO:   'bg-blue-100 text-blue-800',
  REJEITADA:    'bg-red-100 text-red-800',
  CANCELADA:    'bg-gray-100 text-gray-600',
  DENEGADA:     'bg-red-200 text-red-900',
  CONTINGENCIA: 'bg-orange-100 text-orange-800',
  INUTILIZADA:  'bg-gray-100 text-gray-600',
}

const FORMA_LABEL: Record<string, string> = {
  DINHEIRO:       'Dinheiro',
  CARTAO_DEBITO:  'Débito',
  CARTAO_CREDITO: 'Crédito',
  PIX:            'PIX',
  BOLETO:         'Boleto',
  CHEQUE:         'Cheque',
  FIADO:          'Fiado',
}

function formatarReais(valor: string) {
  return parseFloat(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function NfePage() {
  const { data: nfs, isLoading: loadingNfs } = useNfeLista()
  const { data: pendentes, isLoading: loadingPend } = useNfePendentes()
  const emitir = useEmitirNfe()
  const cancelar = useCancelarNfe()

  const [modalCancelar, setModalCancelar] = useState<{ id: string; numero: number } | null>(null)
  const [justificativa, setJustificativa] = useState('')
  const [erroCancelar, setErroCancelar] = useState('')

  function handleCancelar() {
    if (!modalCancelar) return
    if (justificativa.trim().length < 15) {
      setErroCancelar('A justificativa deve ter pelo menos 15 caracteres.')
      return
    }
    cancelar.mutate(
      { id: modalCancelar.id, justificativa: justificativa.trim() },
      {
        onSuccess: () => {
          setModalCancelar(null)
          setJustificativa('')
          setErroCancelar('')
        },
        onError: (err: unknown) => {
          setErroCancelar(err instanceof Error ? err.message : 'Erro ao cancelar')
        },
      }
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="NF-e" subtitle="Emissão e controle de notas fiscais eletrônicas" />

      {/* Vendas pendentes de NF */}
      <Card>
        <CardContent className="p-5">
          <p className="mb-4 text-sm font-semibold text-gray-700">
            Vendas aguardando emissão de NF-e
          </p>

          {loadingPend ? (
            <div className="animate-pulse h-32 rounded bg-gray-100" />
          ) : !pendentes || pendentes.length === 0 ? (
            <EmptyState
              icon={<FileCheck className="h-5 w-5" />}
              title="Nenhuma venda pendente"
              description="Todas as vendas confirmadas já possuem NF-e emitida."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Forma</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendentes.map((v) => (
                  <TableRow key={v.vendaId}>
                    <TableCell className="font-mono text-sm font-medium">{v.vendaNumero}</TableCell>
                    <TableCell className="text-sm">
                      {v.clienteNome ?? <span className="text-muted-foreground">Consumidor final</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {v.formaPagamento ? FORMA_LABEL[v.formaPagamento] ?? v.formaPagamento : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatarDataHora(v.createdAt)}
                    </TableCell>
                    <TableCell className="tabular-nums text-sm font-semibold text-right">
                      {formatarReais(v.valorTotal)}
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => emitir.mutate(v.vendaId)}
                        disabled={emitir.isPending}
                        className="inline-flex items-center gap-1.5 rounded-md bg-primary-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
                      >
                        <Send className="h-3 w-3" />
                        Emitir NF-e
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* NF-e emitidas */}
      <Card>
        <CardContent className="p-0">
          {loadingNfs ? (
            <div className="animate-pulse m-5 h-40 rounded bg-gray-100" />
          ) : !nfs || nfs.length === 0 ? (
            <EmptyState
              icon={<FileCheck className="h-5 w-5" />}
              title="Nenhuma NF-e emitida"
              description="As notas emitidas aparecerão aqui."
              className="py-16"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>NF-e</TableHead>
                  <TableHead>Venda</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ambiente</TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead>Chave</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {nfs.map((nf) => (
                  <TableRow key={nf.id}>
                    <TableCell className="font-mono text-sm font-medium">
                      {nf.numero.toString().padStart(9, '0')}/{nf.serie}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {nf.vendaNumero ?? '—'}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COR[nf.statusSefaz] ?? 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABEL[nf.statusSefaz] ?? nf.statusSefaz}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${nf.ambiente === 'PRODUCAO' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-700'}`}>
                        {nf.ambiente === 'PRODUCAO' ? 'Produção' : 'Homologação'}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatarDataHora(nf.dataEmissao)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {nf.chaveAcesso
                        ? `${nf.chaveAcesso.slice(0, 8)}...${nf.chaveAcesso.slice(-4)}`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {nf.statusSefaz === 'AUTORIZADA' && (
                        <button
                          onClick={() => setModalCancelar({ id: nf.id, numero: nf.numero })}
                          className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <XCircle className="h-3 w-3" />
                          Cancelar
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal cancelamento */}
      {modalCancelar && (
        <Modal
          open={!!modalCancelar}
          title={`Cancelar NF ${modalCancelar.numero.toString().padStart(9, '0')}`}
          onClose={() => { setModalCancelar(null); setJustificativa(''); setErroCancelar('') }}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Justificativa <span className="text-muted-foreground font-normal">(mínimo 15 caracteres)</span>
              </label>
              <textarea
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                rows={3}
                value={justificativa}
                onChange={(e) => { setJustificativa(e.target.value); setErroCancelar('') }}
                placeholder="Motivo do cancelamento..."
              />
              {erroCancelar && <p className="mt-1 text-xs text-red-600">{erroCancelar}</p>}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setModalCancelar(null); setJustificativa(''); setErroCancelar('') }}
                className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted/50 transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={handleCancelar}
                disabled={cancelar.isPending}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {cancelar.isPending ? 'Cancelando...' : 'Confirmar cancelamento'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
