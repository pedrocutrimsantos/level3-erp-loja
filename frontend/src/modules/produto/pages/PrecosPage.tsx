import React, { useMemo, useRef, useState } from 'react'
import { DollarSign, X } from 'lucide-react'
import { useProdutos, useAtualizarPreco } from '../hooks/useProdutos'
import { Input } from '@/shared/components/ui/Input'
import { Button } from '@/shared/components/ui/Button'
import { Badge } from '@/shared/components/ui/Badge'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/shared/components/ui/Table'
import type { ProdutoResponse } from '@/shared/api/produtos'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatarReais(v: string) {
  return parseFloat(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function unidadeLabel(p: ProdutoResponse) {
  if (p.tipo === 'MADEIRA') return 'R$/metro'
  return `R$/${p.unidadeVendaSigla.toLowerCase()}`
}

// ── Célula de preço editável inline ──────────────────────────────────────────

interface CelulaPrecoProps {
  produto: ProdutoResponse
}

function CelulaPreco({ produto }: CelulaPrecoProps) {
  const { mutate, isPending } = useAtualizarPreco()
  const [editando, setEditando] = useState(false)
  const [valor, setValor] = useState('')
  const [flash, setFlash] = useState<'ok' | 'erro' | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function iniciarEdicao() {
    setValor(produto.precoVenda ? parseFloat(produto.precoVenda).toFixed(2) : '')
    setFlash(null)
    setEditando(true)
    setTimeout(() => inputRef.current?.select(), 30)
  }

  function cancelar() {
    setEditando(false)
    setValor('')
  }

  function salvar() {
    const parsed = parseFloat(valor.replace(',', '.'))
    const preco = isNaN(parsed) || parsed <= 0 ? null : parsed
    mutate(
      { id: produto.id, preco },
      {
        onSuccess: () => {
          setEditando(false)
          setFlash('ok')
          setTimeout(() => setFlash(null), 1500)
        },
        onError: () => {
          setFlash('erro')
        },
      },
    )
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); salvar() }
    if (e.key === 'Escape') cancelar()
  }

  if (isPending) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent inline-block" />
        Salvando…
      </div>
    )
  }

  if (editando) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          ref={inputRef}
          type="number"
          step="0.01"
          min="0"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={onKeyDown}
          className="h-8 w-28 rounded-md border border-primary px-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <button
          onClick={salvar}
          className="rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          ✓
        </button>
        <button
          onClick={cancelar}
          className="rounded bg-white border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted/50"
        >
          ✕
        </button>
        {flash === 'erro' && (
          <span className="text-xs text-red-500">Erro ao salvar</span>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={iniciarEdicao}
      className={`group flex items-center gap-2 rounded px-2 py-1 text-sm transition-colors hover:bg-muted/50 ${
        flash === 'ok' ? 'bg-emerald-50' : ''
      }`}
      title="Clique para editar o preço"
    >
      {produto.precoVenda ? (
        <span className={`tabular-nums font-medium ${flash === 'ok' ? 'text-emerald-700' : 'text-gray-900'}`}>
          {formatarReais(produto.precoVenda)}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground italic">Sem preço</span>
      )}
      <span className="invisible text-[10px] text-muted-foreground group-hover:visible">editar</span>
    </button>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

type FiltroTipo = 'TODOS' | 'MADEIRA' | 'NORMAL'

export default function PrecosPage() {
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('TODOS')
  const [incluirInativos, setIncluirInativos] = useState(false)

  const { data: produtos, isLoading, isError } = useProdutos(!incluirInativos)

  const filtrados = useMemo(() => {
    if (!produtos) return []
    const termo = busca.toLowerCase().trim()
    return produtos.filter((p) => {
      if (filtroTipo !== 'TODOS' && p.tipo !== filtroTipo) return false
      if (termo) {
        const matchCodigo = p.codigo.toLowerCase().includes(termo)
        const matchDesc   = p.descricao.toLowerCase().includes(termo)
        if (!matchCodigo && !matchDesc) return false
      }
      return true
    })
  }, [produtos, busca, filtroTipo])

  const filtrosAtivos = busca || filtroTipo !== 'TODOS'

  const semPreco = filtrados.filter((p) => !p.precoVenda).length
  const comPreco = filtrados.filter((p) =>  p.precoVenda).length

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Preços de Venda</h1>
        <p className="text-sm text-muted-foreground">
          Clique no preço de qualquer produto para editá-lo. Enter confirma, Esc cancela.
        </p>
      </div>

      {/* Barra de filtros */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
        {/* Busca */}
        <div className="flex-1 min-w-[180px]">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Código ou descrição
          </label>
          <Input
            placeholder="Ex: CAR-001 ou Caibro"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="h-8 text-sm"
          />
        </div>

        {/* Tipo */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Tipo</label>
          <div className="flex gap-1">
            {(['TODOS', 'MADEIRA', 'NORMAL'] as FiltroTipo[]).map((t) => (
              <button
                key={t}
                onClick={() => setFiltroTipo(t)}
                className={`rounded px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  filtroTipo === t
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-white border border-border text-gray-600 hover:bg-muted/50'
                }`}
              >
                {t === 'TODOS' ? 'Todos' : t === 'MADEIRA' ? 'Madeira' : 'Normal'}
              </button>
            ))}
          </div>
        </div>

        {/* Inativos */}
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-700 pb-1">
          <input
            type="checkbox"
            checked={incluirInativos}
            onChange={(e) => setIncluirInativos(e.target.checked)}
            className="h-3.5 w-3.5 accent-primary"
          />
          Incluir inativos
        </label>

        {/* Limpar */}
        {filtrosAtivos && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => { setBusca(''); setFiltroTipo('TODOS') }}
            className="h-8 gap-1 text-muted-foreground pb-1"
          >
            <X className="h-3.5 w-3.5" />
            Limpar
          </Button>
        )}

        {/* Contadores */}
        {produtos && (
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap pb-1">
            <span className="text-emerald-600 font-medium">{comPreco} com preço</span>
            {semPreco > 0 && (
              <span className="text-orange-500 font-medium">{semPreco} sem preço</span>
            )}
          </div>
        )}
      </div>

      {isLoading && (
        <div className="flex h-40 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-red-600">Erro ao carregar produtos.</p>
      )}

      {!isLoading && !isError && filtrados.length === 0 && (
        <EmptyState
          icon={<DollarSign className="h-6 w-6" />}
          title="Nenhum produto encontrado"
          description="Ajuste os filtros ou cadastre produtos primeiro."
        />
      )}

      {!isLoading && !isError && filtrados.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Preço de Venda</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.map((p) => (
              <TableRow key={p.id} className={!p.ativo ? 'opacity-50' : ''}>
                <TableCell className="font-mono text-sm font-medium">{p.codigo}</TableCell>
                <TableCell className="text-sm text-gray-800">{p.descricao}</TableCell>
                <TableCell>
                  <Badge variant={p.tipo === 'MADEIRA' ? 'default' : 'outline'} className="text-xs">
                    {p.tipo === 'MADEIRA' ? 'Madeira' : 'Normal'}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{unidadeLabel(p)}</TableCell>
                <TableCell>
                  {p.ativo
                    ? <Badge variant="success" className="text-xs">Ativo</Badge>
                    : <Badge variant="outline" className="text-xs">Inativo</Badge>
                  }
                </TableCell>
                <TableCell>
                  <CelulaPreco produto={p} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
