import React from 'react'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/shared/components/ui/Table'
import { Badge } from '@/shared/components/ui/Badge'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import { formatarM3 } from '@/shared/utils/conversaoMadeira'
import { ArrowLeftRight } from 'lucide-react'
import type { MovimentacaoResponse } from '@/shared/api/estoque'

export interface MovimentacaoTableProps {
  movimentacoes: MovimentacaoResponse[]
}

const TIPO_LABEL: Record<string, string> = {
  ENTRADA_COMPRA:       'Entrada Compra',
  SAIDA_VENDA:          'Saída Venda',
  AJUSTE_POSITIVO:      'Ajuste (+)',
  AJUSTE_NEGATIVO:      'Ajuste (-)',
  RESERVA:              'Reserva',
  LIBERACAO_RESERVA:    'Lib. Reserva',
  PERDA:                'Perda',
  TRANSFERENCIA_SAIDA:  'Transf. Saída',
  TRANSFERENCIA_ENTRADA:'Transf. Entrada',
  SOBRA_ENTRADA:        'Sobra Entrada',
  DEVOLUCAO_ENTRADA:    'Dev. Entrada',
  DEVOLUCAO_SAIDA:      'Dev. Saída',
}

function formatarDataHora(dataHora: string): string {
  return new Date(dataHora).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function MovimentacaoTable({ movimentacoes }: MovimentacaoTableProps) {
  if (movimentacoes.length === 0) {
    return (
      <EmptyState
        icon={<ArrowLeftRight className="h-6 w-6" />}
        title="Nenhuma movimentação registrada"
        description="As movimentações de estoque aparecerão aqui."
      />
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data / Hora</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Quantidade</TableHead>
          <TableHead>Saldo antes → depois</TableHead>
          <TableHead>Observação</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {movimentacoes.map((mov) => {
          const isEntrada = mov.sinal === 'POSITIVO'
          const isMadeira = mov.quantidadeM3 != null
          const qtdM3 = mov.quantidadeM3 != null ? parseFloat(mov.quantidadeM3) : null
          const qtdUnd = mov.quantidadeUnidade != null ? parseFloat(mov.quantidadeUnidade) : null
          const antes = mov.saldoAntesM3 != null ? parseFloat(mov.saldoAntesM3) : null
          const depois = mov.saldoDepoisM3 != null ? parseFloat(mov.saldoDepoisM3) : null

          return (
            <TableRow key={mov.id}>
              <TableCell className="whitespace-nowrap text-sm text-foreground/80">
                {formatarDataHora(mov.dataHora)}
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-0.5">
                  <Badge variant={isEntrada ? 'success' : 'destructive'}>
                    {isEntrada ? 'Entrada' : 'Saída'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {TIPO_LABEL[mov.tipoMovimentacao] ?? mov.tipoMovimentacao}
                  </span>
                </div>
              </TableCell>
              <TableCell className="tabular-nums font-medium">
                {isMadeira && qtdM3 != null ? (
                  <span className={isEntrada ? 'text-green-700' : 'text-red-700'}>
                    {isEntrada ? '+' : '−'}{formatarM3(qtdM3)} m³
                  </span>
                ) : qtdUnd != null ? (
                  <span className={isEntrada ? 'text-green-700' : 'text-red-700'}>
                    {isEntrada ? '+' : '−'}{qtdUnd.toLocaleString('pt-BR', { maximumFractionDigits: 4 })}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="tabular-nums text-sm text-foreground/80">
                {isMadeira && antes != null && depois != null ? (
                  <span>
                    {formatarM3(antes)} m³{' '}
                    <span className="text-muted-foreground">→</span>{' '}
                    <span className={isEntrada ? 'text-green-700' : 'text-red-700'}>
                      {formatarM3(depois)} m³
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="max-w-xs text-sm text-muted-foreground">
                {mov.observacao
                  ? mov.observacao.length > 45
                    ? mov.observacao.slice(0, 45) + '…'
                    : mov.observacao
                  : '—'}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
