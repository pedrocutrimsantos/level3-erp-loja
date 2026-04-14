import React, { useState, useMemo, useEffect } from 'react'
import { X, ShoppingCart, Lock, Search, User, CreditCard } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Modal } from '@/shared/components/ui/Modal'
import {
  linearParaM3,
  m3ParaLinear,
  formatarM3,
  formatarMetros,
  dimensoesValidas,
} from '@/shared/utils/conversaoMadeira'
import { usePesquisarProdutos, usePrecificacao } from '@/modules/produto/hooks/useProdutos'
import { useSaldoEstoque } from '@/modules/estoque/hooks/useEstoque'
import { useVendaBalcao, useRegistrarOrcamento } from '../hooks/useVenda'
import { useTurno } from '@/modules/financeiro/hooks/useTurno'
import { useClientes } from '@/modules/cliente/hooks/useClientes'
import { usePromocoesPorProduto } from '@/modules/promocao/hooks/usePromocao'
import type { ProdutoResponse } from '@/shared/api/produtos'
import type { PromocaoResponse } from '@/shared/api/promocao'
import type { VendaBalcaoResponse } from '@/shared/api/vendas'

// ── Tipos internos do carrinho ──────────────────────────────────────────────

interface ItemCarrinhoMadeira {
  tipo: 'MADEIRA'
  produtoId: string
  descricao: string
  metros: number
  volumeM3: number
  precoUnitario: number
  valorTotal: number
}

interface ItemCarrinhoNormal {
  tipo: 'NORMAL'
  produtoId: string
  descricao: string
  qtd: number
  unidadeSigla: string
  precoUnitario: number
  valorTotal: number
}

type ItemCarrinho = ItemCarrinhoMadeira | ItemCarrinhoNormal

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const FORMAS_PAGAMENTO = [
  { value: 'DINHEIRO',       label: 'Dinheiro',  full: false },
  { value: 'PIX',            label: 'PIX',       full: false },
  { value: 'CARTAO_DEBITO',  label: 'Débito',    full: false },
  { value: 'CARTAO_CREDITO', label: 'Crédito',   full: false },
  { value: 'BOLETO',         label: 'Boleto',    full: false },
  { value: 'CHEQUE',         label: 'Cheque',    full: false },
  { value: 'FIADO',          label: 'Fiado',     full: true  },
] as const

const VISTA_SET = new Set(['DINHEIRO', 'PIX', 'CARTAO_DEBITO', 'CARTAO_CREDITO'])

// ── Saldo inline (modal de adicionar item) ──────────────────────────────────

function SaldoInline({ produtoId, tipo, espessuraM, larguraM }: {
  produtoId: string
  tipo: 'MADEIRA' | 'NORMAL'
  espessuraM?: number
  larguraM?: number
}) {
  const { data: saldo } = useSaldoEstoque(produtoId)
  if (!saldo) return null

  if (tipo === 'NORMAL') {
    const saldoUnd = saldo.saldoUnidade != null ? parseFloat(saldo.saldoUnidade) : 0
    const unidade = saldo.unidadeSigla ?? 'UN'
    return (
      <p className="text-xs text-muted-foreground">
        Saldo: {saldoUnd.toLocaleString('pt-BR', { maximumFractionDigits: 4 })} {unidade}
      </p>
    )
  }

  const saldoM3 = parseFloat(saldo.saldoM3)
  const saldoLinear = espessuraM && larguraM ? m3ParaLinear(saldoM3, espessuraM, larguraM) : null
  const pecas = saldo.saldoPecas ?? null

  return (
    <p className="text-xs text-muted-foreground">
      Saldo: {formatarM3(saldoM3)} m³
      {saldoLinear != null && ` ≡ ${formatarMetros(saldoLinear)} m`}
      {pecas != null && (
        <span className="ml-1 font-semibold text-foreground">
          · {pecas.toLocaleString('pt-BR')} {pecas === 1 ? 'peça' : 'peças'}
        </span>
      )}
    </p>
  )
}

// ── Modal de adicionar item ─────────────────────────────────────────────────

interface AddItemModalProps {
  produto: ProdutoResponse | null
  onClose: () => void
  onAdicionar: (item: ItemCarrinho) => void
  tipoPessoa: 'PF' | 'PJ' | 'ANONIMO'
  tipoPagamento: 'VISTA' | 'PRAZO'
}

type ModoVenda = 'metros' | 'pecas'

function calcularPrecoPromocional(p: PromocaoResponse, precoBase: number): number {
  if (p.tipo === 'DESCONTO_PERCENTUAL') return precoBase * (1 - p.valor / 100)
  if (p.tipo === 'DESCONTO_FIXO') return Math.max(0, precoBase - p.valor)
  return p.valor // PRECO_FIXO
}

function melhorPromocao(
  promocoes: PromocaoResponse[],
  precoBase: number,
  quantidade: number,
): PromocaoResponse | null {
  const vigentes = promocoes.filter((p) => {
    if (!p.vigente) return false
    if (p.quantidadeMinima != null && quantidade < p.quantidadeMinima) return false
    return true
  })
  if (vigentes.length === 0) return null
  return vigentes.reduce((best, p) => {
    const descBest = precoBase - calcularPrecoPromocional(best, precoBase)
    const descP    = precoBase - calcularPrecoPromocional(p, precoBase)
    return descP > descBest ? p : best
  })
}

function AddItemModal({ produto, onClose, onAdicionar, tipoPessoa, tipoPagamento }: AddItemModalProps) {
  const [modo, setModo] = useState<ModoVenda>('metros')
  const [metros, setMetros] = useState('')
  const [pecas, setPecas] = useState('')
  const [qtd, setQtd] = useState('')
  const [preco, setPreco] = useState('')
  const [errors, setErrors] = useState<{ quantidade?: string; preco?: string }>({})

  const { data: precificacao }  = usePrecificacao(produto?.id ?? '')
  const { data: promocoesProd } = usePromocoesPorProduto(produto?.id ?? null)

  useEffect(() => {
    setPreco(produto?.precoVenda ? parseFloat(produto.precoVenda).toFixed(2) : '')
    setMetros('')
    setPecas('')
    setQtd('')
    setErrors({})
    setModo('metros')
  }, [produto?.id])

  useEffect(() => {
    if (!precificacao || !produto) return
    const chave =
      tipoPessoa === 'PJ'
        ? tipoPagamento === 'PRAZO' ? 'pjPrazo' : 'pjVista'
        : tipoPagamento === 'PRAZO' ? 'pfPrazo' : 'pfVista'
    const precoSugerido = precificacao[chave as keyof typeof precificacao]
    if (precoSugerido) {
      setPreco(parseFloat(precoSugerido).toFixed(2))
    }
  }, [precificacao, tipoPessoa, tipoPagamento, produto?.id])

  if (!produto) return null

  const isMadeira = produto.tipo === 'MADEIRA'
  const espessuraM = produto.dimensaoVigente?.espessuraM
  const larguraM = produto.dimensaoVigente?.larguraM
  const comprimentoPecaM = produto.comprimentoPecaM ?? null
  const temDimensoes = isMadeira && dimensoesValidas(espessuraM, larguraM)
  const temPeca = isMadeira && comprimentoPecaM != null && comprimentoPecaM > 0

  const pecasNum = parseFloat(pecas)
  const metrosNum = parseFloat(metros)
  const qtdNum = parseFloat(qtd)
  const precoNum = parseFloat(preco)

  const metrosEfetivos: number | null = (() => {
    if (!isMadeira) return null
    if (modo === 'pecas' && !isNaN(pecasNum) && pecasNum > 0 && comprimentoPecaM) {
      return pecasNum * comprimentoPecaM
    }
    if (modo === 'metros' && !isNaN(metrosNum) && metrosNum > 0) {
      return metrosNum
    }
    return null
  })()

  const metrosEfetivosValidos = metrosEfetivos != null && metrosEfetivos > 0
  const qtdValida = !isNaN(qtdNum) && qtdNum > 0
  const precoValido = !isNaN(precoNum) && precoNum > 0

  // ── Promoção aplicável ──────────────────────────────────────────────────────
  const qtdParaPromocao = isMadeira
    ? (metrosEfetivos ?? 0)
    : (qtdValida ? qtdNum : 0)
  const promocaoAtiva = promocoesProd && precoValido
    ? melhorPromocao(promocoesProd, precoNum, qtdParaPromocao)
    : null
  const precoPromocional = promocaoAtiva
    ? calcularPrecoPromocional(promocaoAtiva, precoNum)
    : null

  let volumeM3Preview: number | null = null
  if (isMadeira && temDimensoes && metrosEfetivosValidos && espessuraM && larguraM) {
    try { volumeM3Preview = linearParaM3(metrosEfetivos!, espessuraM, larguraM) } catch { volumeM3Preview = null }
  }

  const subtotalPreview =
    isMadeira && metrosEfetivosValidos && precoValido
      ? metrosEfetivos! * precoNum
      : !isMadeira && qtdValida && precoValido
        ? qtdNum * precoNum
        : null

  function handleModo(novo: ModoVenda) {
    setModo(novo)
    setMetros('')
    setPecas('')
    setErrors({})
  }

  function validar(): boolean {
    const erros: { quantidade?: string; preco?: string } = {}
    if (isMadeira) {
      if (!metrosEfetivosValidos) erros.quantidade = 'Informe uma quantidade maior que zero.'
      if (!temDimensoes) erros.quantidade = 'Produto sem dimensões cadastradas. Cadastre dimensões antes de vender.'
    } else {
      if (!qtd || !qtdValida) erros.quantidade = 'Informe uma quantidade maior que zero.'
    }
    if (!preco || !precoValido) erros.preco = 'Informe um preço maior que zero.'
    setErrors(erros)
    return Object.keys(erros).length === 0
  }

  function handleAdicionar() {
    if (!validar() || !produto) return
    if (isMadeira && temDimensoes && espessuraM && larguraM && volumeM3Preview != null && metrosEfetivos != null) {
      onAdicionar({
        tipo: 'MADEIRA',
        produtoId: produto.id,
        descricao: produto.descricao,
        metros: metrosEfetivos,
        volumeM3: volumeM3Preview,
        precoUnitario: precoNum,
        valorTotal: metrosEfetivos * precoNum,
      })
    } else if (!isMadeira) {
      onAdicionar({
        tipo: 'NORMAL',
        produtoId: produto.id,
        descricao: produto.descricao,
        qtd: qtdNum,
        unidadeSigla: produto.unidadeVendaSigla ?? 'UN',
        precoUnitario: precoNum,
        valorTotal: qtdNum * precoNum,
      })
    }
  }

  return (
    <Modal
      open={!!produto}
      onClose={onClose}
      title={`Adicionar — ${produto.descricao}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleAdicionar}>Adicionar ao carrinho</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="text-xs text-muted-foreground">
            {produto.codigo} · {produto.tipo}
            {temPeca && <span className="ml-1 text-primary font-medium">· {comprimentoPecaM}m/peça</span>}
          </p>
          <SaldoInline
            produtoId={produto.id}
            tipo={produto.tipo}
            espessuraM={espessuraM}
            larguraM={larguraM}
          />
          {isMadeira && espessuraM && larguraM && (
            <p className="text-xs text-muted-foreground">
              {(espessuraM * 1000).toFixed(0)}mm × {(larguraM * 1000).toFixed(0)}mm
            </p>
          )}
          {isMadeira && !temDimensoes && (
            <p className="text-xs text-destructive">
              Produto sem dimensões cadastradas. Não é possível vender.
            </p>
          )}
        </div>

        {temPeca && (
          <div className="flex gap-1 rounded-md border border-border bg-muted/30 p-1">
            {(['metros', 'pecas'] as ModoVenda[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => handleModo(m)}
                className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                  modo === m ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m === 'metros' ? 'Vender por metros' : 'Vender por peças'}
              </button>
            ))}
          </div>
        )}

        {isMadeira ? (
          modo === 'pecas' ? (
            <div className="space-y-2">
              <Input
                label="Quantidade (peças) *"
                type="number" step="1" min="1" placeholder="0"
                value={pecas}
                onChange={(e) => setPecas(e.target.value)}
                error={errors.quantidade}
              />
              {!isNaN(pecasNum) && pecasNum > 0 && comprimentoPecaM && (
                <p className="text-xs text-muted-foreground">
                  {pecasNum} peças × {comprimentoPecaM} m ={' '}
                  <span className="font-semibold text-foreground">{formatarMetros(pecasNum * comprimentoPecaM)} m lineares</span>
                </p>
              )}
            </div>
          ) : (
            <Input
              label="Quantidade (metros lineares) *"
              type="number" step="0.01" min="0.01" placeholder="0.00"
              value={metros}
              onChange={(e) => setMetros(e.target.value)}
              error={errors.quantidade}
            />
          )
        ) : (
          <Input
            label={`Quantidade (${produto.unidadeVendaSigla ?? 'UN'}) *`}
            type="number" step="1" min="1" placeholder="0"
            value={qtd}
            onChange={(e) => setQtd(e.target.value)}
            error={errors.quantidade}
          />
        )}

        <div className="space-y-1">
          <Input
            label={isMadeira ? 'Preço por metro linear (R$) *' : `Preço por ${produto.unidadeVendaSigla ?? 'UN'} (R$) *`}
            type="number" step="0.01" min="0.01" placeholder="0.00"
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            error={errors.preco}
          />
          {precificacao && (
            <p className="text-xs text-muted-foreground">
              Tabela: {tipoPessoa === 'PJ' ? 'PJ' : 'PF'} · {tipoPagamento === 'PRAZO' ? 'A Prazo' : 'À Vista'}
            </p>
          )}
          {promocaoAtiva && precoPromocional != null && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-700/40 dark:bg-emerald-950/30 px-3 py-2">
              <span className="flex-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                🏷️ {promocaoAtiva.nome} — preço promocional: <strong>R$ {precoPromocional.toFixed(2)}</strong>
                {promocaoAtiva.tipo === 'DESCONTO_PERCENTUAL' && ` (${promocaoAtiva.valor}% off)`}
              </span>
              <button
                type="button"
                className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 underline hover:no-underline shrink-0"
                onClick={() => setPreco(precoPromocional.toFixed(2))}
              >
                Aplicar
              </button>
            </div>
          )}
        </div>

        {isMadeira && metrosEfetivosValidos && precoValido && volumeM3Preview != null && (
          <div className="rounded-md bg-warning/10 p-3 text-sm space-y-1">
            <p>Metragem: <span className="font-bold">{formatarMetros(metrosEfetivos!)} m lineares</span></p>
            <p>Volume fiscal: <span className="font-bold">{formatarM3(volumeM3Preview)} m³</span></p>
            <p>Subtotal: <span className="font-bold">R$ {subtotalPreview!.toFixed(2)}</span></p>
          </div>
        )}

        {!isMadeira && qtdValida && precoValido && subtotalPreview != null && (
          <div className="rounded-md bg-warning/10 p-3 text-sm">
            <p>Subtotal: <span className="font-bold">R$ {subtotalPreview.toFixed(2)}</span></p>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Seletor de cliente ───────────────────────────────────────────────────────

interface ClienteSelecionado {
  id: string
  nome: string
  tipoPessoa: 'PF' | 'PJ' | 'ANONIMO'
}

function ClienteSelector({
  valor,
  onChange,
}: {
  valor: ClienteSelecionado | null
  onChange: (c: ClienteSelecionado | null) => void
}) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const { data: clientes } = useClientes(true)

  const filtrados = useMemo(() => {
    if (!clientes) return []
    const t = busca.toLowerCase().trim()
    if (!t) return clientes.slice(0, 20)
    return clientes
      .filter(
        (c) =>
          c.razaoSocial.toLowerCase().includes(t) ||
          c.nomeFantasia?.toLowerCase().includes(t) ||
          c.cnpjCpf?.replace(/\D/g, '').includes(t.replace(/\D/g, ''))
      )
      .slice(0, 20)
  }, [clientes, busca])

  function selecionar(id: string, nome: string, tipoPessoa: 'PF' | 'PJ' | 'ANONIMO') {
    onChange({ id, nome, tipoPessoa })
    setAberto(false)
    setBusca('')
  }

  if (valor) {
    const tipoBadge = valor.tipoPessoa === 'PJ' ? 'PJ' : valor.tipoPessoa === 'PF' ? 'PF' : null
    return (
      <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm">
        <span className="flex-1 font-semibold text-primary truncate">{valor.nome}</span>
        {tipoBadge && (
          <span className="shrink-0 rounded bg-primary/20 px-1.5 py-0.5 text-xs font-bold text-primary">
            {tipoBadge}
          </span>
        )}
        <button
          type="button"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => onChange(null)}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <input
        className="w-full rounded-lg border border-border bg-input text-foreground px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        placeholder="Consumidor final (opcional)..."
        value={busca}
        onChange={(e) => { setBusca(e.target.value); setAberto(true) }}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
      />
      {aberto && filtrados.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg max-h-48 overflow-y-auto">
          {filtrados.map((c) => (
            <button
              key={c.id}
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted/50 border-b border-border/50 last:border-b-0"
              onMouseDown={() => selecionar(c.id, c.razaoSocial, c.tipoPessoa)}
            >
              <div className="flex-1 min-w-0">
                <span className="font-medium block truncate">{c.razaoSocial}</span>
                {c.cnpjCpf && (
                  <span className="text-xs text-muted-foreground font-mono">{c.cnpjCpf}</span>
                )}
              </div>
              {c.tipoPessoa !== 'ANONIMO' && (
                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">
                  {c.tipoPessoa}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────────────────────

export default function VendaBalcaoPage() {
  const { data: turno, isLoading: loadingTurno } = useTurno()
  const { mutate: registrarVenda, isPending } = useVendaBalcao()
  const { mutate: salvarOrcamento, isPending: isPendingOrc } = useRegistrarOrcamento()

  const [busca, setBusca] = useState('')
  const { data: produtos, isFetching } = usePesquisarProdutos(busca)
  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoResponse | null>(null)
  const [itens, setItens] = useState<ItemCarrinho[]>([])
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteSelecionado | null>(null)
  const [formaPagamento, setFormaPagamento] = useState('DINHEIRO')
  const [dataVencimentoFiado, setDataVencimentoFiado] = useState('')
  const [numeroParcelas, setNumeroParcelas] = useState(1)
  const [vendaRealizada, setVendaRealizada] = useState<VendaBalcaoResponse | null>(null)
  const [erroVenda, setErroVenda] = useState<string | null>(null)
  const [confirmandoVenda, setConfirmandoVenda] = useState(false)

  const tipoPagamento: 'VISTA' | 'PRAZO' = useMemo(
    () => (VISTA_SET.has(formaPagamento) ? 'VISTA' : 'PRAZO'),
    [formaPagamento]
  )

  const tipoPessoa = clienteSelecionado?.tipoPessoa ?? 'ANONIMO'
  const totalGeral = itens.reduce((acc, item) => acc + item.valorTotal, 0)

  function abrirAddItem(produto: ProdutoResponse) { setProdutoSelecionado(produto) }
  function fecharAddItem() { setProdutoSelecionado(null) }

  function adicionarItem(item: ItemCarrinho) {
    setItens((prev) => [...prev, item])
    fecharAddItem()
  }

  function removerItem(index: number) {
    setItens((prev) => prev.filter((_, i) => i !== index))
  }

  function montarReq() {
    return {
      clienteId: clienteSelecionado?.id,
      formaPagamento,
      dataVencimentoFiado: formaPagamento === 'FIADO' && dataVencimentoFiado ? dataVencimentoFiado : undefined,
      numeroParcelas: formaPagamento === 'CARTAO_CREDITO' && numeroParcelas > 1 ? numeroParcelas : undefined,
      itens: itens.map((item) =>
        item.tipo === 'MADEIRA'
          ? { produtoId: item.produtoId, quantidadeMetroLinear: item.metros.toFixed(2), precoUnitario: item.precoUnitario.toFixed(2) }
          : { produtoId: item.produtoId, quantidadeUnidade: item.qtd.toFixed(0), precoUnitario: item.precoUnitario.toFixed(2) }
      ),
    }
  }

  // Valida e abre o modal de resumo
  function confirmarVenda() {
    if (itens.length === 0) return
    if (formaPagamento === 'FIADO' && !clienteSelecionado) {
      setErroVenda('Selecione um cliente para realizar venda fiado.')
      return
    }
    setErroVenda(null)
    setConfirmandoVenda(true)
  }

  // Chamado somente após confirmação no resumo
  function executarVenda() {
    registrarVenda(montarReq(), {
      onSuccess: (data) => { setConfirmandoVenda(false); setVendaRealizada(data); setItens([]) },
      onError: (err: unknown) => {
        setConfirmandoVenda(false)
        setErroVenda(
          (err as any)?.response?.data?.detalhes ??
          (err as any)?.response?.data?.erro ??
          (err instanceof Error ? err.message : 'Erro ao registrar venda.')
        )
      },
    })
  }

  function salvarComoOrcamento() {
    if (itens.length === 0) return
    setErroVenda(null)
    salvarOrcamento(montarReq(), {
      onSuccess: (data) => { setVendaRealizada(data); setItens([]) },
      onError: (err: unknown) => {
        setErroVenda(
          (err as any)?.response?.data?.detalhes ??
          (err as any)?.response?.data?.erro ??
          (err instanceof Error ? err.message : 'Erro ao salvar orçamento.')
        )
      },
    })
  }

  function novaVenda() {
    setVendaRealizada(null)
    setErroVenda(null)
    setBusca('')
    setClienteSelecionado(null)
    setFormaPagamento('DINHEIRO')
    setDataVencimentoFiado('')
  }

  // ── Tela de sucesso ────────────────────────────────────────────────────────

  if (vendaRealizada) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-12">
        <div className="w-full max-w-lg">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20 p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
              <ShoppingCart className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">Venda registrada!</p>
            <p className="mt-1 text-sm font-mono font-bold text-emerald-600/80 dark:text-emerald-400/80">
              Nº {vendaRealizada.numero}
            </p>

            <div className="mt-6 space-y-2 text-left">
              {vendaRealizada.itens.map((item) => (
                <div key={item.produtoId} className="rounded-xl border border-emerald-200/60 bg-white dark:bg-emerald-900/10 px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">
                    {item.tipoProduto === 'MADEIRA'
                      ? `${item.produtoDescricao}: ${item.quantidadeMetroLinear}m → ${item.volumeM3Calculado} m³`
                      : `${item.produtoDescricao}: ${item.quantidadeUnidade} ${item.unidadeSigla ?? 'UN'}`}
                  </p>
                  {item.formula && (
                    <p className="mt-0.5 text-xs text-muted-foreground font-mono break-all">{item.formula}</p>
                  )}
                  {item.tipoProduto === 'MADEIRA' && item.novoSaldoM3 && (
                    <p className="mt-0.5 text-xs text-emerald-600">
                      Novo saldo: {item.novoSaldoM3} m³
                      {item.novoSaldoMetrosLineares && ` (${item.novoSaldoMetrosLineares} m)`}
                    </p>
                  )}
                  {item.tipoProduto === 'NORMAL' && item.novoSaldoUnidade && (
                    <p className="mt-0.5 text-xs text-emerald-600">
                      Novo saldo: {item.novoSaldoUnidade} {item.unidadeSigla ?? 'UN'}
                    </p>
                  )}
                  <p className="mt-1 text-sm font-bold text-foreground text-right">
                    {fmt(parseFloat(item.valorTotalItem))}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 px-4 py-4">
              <p className="text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wide font-semibold mb-0.5">Total</p>
              <p className="text-4xl font-black text-emerald-700 dark:text-emerald-300">
                {fmt(parseFloat(vendaRealizada.valorTotal))}
              </p>
            </div>

            <Button className="mt-6 w-full py-3 text-base font-bold" onClick={novaVenda}>
              Nova Venda
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Guardas ────────────────────────────────────────────────────────────────

  if (loadingTurno) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!turno || turno.status !== 'ABERTO') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <Lock className="h-10 w-10 text-muted-foreground" />
        <div>
          <p className="text-lg font-semibold text-foreground">Caixa não está aberto</p>
          <p className="mt-1 text-sm text-muted-foreground">Abra o caixa antes de registrar uma venda.</p>
        </div>
        <Link
          to="/financeiro/caixa"
          className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Ir para o Caixa
        </Link>
      </div>
    )
  }

  // ── PDV Principal ──────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col -mx-4 sm:-mx-6 -mt-2" style={{ minHeight: 'calc(100vh - 5rem)' }}>

      {/* ── BARRA DE BUSCA ── */}
      <div className="border-b border-border bg-card px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
        <div className="shrink-0">
          <h1 className="text-xl font-bold text-foreground leading-tight">Balcão de Vendas</h1>
          <p className="text-xs text-muted-foreground">Busque o produto e adicione ao caixa</p>
        </div>

        {/* Campo de busca com resultado dropdown */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
          <input
            autoFocus
            className="w-full rounded-xl border-2 border-primary/25 bg-background pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
            placeholder="Buscar produto por código ou descrição…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />

          {/* Dropdown de resultados */}
          {busca.trim().length > 0 && (
            <div className="absolute top-full mt-1.5 left-0 right-0 z-50 max-h-80 overflow-y-auto rounded-xl border border-border bg-card shadow-xl">
              {isFetching ? (
                <div className="p-3 space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
                  ))}
                </div>
              ) : !produtos?.length ? (
                <p className="px-4 py-4 text-sm text-muted-foreground text-center">
                  Nenhum produto encontrado para "{busca}".
                </p>
              ) : (
                produtos.map((produto) => (
                  <button
                    key={produto.id}
                    disabled={produto.tipo === 'MADEIRA' && !produto.dimensaoVigente}
                    onMouseDown={() => { abrirAddItem(produto); setBusca('') }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-primary/5 border-b border-border/50 last:border-b-0 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{produto.descricao}</p>
                      <p className="text-xs text-muted-foreground">
                        {produto.codigo}
                        {produto.tipo === 'MADEIRA' && produto.dimensaoVigente && (
                          <> · {(produto.dimensaoVigente.espessuraM * 1000).toFixed(0)}×{(produto.dimensaoVigente.larguraM * 1000).toFixed(0)}mm · {produto.dimensaoVigente.metrosLinearPorM3} m/m³</>
                        )}
                        {produto.tipo === 'MADEIRA' && !produto.dimensaoVigente && (
                          <span className="ml-1 text-warning"> · sem dimensões</span>
                        )}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                      + Add
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── CORPO PRINCIPAL: DUAS COLUNAS ── */}
      <div className="flex flex-1 flex-col lg:flex-row min-h-0">

        {/* ═══════════════════════════════════════════════════
            COLUNA ESQUERDA — ITENS DO CAIXA
        ═══════════════════════════════════════════════════ */}
        <div className="flex-[3] flex flex-col border-b lg:border-b-0 lg:border-r border-border min-w-0 min-h-0">

          {/* Cabeçalho da lista */}
          <div className="flex items-center gap-2 px-4 sm:px-6 py-3 border-b border-border bg-muted/20 shrink-0">
            <ShoppingCart className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-bold text-foreground">Itens do Caixa</span>
            {itens.length > 0 && (
              <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-black text-primary-foreground">
                {itens.length}
              </span>
            )}
            {/* Colunas — visível em telas médias+ */}
            <div className="ml-auto hidden md:flex items-center gap-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60 pr-9">
              <span className="w-32 text-right">Qtd / Vol</span>
              <span className="w-24 text-right">Preço/un</span>
              <span className="w-28 text-right">Subtotal</span>
            </div>
          </div>

          {/* Lista de itens */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-2">
            {itens.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-56 py-16 text-center select-none">
                <ShoppingCart className="h-16 w-16 text-muted-foreground/15 mb-4" />
                <p className="text-lg font-semibold text-muted-foreground/40">Caixa vazio</p>
                <p className="text-sm text-muted-foreground/30 mt-1">
                  Use a busca acima para adicionar produtos
                </p>
              </div>
            ) : (
              itens.map((item, i) => (
                <div
                  key={i}
                  className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 hover:border-primary/30 hover:shadow-sm transition-all"
                >
                  {/* Nº do item */}
                  <span className="hidden sm:flex shrink-0 h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-black text-muted-foreground">
                    {i + 1}
                  </span>

                  {/* Nome + detalhe */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate leading-tight">
                      {item.descricao}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.tipo === 'MADEIRA'
                        ? `${formatarMetros(item.metros)} m linear · ${formatarM3(item.volumeM3)} m³`
                        : `${item.qtd} ${item.unidadeSigla}`}
                    </p>
                  </div>

                  {/* Qtd (desktop) */}
                  <div className="hidden md:block shrink-0 w-32 text-right">
                    <p className="text-sm font-semibold text-foreground">
                      {item.tipo === 'MADEIRA'
                        ? `${formatarMetros(item.metros)} m`
                        : `${item.qtd} ${item.unidadeSigla}`}
                    </p>
                  </div>

                  {/* Preço unit (desktop) */}
                  <div className="hidden md:block shrink-0 w-24 text-right">
                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                      R$ {item.precoUnitario.toFixed(2)}
                      <span className="opacity-60">{item.tipo === 'MADEIRA' ? '/m' : '/un'}</span>
                    </p>
                  </div>

                  {/* Subtotal */}
                  <div className="shrink-0 w-28 text-right">
                    <p className="text-base font-black text-foreground tabular-nums">
                      {fmt(item.valorTotal)}
                    </p>
                  </div>

                  {/* Remover */}
                  <button
                    onClick={() => removerItem(i)}
                    title="Remover item"
                    className="shrink-0 rounded-lg p-1.5 text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-all group-hover:text-muted-foreground/60"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Rodapé: total parcial */}
          <div className="shrink-0 border-t border-border bg-muted/20 px-4 sm:px-6 py-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {itens.length === 0
                ? 'Nenhum item adicionado'
                : `${itens.length} ${itens.length === 1 ? 'item' : 'itens'}`}
            </span>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Total parcial</p>
              <p className={`text-2xl font-black tabular-nums leading-tight ${
                itens.length > 0 ? 'text-foreground' : 'text-muted-foreground/25'
              }`}>
                {fmt(totalGeral)}
              </p>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════
            COLUNA DIREITA — PAINEL DE FECHAMENTO
        ═══════════════════════════════════════════════════ */}
        <div className="w-full lg:w-72 xl:w-80 shrink-0 flex flex-col bg-card border-border lg:sticky lg:top-0 lg:self-start lg:max-h-screen lg:overflow-y-auto">

          {/* ── BLOCO 1: Cliente ── */}
          <div className="px-5 py-4 border-b border-border">
            <div className="flex items-center gap-1.5 mb-2.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Cliente
              </span>
            </div>
            <ClienteSelector valor={clienteSelecionado} onChange={setClienteSelecionado} />
          </div>

          {/* ── BLOCO 2: Forma de Pagamento ── */}
          <div className="px-5 py-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Pagamento
                </span>
              </div>
              <span className={`text-[11px] font-black rounded-full px-2.5 py-0.5 ${
                VISTA_SET.has(formaPagamento)
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              }`}>
                {VISTA_SET.has(formaPagamento) ? 'À Vista' : 'A Prazo'}
              </span>
            </div>

            {/* Grid de botões de pagamento */}
            <div className="grid grid-cols-3 gap-1.5">
              {FORMAS_PAGAMENTO.map((f) => (
                <button
                  key={f.value}
                  onClick={() => { setFormaPagamento(f.value); setDataVencimentoFiado(''); setNumeroParcelas(1) }}
                  className={`rounded-lg border py-2.5 text-xs font-bold transition-all ${
                    f.full ? 'col-span-3' : ''
                  } ${
                    formaPagamento === f.value
                      ? 'border-primary bg-primary text-primary-foreground shadow-sm scale-[0.98]'
                      : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-primary/5'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Parcelamento (CARTAO_CREDITO) */}
            {formaPagamento === 'CARTAO_CREDITO' && (
              <div className="mt-3 space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Parcelamento</p>
                <div className="grid grid-cols-4 gap-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => {
                    const valorParcela = totalGeral > 0 ? totalGeral / n : null
                    return (
                      <button
                        key={n}
                        onClick={() => setNumeroParcelas(n)}
                        className={`rounded-lg border py-1.5 text-xs font-bold transition-all ${
                          numeroParcelas === n
                            ? 'border-primary bg-primary text-primary-foreground scale-[0.97]'
                            : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-primary/5'
                        }`}
                      >
                        {n}×
                        {valorParcela != null && (
                          <span className={`block text-[9px] font-normal leading-tight ${numeroParcelas === n ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                            {valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Campo de vencimento (FIADO) */}
            {formaPagamento === 'FIADO' && (
              <div className="mt-3 space-y-2">
                {!clienteSelecionado && (
                  <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                    Venda fiado requer cliente selecionado.
                  </p>
                )}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    Vencimento <span className="opacity-60">(vazio = 30 dias)</span>
                  </label>
                  <input
                    type="date"
                    value={dataVencimentoFiado}
                    onChange={(e) => setDataVencimentoFiado(e.target.value)}
                    className="w-full rounded-lg border border-border bg-input text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── BLOCO 3: Total com destaque ── */}
          <div className="px-5 py-5 border-b border-border bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Total da Venda
            </p>
            <p className={`font-black tabular-nums leading-none transition-all duration-200 ${
              totalGeral > 0 ? 'text-[2.5rem] text-foreground' : 'text-3xl text-muted-foreground/25'
            }`}>
              {fmt(totalGeral)}
            </p>
            {itens.length > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                {itens.length} {itens.length === 1 ? 'item' : 'itens'}
                {' · '}
                {FORMAS_PAGAMENTO.find(f => f.value === formaPagamento)?.label}
                {formaPagamento === 'CARTAO_CREDITO' && numeroParcelas > 1 && ` ${numeroParcelas}×`}
                {' · '}
                <span className={VISTA_SET.has(formaPagamento) ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                  {VISTA_SET.has(formaPagamento) ? 'À Vista' : 'A Prazo'}
                </span>
              </p>
            )}
          </div>

          {/* Mensagem de erro */}
          {erroVenda && (
            <div className="mx-5 mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive">
              {erroVenda}
            </div>
          )}

          {/* ── BLOCO 4: Ações ── */}
          <div className="mt-auto px-5 py-5 space-y-2.5">
            <Button
              variant="outline"
              className="w-full text-sm font-semibold"
              onClick={salvarComoOrcamento}
              loading={isPendingOrc}
              disabled={itens.length === 0}
            >
              Salvar como Orçamento
            </Button>
            <Button
              className="w-full py-4 text-base font-black tracking-wide shadow-md"
              onClick={confirmarVenda}
              loading={isPending}
              disabled={itens.length === 0}
            >
              Confirmar Venda
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de adicionar item */}
      <AddItemModal
        produto={produtoSelecionado}
        onClose={fecharAddItem}
        onAdicionar={adicionarItem}
        tipoPessoa={tipoPessoa}
        tipoPagamento={tipoPagamento}
      />

      {/* Modal de resumo da venda */}
      <Modal
        open={confirmandoVenda}
        onClose={() => setConfirmandoVenda(false)}
        title="Resumo da Venda"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmandoVenda(false)} disabled={isPending}>
              Voltar
            </Button>
            <Button
              className="font-bold"
              onClick={executarVenda}
              loading={isPending}
            >
              Confirmar Venda
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Itens */}
          <div className="divide-y rounded-lg border border-border overflow-hidden">
            {itens.map((item, i) => (
              <div key={i} className="flex items-start justify-between gap-3 px-4 py-3 bg-card">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight truncate">
                    {item.descricao}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.tipo === 'MADEIRA'
                      ? `${formatarMetros(item.metros)} m · R$ ${item.precoUnitario.toFixed(2)}/m`
                      : `${item.qtd} ${item.unidadeSigla} · R$ ${item.precoUnitario.toFixed(2)}/un`}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold tabular-nums text-foreground">
                  {fmt(item.valorTotal)}
                </span>
              </div>
            ))}
          </div>

          {/* Detalhes do fechamento */}
          <div className="rounded-lg border border-border bg-muted/20 divide-y divide-border">
            {clienteSelecionado && (
              <div className="flex justify-between px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">Cliente</span>
                <span className="font-medium">{clienteSelecionado.nome}</span>
              </div>
            )}
            <div className="flex justify-between px-4 py-2.5 text-sm">
              <span className="text-muted-foreground">Pagamento</span>
              <span className="font-medium">
                {FORMAS_PAGAMENTO.find(f => f.value === formaPagamento)?.label}
                {formaPagamento === 'CARTAO_CREDITO' && numeroParcelas > 1 && (
                  <span className="ml-1 text-muted-foreground">
                    ({numeroParcelas}× de {fmt(totalGeral / numeroParcelas)})
                  </span>
                )}
              </span>
            </div>
            {formaPagamento === 'FIADO' && dataVencimentoFiado && (
              <div className="flex justify-between px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">Vencimento</span>
                <span className="font-medium">
                  {new Date(dataVencimentoFiado + 'T12:00:00').toLocaleDateString('pt-BR')}
                </span>
              </div>
            )}
            <div className="flex justify-between px-4 py-3 text-base font-black">
              <span>Total</span>
              <span className="text-primary">{fmt(totalGeral)}</span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
