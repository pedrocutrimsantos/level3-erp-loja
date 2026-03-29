import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Warehouse } from 'lucide-react'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/shared/components/ui/Table'
import { formatarM3, formatarMetros } from '@/shared/utils/conversaoMadeira'
import { useProdutos } from '@/modules/produto/hooks/useProdutos'
import { useSaldoEstoque } from '../hooks/useEstoque'
import { AjusteEstoqueModal } from '../components/AjusteEstoqueModal'
import type { ProdutoResponse } from '@/shared/api/produtos'

interface ProdutoLinhaProps {
  produto: ProdutoResponse
  onAjuste: (produtoId: string) => void
}

function ProdutoLinha({ produto, onAjuste }: ProdutoLinhaProps) {
  const navigate = useNavigate()
  const { data: saldo, isLoading } = useSaldoEstoque(produto.id)

  const saldoM3 = saldo ? parseFloat(saldo.saldoM3) : null
  const saldoMetros =
    saldo?.saldoMetrosLineares != null ? parseFloat(saldo.saldoMetrosLineares) : null
  const dataAtualizacao = saldo?.dataUltimaAtualizacao ?? null

  return (
    <TableRow>
      <TableCell className="font-medium text-gray-900">
        <button
          className="hover:underline text-primary text-left"
          onClick={() => navigate(`/estoque/${produto.id}`)}
        >
          {produto.descricao}
        </button>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground font-mono">
        {produto.codigo}
      </TableCell>
      <TableCell>
        <Badge variant={produto.tipo === 'MADEIRA' ? 'default' : 'outline'}>
          {produto.tipo === 'MADEIRA' ? 'Madeira' : 'Normal'}
        </Badge>
      </TableCell>
      <TableCell className="tabular-nums text-sm">
        {isLoading ? (
          <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
        ) : saldoM3 != null ? (
          <span
            className={
              saldoM3 <= 0 ? 'text-red-600 font-semibold' : 'text-gray-900'
            }
          >
            {formatarM3(saldoM3)} m³
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="tabular-nums text-sm">
        {produto.tipo === 'MADEIRA' ? (
          isLoading ? (
            <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
          ) : saldoMetros != null ? (
            <span className="text-gray-700">{formatarMetros(saldoMetros)} m</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
        {isLoading ? (
          <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
        ) : dataAtualizacao ? (
          new Date(dataAtualizacao).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        ) : (
          '—'
        )}
      </TableCell>
      <TableCell>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/estoque/${produto.id}`)}
          >
            Detalhes
          </Button>
          <Button size="sm" onClick={() => onAjuste(produto.id)}>
            Ajuste
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-2 p-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 rounded bg-gray-100" />
      ))}
    </div>
  )
}

export default function EstoqueListPage() {
  const [apenasComSaldo, setApenasComSaldo] = useState(false)
  const [produtoAjusteId, setProdutoAjusteId] = useState<string | null>(null)

  const { data: produtos, isLoading, isError } = useProdutos(true)

  return (
    <div>
      <PageHeader
        title="Estoque"
        subtitle="Saldo atual por produto"
      />

      {/* Filtro */}
      <div className="mb-4 flex items-center gap-2">
        <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            checked={apenasComSaldo}
            onChange={(e) => setApenasComSaldo(e.target.checked)}
          />
          Apenas com saldo
        </label>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton />
          ) : isError || !produtos ? (
            <EmptyState
              icon={<Warehouse className="h-6 w-6" />}
              title="Erro ao carregar produtos"
              description="Não foi possível carregar a lista de produtos."
              className="py-16"
            />
          ) : produtos.length === 0 ? (
            <EmptyState
              icon={<Warehouse className="h-6 w-6" />}
              title="Nenhum produto encontrado"
              description="Cadastre produtos para visualizar o estoque."
              className="py-16"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Saldo m³</TableHead>
                  <TableHead>Metro Linear</TableHead>
                  <TableHead>Última Atualização</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtos.map((produto) => (
                  <ProdutoLinha
                    key={produto.id}
                    produto={produto}
                    onAjuste={(id) => setProdutoAjusteId(id)}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {produtoAjusteId && (
        <AjusteEstoqueModal
          produtoId={produtoAjusteId}
          open={!!produtoAjusteId}
          onClose={() => setProdutoAjusteId(null)}
        />
      )}
    </div>
  )
}
