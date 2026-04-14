import React, { useState } from 'react'
import { FileText, ChevronDown, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Button } from '@/shared/components/ui/Button'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import { Modal } from '@/shared/components/ui/Modal'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/shared/components/ui/Table'
import { useOrcamentos, useConfirmarOrcamento, useCancelarOrcamento } from '../hooks/useVenda'
import type { OrcamentoDetalheResponse } from '@/shared/api/vendas'
import { usePagination } from '@/shared/hooks/usePagination'
import { Pagination } from '@/shared/components/ui/Pagination'
import { useTemPermissao } from '@/shared/hooks/useTemPermissao'
import { Perms } from '@/shared/utils/permissions'

// ── Helpers ────────────────────────────────────────────────────────────────────

const FORMA_LABEL: Record<string, string> = {
  DINHEIRO:       'Dinheiro',
  CARTAO_DEBITO:  'Débito',
  CARTAO_CREDITO: 'Crédito',
  PIX:            'PIX',
  BOLETO:         'Boleto',
  CHEQUE:         'Cheque',
  FIADO:          'Fiado',
}

function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatarReais(valor: string) {
  return parseFloat(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarQtdItem(orc: OrcamentoDetalheResponse['itens'][0]) {
  if (orc.quantidadeMetroLinear != null)
    return `${parseFloat(orc.quantidadeMetroLinear).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} m`
  if (orc.quantidadeUnidade != null)
    return parseFloat(orc.quantidadeUnidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  return '—'
}

// ── Modal de confirmação ───────────────────────────────────────────────────────

function ModalConfirmar({
  orc,
  open,
  onClose,
}: {
  orc: OrcamentoDetalheResponse | null
  open: boolean
  onClose: () => void
}) {
  const { mutate: confirmar, isPending } = useConfirmarOrcamento()
  const [erro, setErro] = useState<string | null>(null)

  function handleConfirmar() {
    if (!orc) return
    setErro(null)
    confirmar(orc.vendaId, {
      onSuccess: onClose,
      onError: (err: unknown) => {
        const msg =
          (err as any)?.response?.data?.detalhes ??
          (err as any)?.response?.data?.erro ??
          'Erro ao confirmar orçamento.'
        setErro(msg)
      },
    })
  }

  if (!orc) return null
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Confirmar Orçamento"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancelar</Button>
          <Button onClick={handleConfirmar} loading={isPending}>Confirmar e Debitar Estoque</Button>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <div className="rounded-md bg-muted/40 px-4 py-3 space-y-1">
          <p className="font-semibold">{orc.numero}</p>
          {orc.clienteNome && <p className="text-muted-foreground">{orc.clienteNome}</p>}
          <p className="text-lg font-bold">{formatarReais(orc.valorTotal)}</p>
        </div>
        <p className="text-muted-foreground">
          Ao confirmar, o estoque será debitado para cada item do orçamento. Esta ação não pode ser desfeita.
        </p>
        {erro && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-destructive">{erro}</p>
        )}
      </div>
    </Modal>
  )
}

// ── Modal de cancelamento ──────────────────────────────────────────────────────

function ModalCancelar({
  orc,
  open,
  onClose,
}: {
  orc: OrcamentoDetalheResponse | null
  open: boolean
  onClose: () => void
}) {
  const { mutate: cancelar, isPending } = useCancelarOrcamento()
  const [erro, setErro] = useState<string | null>(null)

  function handleCancelar() {
    if (!orc) return
    setErro(null)
    cancelar(orc.vendaId, {
      onSuccess: onClose,
      onError: (err: unknown) => {
        const msg =
          (err as any)?.response?.data?.detalhes ??
          (err as any)?.response?.data?.erro ??
          'Erro ao cancelar orçamento.'
        setErro(msg)
      },
    })
  }

  if (!orc) return null
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cancelar Orçamento"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Voltar</Button>
          <Button variant="destructive" onClick={handleCancelar} loading={isPending}>Cancelar Orçamento</Button>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <p>Tem certeza que deseja cancelar o orçamento <strong>{orc.numero}</strong>?</p>
        {erro && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-destructive">{erro}</p>
        )}
      </div>
    </Modal>
  )
}

// ── Linha expansível ───────────────────────────────────────────────────────────

function OrcamentoLinha({
  orc,
  onConfirmar,
  onCancelar,
}: {
  orc: OrcamentoDetalheResponse
  onConfirmar: () => void
  onCancelar: () => void
}) {
  const [expandido, setExpandido] = useState(false)
  const podeConfirmar = useTemPermissao(Perms.VEN_APROVAR)
  const podeCancelar  = useTemPermissao(Perms.VEN_CANCELAR)

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/30"
        onClick={() => setExpandido((v) => !v)}
      >
        <TableCell className="w-8">
          {expandido
            ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
            : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </TableCell>
        <TableCell className="font-mono text-sm font-medium">{orc.numero}</TableCell>
        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
          {formatarDataHora(orc.createdAt)}
        </TableCell>
        <TableCell className="text-sm">
          {orc.clienteNome ?? <span className="text-muted-foreground">Consumidor final</span>}
        </TableCell>
        <TableCell className="text-sm text-gray-600">
          {orc.formaPagamento ? (FORMA_LABEL[orc.formaPagamento] ?? orc.formaPagamento) : '—'}
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">{orc.itens.length} item(ns)</TableCell>
        <TableCell className="tabular-nums font-semibold text-right">
          {formatarReais(orc.valorTotal)}
        </TableCell>
        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
          <div className="flex gap-1 justify-end">
            {podeConfirmar && <Button size="sm" onClick={onConfirmar}>Confirmar</Button>}
            {podeCancelar  && <Button size="sm" variant="outline" onClick={onCancelar}>Cancelar</Button>}
          </div>
        </TableCell>
      </TableRow>

      {expandido && (
        <TableRow>
          <TableCell colSpan={8} className="bg-muted/20 p-0">
            <div className="px-10 py-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                    <th className="pb-1 pr-4">Código</th>
                    <th className="pb-1 pr-4">Produto</th>
                    <th className="pb-1 pr-4 text-right">Quantidade</th>
                    <th className="pb-1 pr-4 text-right">Preço Unit.</th>
                    <th className="pb-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orc.itens.map((item) => (
                    <tr key={item.produtoId} className="border-b border-border/50 last:border-0">
                      <td className="py-1.5 pr-4 font-mono text-xs text-muted-foreground">{item.produtoCodigo}</td>
                      <td className="py-1.5 pr-4">{item.produtoDescricao}</td>
                      <td className="py-1.5 pr-4 text-right tabular-nums">{formatarQtdItem(item)}</td>
                      <td className="py-1.5 pr-4 text-right tabular-nums">
                        {formatarReais(item.precoUnitario)}
                      </td>
                      <td className="py-1.5 text-right tabular-nums font-medium">
                        {formatarReais(item.valorTotalItem)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

// ── Página principal ───────────────────────────────────────────────────────────

export default function OrcamentosPage() {
  const { data: orcamentos, isLoading, isError } = useOrcamentos()
  const [paraConfirmar, setParaConfirmar] = useState<OrcamentoDetalheResponse | null>(null)
  const [paraCancelar, setParaCancelar] = useState<OrcamentoDetalheResponse | null>(null)

  const { paginatedItems: orcamentosPaginados, page, setPage, perPage, setPerPage, totalPages, totalItems } = usePagination(orcamentos ?? [])

  return (
    <div>
      <PageHeader
        title="Orçamentos"
        subtitle="Clique em uma linha para ver os itens"
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="animate-pulse space-y-2 p-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 rounded bg-gray-100" />
              ))}
            </div>
          ) : isError ? (
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title="Erro ao carregar orçamentos"
              description="Não foi possível buscar os orçamentos. Tente novamente."
              className="py-16"
            />
          ) : !orcamentos || orcamentos.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title="Nenhum orçamento em aberto"
              description='Use o botão "Salvar Orçamento" na tela de Balcão para criar um.'
              className="py-16"
            />
          ) : (
            <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Número</TableHead>
                  <TableHead>Data / Hora</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Forma Pgto</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orcamentosPaginados.map((orc) => (
                  <OrcamentoLinha
                    key={orc.vendaId}
                    orc={orc}
                    onConfirmar={() => setParaConfirmar(orc)}
                    onCancelar={() => setParaCancelar(orc)}
                  />
                ))}
              </TableBody>
            </Table>
            <div className="border-t border-border px-4 dark:border-[#243040]">
              <Pagination page={page} totalPages={totalPages} totalItems={totalItems} perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage} />
            </div>
            </>
          )}
        </CardContent>
      </Card>

      <ModalConfirmar
        orc={paraConfirmar}
        open={!!paraConfirmar}
        onClose={() => setParaConfirmar(null)}
      />
      <ModalCancelar
        orc={paraCancelar}
        open={!!paraCancelar}
        onClose={() => setParaCancelar(null)}
      />
    </div>
  )
}
