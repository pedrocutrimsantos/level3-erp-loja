import React, { useState } from 'react'
import { usePagination } from '@/shared/hooks/usePagination'
import { Pagination } from '@/shared/components/ui/Pagination'
import { Tag, Plus, Pencil, Trash2, X, Check, AlertTriangle } from 'lucide-react'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import { Input } from '@/shared/components/ui/Input'
import { Modal } from '@/shared/components/ui/Modal'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/shared/components/ui/Table'
import {
  usePromocoes,
  useCriarPromocao,
  useAtualizarPromocao,
  useDesativarPromocao,
} from '../hooks/usePromocao'
import type { PromocaoResponse, PromocaoRequest } from '@/shared/api/promocao'
import { usePesquisarProdutos } from '@/modules/produto/hooks/useProdutos'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtData(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR')
}

function fmtValor(tipo: string, valor: number) {
  if (tipo === 'DESCONTO_PERCENTUAL') return `${valor}%`
  if (tipo === 'DESCONTO_FIXO') return `−R$ ${valor.toFixed(2)}`
  return `R$ ${valor.toFixed(2)} fixo`
}

const TIPO_LABEL: Record<string, string> = {
  DESCONTO_PERCENTUAL: 'Desconto %',
  DESCONTO_FIXO:       'Desconto R$',
  PRECO_FIXO:          'Preço Fixo',
}

// ── Formulário ────────────────────────────────────────────────────────────────

interface FormState {
  nome: string
  descricao: string
  tipo: string
  valor: string
  escopo: string
  dataInicio: string
  dataFim: string
  quantidadeMinima: string
  valorMinimoPedido: string
  produtoIds: string[]
}

const FORM_VAZIO: FormState = {
  nome: '', descricao: '', tipo: 'DESCONTO_PERCENTUAL', valor: '',
  escopo: 'GLOBAL', dataInicio: '', dataFim: '',
  quantidadeMinima: '', valorMinimoPedido: '', produtoIds: [],
}

function toRequest(f: FormState): PromocaoRequest {
  return {
    nome:               f.nome,
    descricao:          f.descricao || undefined,
    tipo:               f.tipo,
    valor:              parseFloat(f.valor),
    escopo:             f.escopo,
    dataInicio:         f.dataInicio || undefined,
    dataFim:            f.dataFim || undefined,
    quantidadeMinima:   f.quantidadeMinima ? parseFloat(f.quantidadeMinima) : undefined,
    valorMinimoPedido:  f.valorMinimoPedido ? parseFloat(f.valorMinimoPedido) : undefined,
    produtoIds:         f.escopo === 'PRODUTO' ? f.produtoIds : [],
  }
}

function fromResponse(p: PromocaoResponse): FormState {
  return {
    nome:              p.nome,
    descricao:         p.descricao ?? '',
    tipo:              p.tipo,
    valor:             p.valor.toString(),
    escopo:            p.escopo,
    dataInicio:        p.dataInicio ?? '',
    dataFim:           p.dataFim ?? '',
    quantidadeMinima:  p.quantidadeMinima?.toString() ?? '',
    valorMinimoPedido: p.valorMinimoPedido?.toString() ?? '',
    produtoIds:        p.produtoIds,
  }
}

// ── Seletor de produtos ───────────────────────────────────────────────────────

function ProdutoSelector({
  selecionados,
  onChange,
}: {
  selecionados: string[]
  onChange: (ids: string[]) => void
}) {
  const [busca, setBusca] = useState('')
  const { data: produtos } = usePesquisarProdutos(busca)

  return (
    <div className="space-y-2">
      <Input
        placeholder="Pesquisar produto..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />
      {busca.length >= 2 && produtos && produtos.length > 0 && (
        <div className="rounded-lg border border-border bg-card max-h-40 overflow-y-auto divide-y divide-border">
          {produtos.slice(0, 10).map((p) => {
            const sel = selecionados.includes(p.id)
            return (
              <button
                key={p.id}
                type="button"
                onClick={() =>
                  onChange(sel ? selecionados.filter((id) => id !== p.id) : [...selecionados, p.id])
                }
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-left"
              >
                <span className={`h-4 w-4 rounded border flex-shrink-0 flex items-center justify-center ${sel ? 'bg-primary border-primary' : 'border-border'}`}>
                  {sel && <Check className="h-2.5 w-2.5 text-white" />}
                </span>
                <span className="font-mono text-xs text-muted-foreground w-16 shrink-0">{p.codigo}</span>
                <span className="truncate">{p.descricao}</span>
              </button>
            )
          })}
        </div>
      )}
      {selecionados.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          <span className="text-xs text-muted-foreground w-full">{selecionados.length} produto(s) selecionado(s)</span>
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs text-destructive hover:underline"
          >
            Limpar seleção
          </button>
        </div>
      )}
    </div>
  )
}

// ── Modal de criação/edição ───────────────────────────────────────────────────

function PromocaoModal({
  open,
  editando,
  onClose,
}: {
  open: boolean
  editando: PromocaoResponse | null
  onClose: () => void
}) {
  const [form, setForm] = useState<FormState>(editando ? fromResponse(editando) : FORM_VAZIO)
  const [erro, setErro] = useState<string | null>(null)

  React.useEffect(() => {
    setForm(editando ? fromResponse(editando) : FORM_VAZIO)
    setErro(null)
  }, [editando, open])

  const criar = useCriarPromocao()
  const atualizar = useAtualizarPromocao()
  const isPending = criar.isPending || atualizar.isPending

  function set(field: keyof FormState, value: string | string[]) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSalvar() {
    setErro(null)
    if (!form.nome.trim()) return setErro('Nome é obrigatório')
    const valorNum = parseFloat(form.valor)
    if (isNaN(valorNum) || valorNum <= 0) return setErro('Informe um valor maior que zero')
    if (form.tipo === 'DESCONTO_PERCENTUAL' && valorNum > 100) return setErro('Desconto % não pode ultrapassar 100')
    if (form.escopo === 'PRODUTO' && form.produtoIds.length === 0)
      return setErro('Selecione ao menos um produto')

    const req = toRequest(form)
    try {
      if (editando) {
        await atualizar.mutateAsync({ id: editando.id, req })
      } else {
        await criar.mutateAsync(req)
      }
      onClose()
    } catch (e: any) {
      setErro(e?.response?.data?.mensagem ?? 'Erro ao salvar promoção')
    }
  }

  const labelValor = form.tipo === 'DESCONTO_PERCENTUAL'
    ? 'Percentual de desconto (%) *'
    : form.tipo === 'DESCONTO_FIXO'
    ? 'Desconto por unidade (R$) *'
    : 'Preço fixo por unidade (R$) *'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editando ? 'Editar Promoção' : 'Nova Promoção'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={isPending}>
            {isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {erro && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {erro}
          </div>
        )}

        <Input label="Nome *" value={form.nome} onChange={(e) => set('nome', e.target.value)} />
        <Input label="Descrição" value={form.descricao} onChange={(e) => set('descricao', e.target.value)} />

        {/* Tipo */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Tipo de promoção *</label>
          <div className="grid grid-cols-3 gap-2">
            {(['DESCONTO_PERCENTUAL', 'DESCONTO_FIXO', 'PRECO_FIXO'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => set('tipo', t)}
                className={`rounded-lg border px-3 py-2 text-xs font-medium text-left transition-colors ${
                  form.tipo === t
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                }`}
              >
                {TIPO_LABEL[t]}
              </button>
            ))}
          </div>
        </div>

        <Input
          label={labelValor}
          type="number"
          step="0.01"
          min="0.01"
          value={form.valor}
          onChange={(e) => set('valor', e.target.value)}
        />

        {/* Período */}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Data início" type="date" value={form.dataInicio} onChange={(e) => set('dataInicio', e.target.value)} />
          <Input label="Data fim" type="date" value={form.dataFim} onChange={(e) => set('dataFim', e.target.value)} />
        </div>

        {/* Condições */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Qtd. mínima"
            type="number"
            step="0.01"
            min="0"
            placeholder="Sem mínimo"
            value={form.quantidadeMinima}
            onChange={(e) => set('quantidadeMinima', e.target.value)}
          />
          <Input
            label="Valor mínimo do pedido (R$)"
            type="number"
            step="0.01"
            min="0"
            placeholder="Sem mínimo"
            value={form.valorMinimoPedido}
            onChange={(e) => set('valorMinimoPedido', e.target.value)}
          />
        </div>

        {/* Escopo */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Aplicar em</label>
          <div className="grid grid-cols-2 gap-2">
            {(['GLOBAL', 'PRODUTO'] as const).map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => set('escopo', e)}
                className={`rounded-lg border px-3 py-2 text-xs font-medium text-left transition-colors ${
                  form.escopo === e
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                }`}
              >
                {e === 'GLOBAL' ? 'Todos os produtos' : 'Produtos específicos'}
              </button>
            ))}
          </div>
        </div>

        {form.escopo === 'PRODUTO' && (
          <div className="space-y-1">
            <label className="text-sm font-medium">Produtos</label>
            <ProdutoSelector
              selecionados={form.produtoIds}
              onChange={(ids) => set('produtoIds', ids)}
            />
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function PromocaoPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<PromocaoResponse | null>(null)
  const [confirmDesativar, setConfirmDesativar] = useState<PromocaoResponse | null>(null)

  const { data: promocoes = [], isLoading } = usePromocoes()
  const desativar = useDesativarPromocao()
  const { paginatedItems: promocoesPaginadas, page, setPage, perPage, setPerPage, totalPages, totalItems } = usePagination(promocoes)

  function abrirNova() {
    setEditando(null)
    setModalOpen(true)
  }

  function abrirEditar(p: PromocaoResponse) {
    setEditando(p)
    setModalOpen(true)
  }

  async function handleDesativar(p: PromocaoResponse) {
    await desativar.mutateAsync(p.id)
    setConfirmDesativar(null)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Promoções"
        subtitle="Descontos por período, quantidade ou valor de pedido"
        actions={
          <Button onClick={abrirNova} className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Nova promoção
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Carregando...</p>
          ) : promocoes.length === 0 ? (
            <EmptyState
              icon={<Tag className="h-8 w-8" />}
              title="Nenhuma promoção cadastrada"
              description="Crie promoções para oferecer descontos automáticos no balcão."
              action={<Button onClick={abrirNova}><Plus className="h-4 w-4 mr-1" />Nova promoção</Button>}
            />
          ) : (
            <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Condições</TableHead>
                  <TableHead>Escopo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {promocoesPaginadas.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <div>{p.nome}</div>
                      {p.descricao && (
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">{p.descricao}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="info">{TIPO_LABEL[p.tipo]}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold tabular-nums">
                      {fmtValor(p.tipo, p.valor)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {p.dataInicio || p.dataFim
                        ? `${fmtData(p.dataInicio)} → ${fmtData(p.dataFim)}`
                        : 'Sempre vigente'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.quantidadeMinima && <div>Qtd mín: {p.quantidadeMinima}</div>}
                      {p.valorMinimoPedido && <div>Pedido mín: R$ {p.valorMinimoPedido.toFixed(2)}</div>}
                      {!p.quantidadeMinima && !p.valorMinimoPedido && '—'}
                    </TableCell>
                    <TableCell>
                      {p.escopo === 'GLOBAL'
                        ? <Badge variant="outline">Global</Badge>
                        : <Badge variant="default">{p.produtoIds.length} produto(s)</Badge>}
                    </TableCell>
                    <TableCell>
                      {p.vigente
                        ? <Badge variant="success">Vigente</Badge>
                        : p.ativo
                        ? <Badge variant="warning">Fora do período</Badge>
                        : <Badge variant="outline">Inativa</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => abrirEditar(p)}
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {p.ativo && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setConfirmDesativar(p)}
                            title="Desativar"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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
            </>
          )}
        </CardContent>
      </Card>

      <PromocaoModal
        open={modalOpen}
        editando={editando}
        onClose={() => setModalOpen(false)}
      />

      {/* Confirmação de desativação */}
      <Modal
        open={!!confirmDesativar}
        onClose={() => setConfirmDesativar(null)}
        title="Desativar promoção"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmDesativar(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => confirmDesativar && handleDesativar(confirmDesativar)}
              disabled={desativar.isPending}
            >
              Desativar
            </Button>
          </>
        }
      >
        <p className="text-sm">
          Deseja desativar a promoção <strong>{confirmDesativar?.nome}</strong>?
          Ela deixará de ser aplicada imediatamente.
        </p>
      </Modal>
    </div>
  )
}
