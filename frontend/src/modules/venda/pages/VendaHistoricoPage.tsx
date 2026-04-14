import React, { useState, useMemo } from 'react'
import { useVendas } from '../hooks/useVenda'
import { useTemPermissao } from '@/shared/hooks/useTemPermissao'
import { Perms } from '@/shared/utils/permissions'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/shared/components/ui/Table'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import { Pagination } from '@/shared/components/ui/Pagination'
import { usePagination } from '@/shared/hooks/usePagination'
import { History, Printer, X } from 'lucide-react'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { FilterBar, FilterField } from '@/shared/components/layout/PageLayout'
import { DevolucaoModal } from '../components/DevolucaoModal'
import { CriarEntregaModal } from '../components/CriarEntregaModal'
import { VendaDetalheModal } from '../components/VendaDetalheModal'
import { vendasApi } from '@/shared/api/vendas'
import { imprimirRecibo } from '../utils/imprimirRecibo'

const STATUS_LABEL: Record<string, string> = {
  RASCUNHO:          'Rascunho',
  ORCAMENTO:         'Orçamento',
  CONFIRMADO:        'Confirmado',
  EM_ENTREGA:        'Em Entrega',
  ENTREGUE_PARCIAL:  'Entregue Parcial',
  CONCLUIDO:         'Concluído',
  CANCELADO:         'Cancelado',
  DEVOLVIDO_PARCIAL: 'Dev. Parcial',
  DEVOLVIDO:         'Devolvido',
}

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'destructive' | 'warning' | 'outline'> = {
  RASCUNHO:          'outline',
  ORCAMENTO:         'outline',
  CONFIRMADO:        'success',
  EM_ENTREGA:        'warning',
  ENTREGUE_PARCIAL:  'warning',
  CONCLUIDO:         'success',
  CANCELADO:         'destructive',
  DEVOLVIDO_PARCIAL: 'warning',
  DEVOLVIDO:         'outline',
}

const PODE_DEVOLVER  = new Set(['CONFIRMADO', 'CONCLUIDO', 'DEVOLVIDO_PARCIAL'])
const PODE_ENTREGAR  = new Set(['CONFIRMADO', 'ENTREGUE_PARCIAL'])

const TIPO_LABEL: Record<string, string> = {
  BALCAO:       'Balcão',
  COM_ENTREGA:  'Com Entrega',
  ORCAMENTO:    'Orçamento',
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

function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatarReais(valor: string): string {
  return parseFloat(valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

// Extrai YYYY-MM-DD do ISO string sem depender de timezone
function isoParaData(iso: string): string {
  return iso.slice(0, 10)
}

export default function VendaHistoricoPage() {
  const { data: vendas, isLoading, isError } = useVendas(200)

  const [busca,       setBusca]       = useState('')
  const [statusFiltro, setStatusFiltro] = useState('')
  const [dataInicio,  setDataInicio]  = useState('')
  const [dataFim,     setDataFim]     = useState('')

  const [devolucaoVenda, setDevolucaoVenda] = useState<{ id: string; numero: string } | null>(null)
  const [entregaVenda,   setEntregaVenda]   = useState<{ id: string; numero: string } | null>(null)
  const [imprimindoId,   setImprimindoId]   = useState<string | null>(null)
  const [detalheVendaId, setDetalheVendaId] = useState<string | null>(null)

  const podeEntregar = useTemPermissao(Perms.ENT_CRIAR)
  const podeDevolver = useTemPermissao(Perms.VEN_CRIAR)

  async function handleImprimir(vendaId: string) {
    setImprimindoId(vendaId)
    try {
      const detalhe = await vendasApi.buscar(vendaId)
      imprimirRecibo(detalhe)
    } finally {
      setImprimindoId(null)
    }
  }

  const filtrosAtivos = busca || statusFiltro || dataInicio || dataFim

  function limparFiltros() {
    setBusca('')
    setStatusFiltro('')
    setDataInicio('')
    setDataFim('')
  }

  const vendasFiltradas = useMemo(() => {
    if (!vendas) return []
    const termo = busca.toLowerCase().trim()

    return vendas.filter((v) => {
      if (termo) {
        const matchNumero  = v.numero.toLowerCase().includes(termo)
        const matchCliente = (v.clienteNome ?? '').toLowerCase().includes(termo)
        if (!matchNumero && !matchCliente) return false
      }

      if (statusFiltro && v.status !== statusFiltro) return false

      const dataVenda = isoParaData(v.createdAt)
      if (dataInicio && dataVenda < dataInicio) return false
      if (dataFim    && dataVenda > dataFim)    return false

      return true
    })
  }, [vendas, busca, statusFiltro, dataInicio, dataFim])

  const { paginatedItems: vendasPaginadas, page, setPage, perPage, setPerPage, totalPages, totalItems } = usePagination(vendasFiltradas)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Histórico de Vendas"
        subtitle="Últimas 200 vendas registradas"
      />

      {/* ── Barra de filtros ── */}
      <FilterBar>
        <FilterField label="Número ou cliente" className="flex-1 min-w-[180px]">
          <Input
            placeholder="Ex: V-001 ou João Silva"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="h-8 text-sm"
          />
        </FilterField>

        <FilterField label="Status" className="w-44">
          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 dark:bg-[#0d1117] dark:border-[#243040]"
          >
            <option value="">Todos</option>
            {Object.entries(STATUS_LABEL).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </FilterField>

        <FilterField label="De">
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 dark:bg-[#0d1117] dark:border-[#243040]"
          />
        </FilterField>

        <FilterField label="Até">
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 dark:bg-[#0d1117] dark:border-[#243040]"
          />
        </FilterField>

        {filtrosAtivos && (
          <Button
            size="sm"
            variant="ghost"
            onClick={limparFiltros}
            className="h-8 gap-1 text-muted-foreground self-end"
          >
            <X className="h-3.5 w-3.5" />
            Limpar
          </Button>
        )}

        {vendas && (
          <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap self-end pb-1">
            {vendasFiltradas.length === vendas.length
              ? `${vendas.length} vendas`
              : `${vendasFiltradas.length} de ${vendas.length}`}
          </span>
        )}
      </FilterBar>

      {isLoading && (
        <div className="flex h-40 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-destructive">Erro ao carregar histórico de vendas.</p>
      )}

      {!isLoading && !isError && vendas && vendas.length === 0 && (
        <EmptyState
          icon={<History className="h-6 w-6" />}
          title="Nenhuma venda registrada"
          description="As vendas realizadas no balcão aparecerão aqui."
        />
      )}

      {!isLoading && !isError && vendas && vendas.length > 0 && vendasFiltradas.length === 0 && (
        <EmptyState
          icon={<History className="h-6 w-6" />}
          title="Nenhuma venda encontrada"
          description="Tente ajustar os filtros para ver resultados."
        />
      )}

      {!isLoading && !isError && vendasFiltradas.length > 0 && (
        <>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Data / Hora</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Forma</TableHead>
              <TableHead className="text-right">Valor Total</TableHead>
              <TableHead className="text-right">Itens</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendasPaginadas.map((venda) => (
              <TableRow
                key={venda.vendaId}
                className="cursor-pointer"
                onClick={() => setDetalheVendaId(venda.vendaId)}
              >
                <TableCell className="font-mono text-sm font-medium">
                  {venda.numero}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-foreground">
                  {formatarDataHora(venda.createdAt)}
                </TableCell>
                <TableCell className="text-sm text-foreground">
                  {venda.clienteNome ?? <span className="text-muted-foreground">Consumidor final</span>}
                </TableCell>
                <TableCell className="text-sm text-foreground">
                  {TIPO_LABEL[venda.tipo] ?? venda.tipo}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[venda.status] ?? 'secondary'}>
                    {STATUS_LABEL[venda.status] ?? venda.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {venda.formaPagamento
                    ? (FORMA_LABEL[venda.formaPagamento] ?? venda.formaPagamento)
                    : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {formatarReais(venda.valorTotal)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm text-foreground">
                  {venda.quantidadeItens}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Imprimir recibo"
                      disabled={imprimindoId === venda.vendaId}
                      onClick={() => handleImprimir(venda.vendaId)}
                    >
                      {imprimindoId === venda.vendaId
                        ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        : <Printer className="h-3.5 w-3.5" />}
                    </Button>
                    {podeEntregar && PODE_ENTREGAR.has(venda.status) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEntregaVenda({ id: venda.vendaId, numero: venda.numero })}
                      >
                        Entregar
                      </Button>
                    )}
                    {podeDevolver && PODE_DEVOLVER.has(venda.status) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDevolucaoVenda({ id: venda.vendaId, numero: venda.numero })}
                      >
                        Devolver
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pagination page={page} totalPages={totalPages} totalItems={totalItems} perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage} className="px-2" />
        </>
      )}

      {entregaVenda && (
        <CriarEntregaModal
          vendaId={entregaVenda.id}
          vendaNumero={entregaVenda.numero}
          onClose={() => setEntregaVenda(null)}
        />
      )}

      {devolucaoVenda && (
        <DevolucaoModal
          vendaId={devolucaoVenda.id}
          vendaNumero={devolucaoVenda.numero}
          onClose={() => setDevolucaoVenda(null)}
        />
      )}

      {detalheVendaId && (
        <VendaDetalheModal
          vendaId={detalheVendaId}
          onClose={() => setDetalheVendaId(null)}
        />
      )}
    </div>
  )
}
