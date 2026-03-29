import React, { useState, useMemo } from 'react'
import { Package } from 'lucide-react'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Badge } from '@/shared/components/ui/Badge'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import { Modal } from '@/shared/components/ui/Modal'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/shared/components/ui/Table'
import { useProdutos } from '@/modules/produto/hooks/useProdutos'
import { EntradaCompraModal } from '../components/EntradaCompraModal'
import { useEntradas } from '../hooks/useCompra'
import type { ProdutoResponse } from '@/shared/api/produtos'

// ── Modal: seletor de produto para entrada ────────────────────────────────────

function ProdutoSeletorModal({
  open,
  onClose,
  onSelecionar,
}: {
  open: boolean
  onClose: () => void
  onSelecionar: (produto: ProdutoResponse) => void
}) {
  const [busca, setBusca] = useState('')
  const { data: produtos, isLoading } = useProdutos(true)

  const filtrados = useMemo(() => {
    if (!produtos) return []
    const t = busca.toLowerCase().trim()
    if (!t) return produtos
    return produtos.filter(
      (p) =>
        p.descricao.toLowerCase().includes(t) ||
        p.codigo.toLowerCase().includes(t)
    )
  }, [produtos, busca])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Selecionar Produto"
      footer={<Button variant="outline" onClick={onClose}>Cancelar</Button>}
    >
      <div className="space-y-3">
        <Input
          placeholder="Buscar por código ou descrição..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          autoFocus
        />

        {isLoading ? (
          <div className="animate-pulse space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 rounded bg-gray-100" />
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum produto encontrado.
          </p>
        ) : (
          <div className="max-h-72 overflow-y-auto space-y-1">
            {filtrados.map((p) => (
              <button
                key={p.id}
                type="button"
                className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors"
                onClick={() => { onSelecionar(p); setBusca('') }}
              >
                <div>
                  <p className="font-medium text-gray-900">{p.descricao}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.codigo} · {p.tipo}
                    {p.tipo === 'MADEIRA' && p.dimensaoVigente &&
                      ` · ${(p.dimensaoVigente.espessuraM * 1000).toFixed(0)}mm × ${(p.dimensaoVigente.larguraM * 1000).toFixed(0)}mm`}
                  </p>
                </div>
                <Badge variant="outline" className="ml-2 shrink-0">{p.tipo}</Badge>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-2 p-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-12 rounded bg-gray-100" />
      ))}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function ComprasPage() {
  const { data: entradas, isLoading, isError } = useEntradas(100)

  const [seletorAberto, setSeletorAberto] = useState(false)
  const [produtoParaEntrada, setProdutoParaEntrada] = useState<ProdutoResponse | null>(null)

  function handleSelecionarProduto(produto: ProdutoResponse) {
    setSeletorAberto(false)
    setProdutoParaEntrada(produto)
  }

  return (
    <div>
      <PageHeader
        title="Entradas de Compra"
        subtitle="Histórico de entradas de mercadoria no estoque"
        actions={
          <Button onClick={() => setSeletorAberto(true)}>
            + Registrar Entrada
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton />
          ) : isError ? (
            <EmptyState
              icon={<Package className="h-6 w-6" />}
              title="Erro ao carregar entradas"
              description="Não foi possível buscar o histórico. Tente novamente."
              className="py-16"
            />
          ) : !entradas || entradas.length === 0 ? (
            <EmptyState
              icon={<Package className="h-6 w-6" />}
              title="Nenhuma entrada registrada"
              description="As entradas de compra aparecerão aqui."
              action={
                <Button size="sm" onClick={() => setSeletorAberto(true)}>
                  + Registrar Entrada
                </Button>
              }
              className="py-16"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data / Hora</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Custo Unit.</TableHead>
                  <TableHead>Observação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entradas.map((e) => {
                  const qtd = e.tipoProduto === 'MADEIRA'
                    ? `${parseFloat(e.quantidadeM3 ?? '0').toFixed(4)} m³`
                    : `${parseFloat(e.quantidadeUnidade ?? '0').toLocaleString('pt-BR', { maximumFractionDigits: 4 })} ${e.unidadeSigla}`

                  const custo = e.custoUnitario
                    ? parseFloat(e.custoUnitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                    : '—'

                  return (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap text-sm text-gray-700">
                        {formatarDataHora(e.dataHora)}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-sm">{e.produtoDescricao}</p>
                        <p className="text-xs text-muted-foreground font-mono">{e.produtoCodigo}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={e.tipoProduto === 'MADEIRA' ? 'default' : 'outline'}>
                          {e.tipoProduto}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums text-sm font-medium">
                        {qtd}
                      </TableCell>
                      <TableCell className="tabular-nums text-sm">
                        {custo}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 max-w-xs truncate">
                        {e.observacao ?? '—'}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Step 1: selecionar produto */}
      <ProdutoSeletorModal
        open={seletorAberto}
        onClose={() => setSeletorAberto(false)}
        onSelecionar={handleSelecionarProduto}
      />

      {/* Step 2: registrar entrada */}
      {produtoParaEntrada && (
        <EntradaCompraModal
          produtoId={produtoParaEntrada.id}
          open={!!produtoParaEntrada}
          onClose={() => setProdutoParaEntrada(null)}
        />
      )}
    </div>
  )
}
