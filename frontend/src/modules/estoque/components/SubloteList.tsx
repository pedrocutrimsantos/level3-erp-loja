import React from 'react'
import { Badge } from '@/shared/components/ui/Badge'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import { formatarM3, formatarMetros } from '@/shared/utils/conversaoMadeira'
import { Layers } from 'lucide-react'
import type { SubloteResponse } from '@/shared/api/estoque'

export interface SubloteListProps {
  sublotes: SubloteResponse[]
}

function badgeTipo(tipo: SubloteResponse['tipo']) {
  switch (tipo) {
    case 'SOBRA':
      return <Badge variant="warning">Sobra</Badge>
    case 'SEGUNDA_QUALIDADE':
      return (
        <Badge
          variant="warning"
          className="bg-orange-100 text-orange-800 border-transparent"
        >
          2ª Qualidade
        </Badge>
      )
    default:
      return <Badge variant="default">Normal</Badge>
  }
}

export function SubloteList({ sublotes }: SubloteListProps) {
  if (sublotes.length === 0) {
    return (
      <EmptyState
        icon={<Layers className="h-6 w-6" />}
        title="Nenhum sublote disponível"
        description="Os sublotes de estoque disponíveis aparecerão aqui."
      />
    )
  }

  const ordenados = [...sublotes].sort(
    (a, b) => parseFloat(b.volumeM3Disponivel) - parseFloat(a.volumeM3Disponivel)
  )

  return (
    <div className="divide-y divide-border">
      {ordenados.map((sublote) => {
        const volume = parseFloat(sublote.volumeM3Disponivel)
        const comprimento = parseFloat(sublote.comprimentoM)

        return (
          <div key={sublote.id} className="flex items-center justify-between gap-4 py-3 px-1">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                {badgeTipo(sublote.tipo)}
                <span className="text-xs text-muted-foreground font-mono">
                  #{sublote.id.slice(0, 8)}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-gray-700">
                <span>
                  <span className="font-semibold">{formatarM3(volume)}</span> m³
                </span>
                {sublote.metrosLineares != null && (
                  <span>
                    <span className="font-semibold">
                      {formatarMetros(parseFloat(sublote.metrosLineares))}
                    </span>{' '}
                    m lineares
                  </span>
                )}
                <span>
                  Comprimento:{' '}
                  <span className="font-semibold">
                    {formatarMetros(comprimento)}
                  </span>{' '}
                  m
                </span>
                <span>
                  Peças:{' '}
                  <span className="font-semibold">{sublote.quantidadePecas}</span>
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
