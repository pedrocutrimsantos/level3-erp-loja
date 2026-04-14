import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package } from 'lucide-react'
import { useProdutos } from '../hooks/useProdutos'
import { ProdutoTable } from '../components/ProdutoTable'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Button } from '@/shared/components/ui/Button'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { FilterBar, FilterField } from '@/shared/components/layout/PageLayout'
import { useTemPermissao } from '@/shared/hooks/useTemPermissao'
import { Perms } from '@/shared/utils/permissions'

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 rounded bg-gray-100" />
      ))}
    </div>
  )
}

export default function ProdutoListPage() {
  const navigate = useNavigate()
  const [apenasAtivos, setApenasAtivos] = useState(true)
  const { data: produtos, isLoading, isError } = useProdutos(apenasAtivos)
  const podeCriar = useTemPermissao(Perms.CAD_CRIAR)

  return (
    <div>
      <PageHeader
        title="Produtos"
        subtitle="Gerencie o catálogo de produtos da madeireira"
        actions={
          podeCriar ? (
            <Button onClick={() => navigate('/produtos/novo')}>
              + Novo Produto
            </Button>
          ) : undefined
        }
      />

      <FilterBar className="mb-4">
        <FilterField label="Filtrar">
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none h-8">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              checked={apenasAtivos}
              onChange={(e) => setApenasAtivos(e.target.checked)}
            />
            Apenas ativos
          </label>
        </FilterField>
      </FilterBar>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <TableSkeleton />
            </div>
          ) : isError ? (
            <EmptyState
              icon={<Package className="h-6 w-6" />}
              title="Erro ao carregar produtos"
              description="Não foi possível buscar a lista de produtos. Tente novamente."
              className="py-16"
            />
          ) : !produtos || produtos.length === 0 ? (
            <EmptyState
              icon={<Package className="h-6 w-6" />}
              title="Nenhum produto encontrado"
              description={
                apenasAtivos
                  ? 'Não há produtos ativos cadastrados. Crie o primeiro produto.'
                  : 'Não há produtos cadastrados.'
              }
              action={
                podeCriar ? (
                  <Button size="sm" onClick={() => navigate('/produtos/novo')}>
                    + Novo Produto
                  </Button>
                ) : undefined
              }
              className="py-16"
            />
          ) : (
            <ProdutoTable produtos={produtos} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
