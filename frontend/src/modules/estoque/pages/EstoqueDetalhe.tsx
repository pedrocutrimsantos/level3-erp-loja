import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Layers, ArrowLeftRight } from 'lucide-react'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Button } from '@/shared/components/ui/Button'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import { useProduto } from '@/modules/produto/hooks/useProdutos'
import { useMovimentacoes, useSublotes } from '../hooks/useEstoque'
import { SaldoCard } from '../components/SaldoCard'
import { MovimentacaoTable } from '../components/MovimentacaoTable'
import { SubloteList } from '../components/SubloteList'
import { AjusteEstoqueModal } from '../components/AjusteEstoqueModal'
import { EntradaCompraModal } from '@/modules/compra/components/EntradaCompraModal'
import { cn } from '@/shared/utils/cn'

type Aba = 'movimentacoes' | 'sublotes'

export default function EstoqueDetalhe() {
  const { produtoId } = useParams<{ produtoId: string }>()
  const navigate = useNavigate()

  const [abaAtiva, setAbaAtiva] = useState<Aba>('movimentacoes')
  const [limit, setLimit] = useState(50)
  const [ajusteAberto, setAjusteAberto] = useState(false)
  const [entradaAberta, setEntradaAberta] = useState(false)

  const { data: produto, isLoading: loadingProduto } = useProduto(produtoId ?? '')
  const {
    data: movimentacoes,
    isLoading: loadingMov,
    isError: errMov,
  } = useMovimentacoes(produtoId ?? null, limit)
  const {
    data: sublotes,
    isLoading: loadingSub,
    isError: errSub,
  } = useSublotes(produtoId ?? null)

  if (!produtoId) {
    return (
      <EmptyState
        title="Produto não encontrado"
        description="Nenhum ID de produto foi fornecido na URL."
      />
    )
  }

  const tipoProduto = produto?.tipo ?? 'NORMAL'

  return (
    <div>
      <PageHeader
        title={
          loadingProduto
            ? 'Carregando...'
            : produto
              ? `Estoque — ${produto.descricao}`
              : 'Estoque'
        }
        subtitle={produto ? `Código: ${produto.codigo}` : undefined}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/estoque')}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEntradaAberta(true)}>
              Registrar Entrada
            </Button>
            <Button size="sm" onClick={() => setAjusteAberto(true)}>
              Registrar Ajuste
            </Button>
          </div>
        }
      />

      {/* Saldo Card */}
      <div className="mb-6 max-w-md">
        <SaldoCard produtoId={produtoId} tipo={tipoProduto} />
      </div>

      {/* Abas */}
      <div className="mb-4 border-b border-border">
        <div className="flex gap-0">
          {([
            { id: 'movimentacoes' as Aba, label: 'Movimentações', icon: <ArrowLeftRight className="h-4 w-4" /> },
            { id: 'sublotes' as Aba, label: 'Sublotes', icon: <Layers className="h-4 w-4" /> },
          ] as const).map((aba) => (
            <button
              key={aba.id}
              onClick={() => setAbaAtiva(aba.id)}
              className={cn(
                'flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                abaAtiva === aba.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-gray-700'
              )}
            >
              {aba.icon}
              {aba.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo da aba */}
      <Card>
        <CardContent className="p-0">
          {abaAtiva === 'movimentacoes' && (
            <>
              {loadingMov ? (
                <div className="animate-pulse space-y-2 p-6">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-10 rounded bg-gray-100" />
                  ))}
                </div>
              ) : errMov ? (
                <EmptyState
                  icon={<ArrowLeftRight className="h-6 w-6" />}
                  title="Erro ao carregar movimentações"
                  description="Não foi possível buscar as movimentações."
                  className="py-12"
                />
              ) : (
                <>
                  <MovimentacaoTable movimentacoes={movimentacoes ?? []} />
                  {movimentacoes && movimentacoes.length >= limit && (
                    <div className="flex justify-center border-t border-border p-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLimit((prev) => prev + 50)}
                      >
                        Ver mais
                      </Button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {abaAtiva === 'sublotes' && (
            <>
              {loadingSub ? (
                <div className="animate-pulse space-y-2 p-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-14 rounded bg-gray-100" />
                  ))}
                </div>
              ) : errSub ? (
                <EmptyState
                  icon={<Layers className="h-6 w-6" />}
                  title="Erro ao carregar sublotes"
                  description="Não foi possível buscar os sublotes."
                  className="py-12"
                />
              ) : (
                <div className="px-4 py-2">
                  <SubloteList sublotes={sublotes ?? []} />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AjusteEstoqueModal
        produtoId={produtoId}
        open={ajusteAberto}
        onClose={() => setAjusteAberto(false)}
      />

      <EntradaCompraModal
        produtoId={produtoId}
        open={entradaAberta}
        onClose={() => setEntradaAberta(false)}
      />
    </div>
  )
}
