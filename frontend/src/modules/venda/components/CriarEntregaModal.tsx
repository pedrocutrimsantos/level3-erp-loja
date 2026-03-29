import React, { useState } from 'react'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { useCriarEntrega } from '@/modules/entrega/hooks/useEntregas'
import type { CriarEntregaRequest, EntregaResponse } from '@/shared/api/entregas'

interface Props {
  vendaId: string
  vendaNumero: string
  onClose: () => void
}

const TURNOS = [
  { value: 'MANHA',   label: 'Manhã' },
  { value: 'TARDE',   label: 'Tarde' },
  { value: 'DIA_TODO', label: 'Dia todo' },
]

export function CriarEntregaModal({ vendaId, vendaNumero, onClose }: Props) {
  const { mutate, isPending } = useCriarEntrega()
  const [enderecoEntrega, setEnderecoEntrega] = useState('')
  const [observacao, setObservacao]           = useState('')
  const [dataAgendada, setDataAgendada]       = useState('')
  const [turno, setTurno]                     = useState<CriarEntregaRequest['turno']>(undefined)
  const [motorista, setMotorista]             = useState('')
  const [erro, setErro]                       = useState<string | null>(null)
  const [resultado, setResultado]             = useState<EntregaResponse | null>(null)

  function handleCriar() {
    setErro(null)
    mutate(
      {
        vendaId,
        req: {
          enderecoEntrega: enderecoEntrega.trim() || undefined,
          observacao:      observacao.trim() || undefined,
          dataAgendada:    dataAgendada || undefined,
          turno:           turno || undefined,
          motorista:       motorista.trim() || undefined,
        },
      },
      {
        onSuccess: (data) => setResultado(data),
        onError: (e: unknown) => setErro((e as Error)?.message ?? 'Erro ao criar entrega.'),
      },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-card dark:bg-[#161d27] shadow-xl flex flex-col border border-border dark:border-[#243040]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border dark:border-[#243040] px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground dark:text-[#e2e8f0]">Gerar Romaneio de Entrega</h2>
            <p className="text-sm text-muted-foreground dark:text-[#94a3b8]">Venda {vendaNumero}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {resultado ? (
            <div className="rounded-lg border border-success/30 bg-success/10 p-5 space-y-2 text-sm">
              <p className="font-semibold text-success text-base">Entrega criada!</p>
              <p className="text-success">
                Romaneio: <span className="font-mono font-bold">{resultado.numero}</span>
              </p>
              {resultado.dataAgendada && (
                <p className="text-success">
                  Agendada para:{' '}
                  <span className="font-medium">
                    {new Date(resultado.dataAgendada + 'T00:00:00').toLocaleDateString('pt-BR')}
                    {resultado.turno && ` — ${TURNOS.find((t) => t.value === resultado.turno)?.label}`}
                  </span>
                </p>
              )}
              <p className="text-success">
                {resultado.itens.length}{' '}
                {resultado.itens.length === 1 ? 'item' : 'itens'} aguardando entrega.
              </p>
              <p className="text-xs text-muted-foreground dark:text-[#94a3b8]">
                Confirme a entrega na página de Entregas após a conclusão.
              </p>
            </div>
          ) : (
            <>
              <Input
                label="Endereço de entrega"
                placeholder="Rua, número, bairro, cidade..."
                value={enderecoEntrega}
                onChange={(e) => setEnderecoEntrega(e.target.value)}
              />

              {/* Agendamento */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-foreground/80 dark:text-[#e2e8f0]/80">
                    Data prevista
                  </label>
                  <input
                    type="date"
                    value={dataAgendada}
                    onChange={(e) => setDataAgendada(e.target.value)}
                    className="w-full rounded-md border border-border bg-input dark:bg-[#0d1117] dark:border-[#243040] dark:text-[#e2e8f0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-foreground/80 dark:text-[#e2e8f0]/80">
                    Turno
                  </label>
                  <select
                    value={turno ?? ''}
                    onChange={(e) => setTurno((e.target.value as CriarEntregaRequest['turno']) || undefined)}
                    className="w-full rounded-md border border-border bg-input dark:bg-[#0d1117] dark:border-[#243040] dark:text-[#e2e8f0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Qualquer</option>
                    {TURNOS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <Input
                label="Motorista (opcional)"
                placeholder="Nome do responsável pela entrega"
                value={motorista}
                onChange={(e) => setMotorista(e.target.value)}
              />

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-foreground/80 dark:text-[#e2e8f0]/80">
                  Observação (opcional)
                </label>
                <textarea
                  className="w-full rounded-md border border-border bg-background dark:bg-[#0d1117] dark:border-[#243040] dark:text-[#e2e8f0] dark:placeholder:text-[#94a3b8] px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={2}
                  placeholder="Instruções para o motorista..."
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                />
              </div>

              {erro && <p className="text-sm text-destructive">{erro}</p>}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-border dark:border-[#243040] px-6 py-4">
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            {resultado ? 'Fechar' : 'Cancelar'}
          </Button>
          {!resultado && (
            <Button onClick={handleCriar} disabled={isPending}>
              {isPending ? 'Criando...' : 'Gerar Romaneio'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
