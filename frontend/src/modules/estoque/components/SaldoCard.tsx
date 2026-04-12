import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card'
import { Badge } from '@/shared/components/ui/Badge'
import { formatarM3, formatarMetros } from '@/shared/utils/conversaoMadeira'
import { useSaldoEstoque } from '../hooks/useEstoque'

export interface SaldoCardProps {
  produtoId: string
  tipo: 'MADEIRA' | 'NORMAL'
}

function SaldoSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-8 w-40 rounded bg-muted" />
      <div className="h-5 w-28 rounded bg-muted/70" />
      <div className="h-4 w-52 rounded bg-muted/50" />
    </div>
  )
}

export function SaldoCard({ produtoId, tipo }: SaldoCardProps) {
  const { data: saldo, isLoading, isError } = useSaldoEstoque(produtoId)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saldo em Estoque</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <SaldoSkeleton />
        ) : isError || !saldo ? (
          <p className="text-sm text-destructive">
            Erro ao carregar saldo. Tente novamente.
          </p>
        ) : tipo === 'NORMAL' ? (
          <NormalSaldo saldo={saldo} />
        ) : (
          <MadeiraSaldo saldo={saldo} />
        )}
      </CardContent>
    </Card>
  )
}

function MadeiraSaldo({
  saldo,
}: {
  saldo: NonNullable<ReturnType<typeof useSaldoEstoque>['data']>
}) {
  const saldoNum = parseFloat(saldo.saldoM3)
  const statusVariant = saldoNum <= 0 ? 'destructive' as const : 'success' as const
  const statusLabel = saldoNum <= 0 ? 'Sem estoque' : 'Em estoque'

  const metrosLineares = saldo.saldoMetrosLineares != null ? parseFloat(saldo.saldoMetrosLineares) : null
  const pecas = saldo.saldoPecas ?? null

  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-3xl font-bold text-foreground dark:text-[#e2e8f0]">
          {formatarM3(saldoNum)}
        </span>
        <span className="text-lg text-muted-foreground">m³</span>
        <Badge variant={statusVariant}>{statusLabel}</Badge>
      </div>

      {metrosLineares != null && (
        <p className="text-sm text-muted-foreground">
          ≈{' '}
          <span className="font-medium text-foreground dark:text-[#e2e8f0]">
            {formatarMetros(metrosLineares)}
          </span>{' '}
          metros lineares
        </p>
      )}

      {pecas != null && (
        <p className="text-sm text-muted-foreground">
          ≈{' '}
          <span className="font-semibold text-foreground dark:text-[#e2e8f0]">
            {pecas.toLocaleString('pt-BR')}
          </span>{' '}
          {pecas === 1 ? 'peça' : 'peças'}
          {saldo.comprimentoPecaM && (
            <span className="ml-1 text-xs opacity-60">
              ({saldo.comprimentoPecaM} m/peça)
            </span>
          )}
        </p>
      )}

      {saldo.custoMedioM3 != null && (
        <p className="text-sm text-muted-foreground">
          Custo médio:{' '}
          <span className="font-medium text-foreground dark:text-[#e2e8f0]">
            R$ {parseFloat(saldo.custoMedioM3).toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
            /m³
          </span>
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Atualizado em{' '}
        {new Date(saldo.dataUltimaAtualizacao).toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </p>
    </div>
  )
}

function NormalSaldo({ saldo }: { saldo: NonNullable<ReturnType<typeof useSaldoEstoque>['data']> }) {
  const saldoNum = saldo.saldoUnidade != null ? parseFloat(saldo.saldoUnidade) : 0
  const unidade = saldo.unidadeSigla ?? 'UN'
  const statusVariant = saldoNum <= 0 ? 'destructive' as const : 'success' as const
  const statusLabel = saldoNum <= 0 ? 'Sem estoque' : 'Em estoque'

  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-3xl font-bold text-foreground dark:text-[#e2e8f0]">
          {saldoNum.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
        </span>
        <span className="text-lg text-muted-foreground">{unidade}</span>
        <Badge variant={statusVariant}>{statusLabel}</Badge>
      </div>

      <p className="text-xs text-muted-foreground">
        Atualizado em{' '}
        {new Date(saldo.dataUltimaAtualizacao).toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </p>
    </div>
  )
}
