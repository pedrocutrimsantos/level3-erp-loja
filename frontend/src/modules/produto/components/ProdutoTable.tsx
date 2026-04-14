import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePagination } from '@/shared/hooks/usePagination'
import { Pagination } from '@/shared/components/ui/Pagination'
import { Eye, Pencil, Trash2 } from 'lucide-react'
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
import { Modal } from '@/shared/components/ui/Modal'
import { Input } from '@/shared/components/ui/Input'
import { useAtualizarProduto, useInativarProduto } from '../hooks/useProdutos'
import type { ProdutoResponse } from '@/shared/api/produtos'

export interface ProdutoTableProps {
  produtos: ProdutoResponse[]
}

function formatarDimensao(produto: ProdutoResponse): string {
  if (produto.tipo !== 'MADEIRA' || !produto.dimensaoVigente) return '—'
  const { espessuraM, larguraM } = produto.dimensaoVigente
  return `${(espessuraM * 1000).toFixed(0)}mm × ${(larguraM * 1000).toFixed(0)}mm`
}

interface EditModalProps {
  produto: ProdutoResponse
  onClose: () => void
}

function EditModal({ produto, onClose }: EditModalProps) {
  const { mutate: atualizar, isPending } = useAtualizarProduto()
  const [descricao, setDescricao] = useState(produto.descricao)
  const [ncm, setNcm] = useState(produto.ncm)
  const [error, setError] = useState<string | null>(null)

  function handleSalvar() {
    if (!descricao.trim()) { setError('Descrição é obrigatória'); return }
    if (ncm.length !== 8) { setError('NCM deve ter exatamente 8 dígitos'); return }
    setError(null)
    atualizar(
      { id: produto.id, req: { descricao: descricao.trim(), ncm: ncm.trim() } },
      { onSuccess: onClose },
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Editar — ${produto.codigo}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancelar</Button>
          <Button onClick={handleSalvar} loading={isPending}>Salvar</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Descrição *"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          error={error ?? undefined}
        />
        <Input
          label="NCM *"
          value={ncm}
          onChange={(e) => setNcm(e.target.value.replace(/\D/g, '').slice(0, 8))}
          placeholder="8 dígitos"
          maxLength={8}
          error={error?.includes('NCM') ? error : undefined}
        />
        <p className="text-xs text-muted-foreground">
          Tipo e código não podem ser alterados após o cadastro.
        </p>
      </div>
    </Modal>
  )
}

interface ConfirmDeleteProps {
  produto: ProdutoResponse
  onClose: () => void
}

function ConfirmDelete({ produto, onClose }: ConfirmDeleteProps) {
  const { mutate: inativar, isPending } = useInativarProduto()

  return (
    <Modal
      open
      onClose={onClose}
      title="Inativar produto"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancelar</Button>
          <Button
            variant="destructive"
            onClick={() => inativar(produto.id, { onSuccess: onClose })}
            loading={isPending}
          >
            Inativar
          </Button>
        </>
      }
    >
      <p className="text-sm text-gray-700">
        Deseja inativar o produto <span className="font-semibold">{produto.descricao}</span>?
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        O produto não será excluído — apenas marcado como inativo e não aparecerá nas listagens padrão.
      </p>
    </Modal>
  )
}

export function ProdutoTable({ produtos }: ProdutoTableProps) {
  const navigate = useNavigate()
  const [editando, setEditando] = useState<ProdutoResponse | null>(null)
  const [inativando, setInativando] = useState<ProdutoResponse | null>(null)
  const { paginatedItems: produtosPaginados, page, setPage, perPage, setPerPage, totalPages, totalItems } = usePagination(produtos)

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Dimensão</TableHead>
            <TableHead>Fator de Conversão</TableHead>
            <TableHead>Ativo</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {produtosPaginados.map((produto) => (
            <TableRow key={produto.id}>
              <TableCell className="font-mono text-xs">{produto.codigo}</TableCell>
              <TableCell className="font-medium">{produto.descricao}</TableCell>
              <TableCell>
                <Badge variant={produto.tipo === 'MADEIRA' ? 'default' : 'outline'}>
                  {produto.tipo}
                </Badge>
              </TableCell>
              <TableCell>{formatarDimensao(produto)}</TableCell>
              <TableCell>
                {produto.dimensaoVigente ? produto.dimensaoVigente.fatorConversao : '—'}
              </TableCell>
              <TableCell>
                <Badge variant={produto.ativo ? 'success' : 'destructive'}>
                  {produto.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Ver detalhes"
                    onClick={() => navigate(`/produtos/${produto.id}`)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Editar"
                    onClick={() => setEditando(produto)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {produto.ativo && (
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Inativar"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setInativando(produto)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="border-t border-border px-4 dark:border-[#243040]">
        <Pagination page={page} totalPages={totalPages} totalItems={totalItems} perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage} />
      </div>

      {editando && <EditModal produto={editando} onClose={() => setEditando(null)} />}
      {inativando && <ConfirmDelete produto={inativando} onClose={() => setInativando(null)} />}
    </>
  )
}
