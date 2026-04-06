import React, { useState, useMemo } from 'react'
import { RotateCcw } from 'lucide-react'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Badge } from '@/shared/components/ui/Badge'
import { Input } from '@/shared/components/ui/Input'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/shared/components/ui/Table'
import { useDevolucoes } from '../hooks/useDevolucao'

function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatarReais(v: string) {
  return parseFloat(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function DevolucoesPage() {
  const { data: devolucoes, isLoading, isError } = useDevolucoes()
  const [busca, setBusca] = useState('')

  const filtradas = useMemo(() => {
    if (!devolucoes) return []
    const termo = busca.toLowerCase().trim()
    if (!termo) return devolucoes
    return devolucoes.filter((d) =>
      d.numero.toLowerCase().includes(termo) ||
      d.vendaNumero.toLowerCase().includes(termo) ||
      (d.clienteNome ?? '').toLowerCase().includes(termo) ||
      (d.motivo ?? '').toLowerCase().includes(termo),
    )
  }, [devolucoes, busca])

  return (
    <div className="space-y-4">
      <PageHeader
        title="Devoluções"
        subtitle="Histórico de mercadorias devolvidas"
      />

      <div className="flex items-center gap-3">
        <div className="flex-1 max-w-sm">
          <Input
            placeholder="Buscar por número, venda ou cliente…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        {devolucoes && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {filtradas.length === devolucoes.length
              ? `${devolucoes.length} devoluções`
              : `${filtradas.length} de ${devolucoes.length}`}
          </span>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="animate-pulse space-y-2 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 rounded bg-muted" />
              ))}
            </div>
          ) : isError ? (
            <EmptyState
              icon={<RotateCcw className="h-6 w-6" />}
              title="Erro ao carregar devoluções"
              description="Não foi possível buscar as devoluções. Tente novamente."
              className="py-16"
            />
          ) : !filtradas.length ? (
            <EmptyState
              icon={<RotateCcw className="h-6 w-6" />}
              title={busca ? 'Nenhuma devolução encontrada' : 'Nenhuma devolução registrada'}
              description={
                busca
                  ? 'Tente ajustar o filtro.'
                  : 'As devoluções registradas pelo histórico de vendas aparecerão aqui.'
              }
              className="py-16"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Venda</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Valor Devolvido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtradas.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {d.numero}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {d.vendaNumero}
                    </TableCell>
                    <TableCell className="text-sm">
                      {d.clienteNome ?? (
                        <span className="text-muted-foreground">Consumidor final</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {d.motivo ?? <span className="text-muted-foreground/50">—</span>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-foreground">
                      {formatarDataHora(d.createdAt)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium text-destructive">
                      {formatarReais(d.valorTotal)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
