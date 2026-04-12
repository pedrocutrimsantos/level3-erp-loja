import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil, X, Check, AlertTriangle } from 'lucide-react'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { DetailGrid } from '@/shared/components/layout/PageLayout'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Badge } from '@/shared/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/Card'
import { Modal } from '@/shared/components/ui/Modal'
import { SaldoCard } from '@/modules/estoque/components/SaldoCard'
import { MovimentacaoTable } from '@/modules/estoque/components/MovimentacaoTable'
import {
  useProduto,
  useAtualizarProduto,
  useInativarProduto,
  useAtualizarDimensao,
  usePrecificacao,
  useSalvarPrecificacao,
} from '../hooks/useProdutos'
import { useMovimentacoes } from '@/modules/estoque/hooks/useEstoque'
import { formatarM3 } from '@/shared/utils/conversaoMadeira'

// ── Modal: atualizar dimensão ─────────────────────────────────────────────────

function AtualizarDimensaoModal({
  produtoId,
  atual,
  open,
  onClose,
}: {
  produtoId: string
  atual?: { espessuraM: number; larguraM: number }
  open: boolean
  onClose: () => void
}) {
  const { mutate: atualizar, isPending } = useAtualizarDimensao()
  const [espessura, setEspessura] = useState(atual?.espessuraM.toString() ?? '')
  const [largura, setLargura] = useState(atual?.larguraM.toString() ?? '')
  const [errors, setErrors] = useState<{ espessura?: string; largura?: string }>({})

  function handleSalvar() {
    const erros: typeof errors = {}
    const esp = parseFloat(espessura)
    const lar = parseFloat(largura)
    if (!espessura || isNaN(esp) || esp <= 0) erros.espessura = 'Informe um valor positivo (ex: 0.05).'
    if (!largura || isNaN(lar) || lar <= 0) erros.largura = 'Informe um valor positivo (ex: 0.20).'
    setErrors(erros)
    if (Object.keys(erros).length > 0) return

    atualizar(
      { id: produtoId, espessuraM: esp, larguraM: lar },
      { onSuccess: onClose },
    )
  }

  function handleFechar() {
    setEspessura(atual?.espessuraM.toString() ?? '')
    setLargura(atual?.larguraM.toString() ?? '')
    setErrors({})
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleFechar}
      title="Atualizar Dimensão da Madeira"
      footer={
        <>
          <Button variant="outline" onClick={handleFechar} disabled={isPending}>Cancelar</Button>
          <Button onClick={handleSalvar} loading={isPending}>Salvar Dimensão</Button>
        </>
      }
    >
      <div className="space-y-4">
        {atual && (
          <div className="rounded-md bg-muted/40 px-4 py-3 text-sm text-gray-600">
            Dimensão atual:{' '}
            <span className="font-semibold">
              {atual.espessuraM}m × {atual.larguraM}m
            </span>
            <span className="ml-1 text-xs text-muted-foreground">
              ({(atual.espessuraM * 1000).toFixed(0)}mm × {(atual.larguraM * 1000).toFixed(0)}mm)
            </span>
            <span className="ml-2 text-xs text-muted-foreground">
              — SCD tipo 2
            </span>
          </div>
        )}
        <Input
          label="Espessura (m) *"
          type="number"
          min={0.001}
          step={0.001}
          placeholder="Ex: 0,05 (para 5cm)"
          value={espessura}
          onChange={(e) => setEspessura(e.target.value)}
          error={errors.espessura}
        />
        <Input
          label="Largura (m) *"
          type="number"
          min={0.001}
          step={0.001}
          placeholder="Ex: 0,20 (para 20cm)"
          value={largura}
          onChange={(e) => setLargura(e.target.value)}
          error={errors.largura}
        />
      </div>
    </Modal>
  )
}

// ── Modal: confirmar inativação ───────────────────────────────────────────────

function ConfirmarInativacaoModal({
  produtoId,
  descricao,
  open,
  onClose,
}: {
  produtoId: string
  descricao: string
  open: boolean
  onClose: () => void
}) {
  const navigate = useNavigate()
  const { mutate: inativar, isPending } = useInativarProduto()

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Inativar produto"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancelar</Button>
          <Button
            variant="destructive"
            loading={isPending}
            onClick={() =>
              inativar(produtoId, {
                onSuccess: () => navigate('/produtos'),
              })
            }
          >
            Inativar
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        <p className="text-sm text-gray-700">
          Deseja inativar o produto <span className="font-semibold">{descricao}</span>?
        </p>
        <p className="text-xs text-muted-foreground">
          O produto não será excluído — apenas marcado como inativo e não aparecerá nas listagens padrão.
        </p>
      </div>
    </Modal>
  )
}

// ── Card: dados do produto com edição inline ──────────────────────────────────

function DadosCard({ produtoId }: { produtoId: string }) {
  const { data: produto } = useProduto(produtoId)
  const { mutate: atualizar, isPending } = useAtualizarProduto()

  const [editando, setEditando] = useState(false)
  const [descricao, setDescricao] = useState('')
  const [ncm, setNcm] = useState('')
  const [comprimentoPecaM, setComprimentoPecaM] = useState('')
  const [precoVenda, setPrecoVenda] = useState('')
  const [error, setError] = useState<string | null>(null)

  function iniciarEdicao() {
    if (!produto) return
    setDescricao(produto.descricao)
    setNcm(produto.ncm)
    setComprimentoPecaM(produto.comprimentoPecaM?.toString() ?? '')
    setPrecoVenda(produto.precoVenda ?? '')
    setError(null)
    setEditando(true)
  }

  function cancelarEdicao() {
    setEditando(false)
    setComprimentoPecaM('')
    setPrecoVenda('')
    setError(null)
  }

  function handleSalvar() {
    if (!descricao.trim()) { setError('Descrição é obrigatória'); return }
    if (ncm.length !== 8) { setError('NCM deve ter exatamente 8 dígitos'); return }
    const compNum = comprimentoPecaM.trim() ? parseFloat(comprimentoPecaM) : null
    if (comprimentoPecaM.trim() && (isNaN(compNum!) || compNum! <= 0)) {
      setError('Comprimento da peça deve ser um número positivo')
      return
    }
    const precoNum = precoVenda.trim() ? parseFloat(precoVenda) : null
    if (precoVenda.trim() && (isNaN(precoNum!) || precoNum! <= 0)) {
      setError('Preço deve ser um número positivo')
      return
    }
    setError(null)
    atualizar(
      {
        id: produtoId,
        req: {
          descricao: descricao.trim(),
          ncm: ncm.trim(),
          comprimentoPecaM: compNum,
          precoVenda: precoNum,
        },
      },
      { onSuccess: () => setEditando(false) },
    )
  }

  if (!produto) return null

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Dados do Produto</CardTitle>
        {!editando && (
          <Button variant="ghost" size="sm" onClick={iniciarEdicao}>
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Campos somente-leitura */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Código</p>
            <p className="font-mono font-medium">{produto.codigo}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Tipo</p>
            <Badge variant={produto.tipo === 'MADEIRA' ? 'default' : 'outline'} className="mt-0.5">
              {produto.tipo}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Unidade de Venda</p>
            <p className="font-medium">{produto.unidadeVendaSigla}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
            <Badge variant={produto.ativo ? 'success' : 'destructive'} className="mt-0.5">
              {produto.ativo ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        </div>

        <div className="border-t border-border pt-3 space-y-3">
          {editando ? (
            <>
              <Input
                label="Descrição *"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                error={error && error.includes('Descrição') ? error : undefined}
              />
              <Input
                label="NCM *"
                value={ncm}
                onChange={(e) => setNcm(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="8 dígitos"
                maxLength={8}
                error={error && error.includes('NCM') ? error : undefined}
              />
              {produto.tipo === 'MADEIRA' && (
                <Input
                  label="Comprimento da peça (m)"
                  type="number"
                  min={0.01}
                  step={0.01}
                  placeholder="Deixe em branco para remover"
                  value={comprimentoPecaM}
                  onChange={(e) => setComprimentoPecaM(e.target.value)}
                />
              )}
              <Input
                label={produto.tipo === 'MADEIRA' ? 'Preço de Venda (R$/metro linear)' : 'Preço de Venda (R$/unidade)'}
                type="number"
                min={0.01}
                step={0.01}
                placeholder="Ex: 12,50"
                value={precoVenda}
                onChange={(e) => setPrecoVenda(e.target.value)}
              />
              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={handleSalvar} loading={isPending}>
                  <Check className="mr-1 h-3.5 w-3.5" />
                  Salvar
                </Button>
                <Button size="sm" variant="outline" onClick={cancelarEdicao} disabled={isPending}>
                  <X className="mr-1 h-3.5 w-3.5" />
                  Cancelar
                </Button>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Descrição</p>
                <p className="font-medium text-sm">{produto.descricao}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">NCM</p>
                <p className="font-mono text-sm">{produto.ncm}</p>
              </div>
              {produto.tipo === 'MADEIRA' && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Comprimento da peça</p>
                  <p className="text-sm">
                    {produto.comprimentoPecaM
                      ? `${produto.comprimentoPecaM} m por peça`
                      : <span className="text-muted-foreground">Não configurado</span>}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Preço de Venda {produto.tipo === 'MADEIRA' ? '(R$/metro linear)' : '(R$/unidade)'}
                </p>
                <p className="text-sm font-semibold">
                  {produto.precoVenda
                    ? parseFloat(produto.precoVenda).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                    : <span className="font-normal text-muted-foreground">Não definido</span>}
                </p>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Card: dimensões da madeira ────────────────────────────────────────────────

function DimensaoCard({ produtoId }: { produtoId: string }) {
  const { data: produto } = useProduto(produtoId)
  const [modalAberto, setModalAberto] = useState(false)

  if (!produto || produto.tipo !== 'MADEIRA') return null

  const dim = produto.dimensaoVigente

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Dimensões da Madeira</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setModalAberto(true)}>
            <Pencil className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {dim ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Espessura</p>
                <p className="font-medium">{(dim.espessuraM * 1000).toFixed(0)} mm <span className="text-muted-foreground">({dim.espessuraM} m)</span></p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Largura</p>
                <p className="font-medium">{(dim.larguraM * 1000).toFixed(0)} mm <span className="text-muted-foreground">({dim.larguraM} m)</span></p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Fator de conversão</p>
                <p className="font-mono text-sm">{dim.fatorConversao} m²/m</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Metro linear / m³</p>
                <p className="font-medium">{parseFloat(dim.metrosLinearPorM3).toFixed(2)} m/m³</p>
              </div>
              {produto?.unidadeCompra && (
                <div className="col-span-2 pt-1 border-t border-border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Unidades de Operação</p>
                  <div className="flex gap-4 text-xs">
                    <span className="rounded bg-blue-50 px-2 py-0.5 text-blue-700 font-medium">
                      Compra: {produto.unidadeCompra}
                    </span>
                    <span className="rounded bg-green-50 px-2 py-0.5 text-green-700 font-medium">
                      Estoque: {produto.unidadeEstoque}
                    </span>
                    <span className="rounded bg-orange-50 px-2 py-0.5 text-orange-700 font-medium">
                      Fiscal (NF): {produto.unidadeFiscal}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              <span>Nenhuma dimensão cadastrada — produto não pode ser vendido.</span>
            </div>
          )}
        </CardContent>
      </Card>

      <AtualizarDimensaoModal
        produtoId={produtoId}
        atual={dim ? { espessuraM: dim.espessuraM, larguraM: dim.larguraM } : undefined}
        open={modalAberto}
        onClose={() => setModalAberto(false)}
      />
    </>
  )
}

// ── Card: precificação por tipo de pessoa e pagamento ─────────────────────────

function PrecificacaoCard({ produtoId, tipoProduto }: { produtoId: string; tipoProduto: string }) {
  const { data: prec, isLoading } = usePrecificacao(produtoId)
  const { mutate: salvar, isPending } = useSalvarPrecificacao()

  const [editando, setEditando] = useState(false)
  const [pfVista, setPfVista] = useState('')
  const [pfPrazo, setPfPrazo] = useState('')
  const [pjVista, setPjVista] = useState('')
  const [pjPrazo, setPjPrazo] = useState('')
  const [error, setError] = useState<string | null>(null)

  const unidadeLabel = tipoProduto === 'MADEIRA' ? 'R$/metro linear' : 'R$/unidade'

  function iniciarEdicao() {
    if (!prec) return
    setPfVista(prec.pfVista ? parseFloat(prec.pfVista).toFixed(2) : '')
    setPfPrazo(prec.pfPrazo ? parseFloat(prec.pfPrazo).toFixed(2) : '')
    setPjVista(prec.pjVista ? parseFloat(prec.pjVista).toFixed(2) : '')
    setPjPrazo(prec.pjPrazo ? parseFloat(prec.pjPrazo).toFixed(2) : '')
    setError(null)
    setEditando(true)
  }

  function handleSalvar() {
    function parsePreco(v: string): number | null {
      if (!v.trim()) return null
      const n = parseFloat(v)
      return isNaN(n) || n <= 0 ? -1 : n
    }
    const pv = parsePreco(pfVista)
    const pp = parsePreco(pfPrazo)
    const jv = parsePreco(pjVista)
    const jp = parsePreco(pjPrazo)
    if (pv === -1 || pp === -1 || jv === -1 || jp === -1) {
      setError('Preços devem ser números positivos ou ficar em branco.')
      return
    }
    setError(null)
    salvar(
      { id: produtoId, req: { pfVista: pv, pfPrazo: pp, pjVista: jv, pjPrazo: jp } },
      { onSuccess: () => setEditando(false) },
    )
  }

  function fmt(v: string | null | undefined) {
    if (!v) return null
    return parseFloat(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Precificação</CardTitle>
        {!editando && !isLoading && (
          <Button variant="ghost" size="sm" onClick={iniciarEdicao}>
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">{unidadeLabel}</p>

        {editando ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="PF — À Vista"
                type="number"
                min={0.01}
                step={0.01}
                placeholder="Ex: 12,50"
                value={pfVista}
                onChange={(e) => setPfVista(e.target.value)}
              />
              <Input
                label="PF — A Prazo"
                type="number"
                min={0.01}
                step={0.01}
                placeholder="Ex: 13,50"
                value={pfPrazo}
                onChange={(e) => setPfPrazo(e.target.value)}
              />
              <Input
                label="PJ — À Vista"
                type="number"
                min={0.01}
                step={0.01}
                placeholder="Ex: 11,00"
                value={pjVista}
                onChange={(e) => setPjVista(e.target.value)}
              />
              <Input
                label="PJ — A Prazo"
                type="number"
                min={0.01}
                step={0.01}
                placeholder="Ex: 12,00"
                value={pjPrazo}
                onChange={(e) => setPjPrazo(e.target.value)}
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleSalvar} loading={isPending}>
                <Check className="mr-1 h-3.5 w-3.5" />
                Salvar
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditando(false)} disabled={isPending}>
                <X className="mr-1 h-3.5 w-3.5" />
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            {/* PF */}
            <div className="col-span-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Pessoa Física (PF)
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">À Vista</p>
              <p className="font-medium">{fmt(prec?.pfVista) ?? <span className="text-muted-foreground font-normal">—</span>}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">A Prazo</p>
              <p className="font-medium">{fmt(prec?.pfPrazo) ?? <span className="text-muted-foreground font-normal">—</span>}</p>
            </div>
            {/* PJ */}
            <div className="col-span-2 border-t border-border pt-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Pessoa Jurídica (PJ)
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">À Vista</p>
              <p className="font-medium">{fmt(prec?.pjVista) ?? <span className="text-muted-foreground font-normal">—</span>}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">A Prazo</p>
              <p className="font-medium">{fmt(prec?.pjPrazo) ?? <span className="text-muted-foreground font-normal">—</span>}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function ProdutoDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [inativacaoAberta, setInativacaoAberta] = useState(false)

  const { data: produto, isLoading } = useProduto(id ?? '')
  const { data: movimentacoes, isLoading: loadingMov } = useMovimentacoes(id ?? null, 10)

  if (!id) return null

  return (
    <div>
      <PageHeader
        title={isLoading ? 'Carregando…' : (produto?.descricao ?? 'Produto')}
        subtitle={produto ? `Código: ${produto.codigo}` : undefined}
        badge={
          produto ? (
            <>
              <Badge variant={produto.tipo === 'MADEIRA' ? 'default' : 'outline'}>
                {produto.tipo === 'MADEIRA' ? 'Madeira' : 'Normal'}
              </Badge>
              <Badge variant={produto.ativo ? 'success' : 'destructive'}>
                {produto.ativo ? 'Ativo' : 'Inativo'}
              </Badge>
            </>
          ) : undefined
        }
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/produtos')}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Voltar
            </Button>
            {produto?.ativo && (
              <Button variant="destructive" size="sm" onClick={() => setInativacaoAberta(true)}>
                Inativar produto
              </Button>
            )}
          </div>
        }
      />

      <DetailGrid>
        {/* Coluna principal (60%) — dados, dimensões, precificação */}
        <div className="flex flex-col gap-6">
          <DadosCard produtoId={id} />
          <DimensaoCard produtoId={id} />
          <PrecificacaoCard produtoId={id} tipoProduto={produto?.tipo ?? 'NORMAL'} />
        </div>

        {/* Coluna lateral (40%) — saldo e movimentações */}
        <div className="flex flex-col gap-6">
          <SaldoCard produtoId={id} tipo={produto?.tipo ?? 'NORMAL'} />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Últimas Movimentações</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => navigate(`/estoque/${id}`)}
              >
                Ver todas →
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {loadingMov ? (
                <div className="animate-pulse space-y-2 p-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-8 rounded bg-muted" />
                  ))}
                </div>
              ) : (
                <MovimentacaoTable movimentacoes={movimentacoes ?? []} />
              )}
            </CardContent>
          </Card>
        </div>
      </DetailGrid>

      {produto && (
        <ConfirmarInativacaoModal
          produtoId={id}
          descricao={produto.descricao}
          open={inativacaoAberta}
          onClose={() => setInativacaoAberta(false)}
        />
      )}
    </div>
  )
}
