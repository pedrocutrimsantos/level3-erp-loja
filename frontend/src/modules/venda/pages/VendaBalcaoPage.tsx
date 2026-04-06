import React, { useState, useMemo, useEffect } from 'react'
import { X, ShoppingCart, Lock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Modal } from '@/shared/components/ui/Modal'
import { Card, CardContent } from '@/shared/components/ui/Card'
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
import type { ProdutoResponse } from '@/shared/api/produtos'
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

// ── Sub-componente: Saldo do produto no modal de adicionar item ──────────────

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
  const saldoLinear =
    espessuraM && larguraM ? m3ParaLinear(saldoM3, espessuraM, larguraM) : null

  return (
    <p className="text-xs text-muted-foreground">
      Saldo: {formatarM3(saldoM3)} m³
      {saldoLinear != null && ` ≡ ${formatarMetros(saldoLinear)} m lineares`}
    </p>
  )
}

// ── Sub-componente: Modal de adicionar item ─────────────────────────────────

interface AddItemModalProps {
  produto: ProdutoResponse | null
  onClose: () => void
  onAdicionar: (item: ItemCarrinho) => void
  tipoPessoa: 'PF' | 'PJ' | 'ANONIMO'
  tipoPagamento: 'VISTA' | 'PRAZO'
}

type ModoVenda = 'metros' | 'pecas'

function AddItemModal({ produto, onClose, onAdicionar, tipoPessoa, tipoPagamento }: AddItemModalProps) {
  const [modo, setModo] = useState<ModoVenda>('metros')
  const [metros, setMetros] = useState('')
  const [pecas, setPecas] = useState('')
  const [qtd, setQtd] = useState('')
  const [preco, setPreco] = useState('')
  const [errors, setErrors] = useState<{ quantidade?: string; preco?: string }>({})

  const { data: precificacao } = usePrecificacao(produto?.id ?? '')

  // Ao trocar de produto, pré-preenche com precoVenda cadastrado (a precificação pode sobrescrever)
  useEffect(() => {
    setPreco(produto?.precoVenda ? parseFloat(produto.precoVenda).toFixed(2) : '')
    setMetros('')
    setPecas('')
    setQtd('')
    setErrors({})
    setModo('metros')
  }, [produto?.id])

  // Auto-preenche o preço quando a precificação é carregada ou quando PF/PJ ou Vista/Prazo mudam
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

  // Metros lineares efetivos (sempre calculados, independente do modo)
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

  let volumeM3Preview: number | null = null
  if (isMadeira && temDimensoes && metrosEfetivosValidos && espessuraM && larguraM) {
    try {
      volumeM3Preview = linearParaM3(metrosEfetivos!, espessuraM, larguraM)
    } catch {
      volumeM3Preview = null
    }
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
      if (!metrosEfetivosValidos) {
        erros.quantidade = 'Informe uma quantidade maior que zero.'
      }
      if (!temDimensoes) {
        erros.quantidade = 'Produto sem dimensões cadastradas. Cadastre dimensões antes de vender.'
      }
    } else {
      if (!qtd || !qtdValida) {
        erros.quantidade = 'Informe uma quantidade maior que zero.'
      }
    }

    if (!preco || !precoValido) {
      erros.preco = 'Informe um preço maior que zero.'
    }

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
        {/* Info do produto */}
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

        {/* Toggle modo de venda — só para madeira com comprimento de peça */}
        {temPeca && (
          <div className="flex gap-1 rounded-md border border-border bg-muted/30 p-1">
            <button
              type="button"
              onClick={() => handleModo('metros')}
              className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                modo === 'metros'
                  ? 'bg-card shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Vender por metros
            </button>
            <button
              type="button"
              onClick={() => handleModo('pecas')}
              className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                modo === 'pecas'
                  ? 'bg-card shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Vender por peças
            </button>
          </div>
        )}

        {/* Campo de quantidade */}
        {isMadeira ? (
          modo === 'pecas' ? (
            <div className="space-y-2">
              <Input
                label="Quantidade (peças) *"
                type="number"
                step="1"
                min="1"
                placeholder="0"
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
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={metros}
              onChange={(e) => setMetros(e.target.value)}
              error={errors.quantidade}
            />
          )
        ) : (
          <Input
            label={`Quantidade (${produto.unidadeVendaSigla ?? 'UN'}) *`}
            type="number"
            step="1"
            min="1"
            placeholder="0"
            value={qtd}
            onChange={(e) => setQtd(e.target.value)}
            error={errors.quantidade}
          />
        )}

        <div className="space-y-1">
          <Input
            label={isMadeira ? 'Preço por metro linear (R$) *' : `Preço por ${produto.unidadeVendaSigla ?? 'UN'} (R$) *`}
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            error={errors.preco}
          />
          {precificacao && (
            <p className="text-xs text-muted-foreground">
              Tabela: {tipoPessoa === 'PJ' ? 'PJ' : 'PF'} · {tipoPagamento === 'PRAZO' ? 'A Prazo' : 'À Vista'}
            </p>
          )}
        </div>

        {/* Preview MADEIRA */}
        {isMadeira && metrosEfetivosValidos && precoValido && volumeM3Preview != null && (
          <div className="rounded-md bg-warning/10 p-3 text-sm space-y-1">
            <p>
              Metragem:{' '}
              <span className="font-bold">{formatarMetros(metrosEfetivos!)} m lineares</span>
            </p>
            <p>
              Volume fiscal:{' '}
              <span className="font-bold">{formatarM3(volumeM3Preview)} m³</span>
            </p>
            <p>
              Subtotal:{' '}
              <span className="font-bold">R$ {subtotalPreview!.toFixed(2)}</span>
            </p>
          </div>
        )}

        {/* Preview NORMAL */}
        {!isMadeira && qtdValida && precoValido && subtotalPreview != null && (
          <div className="rounded-md bg-warning/10 p-3 text-sm">
            <p>Subtotal: <span className="font-bold">R$ {subtotalPreview.toFixed(2)}</span></p>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Sub-componente: Seletor de cliente ───────────────────────────────────────

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
      <div className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-sm">
        <span className="flex-1 font-medium text-primary truncate">{valor.nome}</span>
        {tipoBadge && (
          <span className="shrink-0 rounded bg-primary/20 px-1.5 py-0.5 text-xs font-semibold text-primary">
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
        className="w-full rounded-md border border-border bg-input text-foreground px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        placeholder="Consumidor final (opcional)..."
        value={busca}
        onChange={(e) => { setBusca(e.target.value); setAberto(true) }}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
      />
      {aberto && filtrados.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-card shadow-md">
          {filtrados.map((c) => (
            <button
              key={c.id}
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50"
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
  const [vendaRealizada, setVendaRealizada] = useState<VendaBalcaoResponse | null>(null)
  const [erroVenda, setErroVenda] = useState<string | null>(null)

  // VISTA = pagamento imediato; PRAZO = pagamento futuro
  const tipoPagamento: 'VISTA' | 'PRAZO' = useMemo(() => {
    return ['DINHEIRO', 'PIX', 'CARTAO_DEBITO', 'CARTAO_CREDITO'].includes(formaPagamento)
      ? 'VISTA'
      : 'PRAZO'
  }, [formaPagamento])

  const tipoPessoa = clienteSelecionado?.tipoPessoa ?? 'ANONIMO'

  const totalGeral = itens.reduce((acc, item) => acc + item.valorTotal, 0)

  function abrirAddItem(produto: ProdutoResponse) {
    setProdutoSelecionado(produto)
  }

  function fecharAddItem() {
    setProdutoSelecionado(null)
  }

  function adicionarItem(item: ItemCarrinho) {
    setItens((prev) => [...prev, item])
    fecharAddItem()
  }

  function removerItem(index: number) {
    setItens((prev) => prev.filter((_, i) => i !== index))
  }

  function confirmarVenda() {
    if (itens.length === 0) return
    if (formaPagamento === 'FIADO' && !clienteSelecionado) {
      setErroVenda('Selecione um cliente para realizar venda fiado.')
      return
    }
    setErroVenda(null)

    registrarVenda(montarReq(), {
      onSuccess: (data) => {
        setVendaRealizada(data)
        setItens([])
      },
      onError: (err: unknown) => {
        const msg =
          (err as any)?.response?.data?.detalhes ??
          (err as any)?.response?.data?.erro ??
          (err instanceof Error ? err.message : 'Erro ao registrar venda. Tente novamente.')
        setErroVenda(msg)
      },
    })
  }

  function montarReq() {
    return {
      clienteId: clienteSelecionado?.id,
      formaPagamento,
      dataVencimentoFiado: formaPagamento === 'FIADO' && dataVencimentoFiado ? dataVencimentoFiado : undefined,
      itens: itens.map((item) => {
        if (item.tipo === 'MADEIRA') {
          return {
            produtoId: item.produtoId,
            quantidadeMetroLinear: item.metros.toFixed(2),
            precoUnitario: item.precoUnitario.toFixed(2),
          }
        } else {
          return {
            produtoId: item.produtoId,
            quantidadeUnidade: item.qtd.toFixed(0),
            precoUnitario: item.precoUnitario.toFixed(2),
          }
        }
      }),
    }
  }

  function salvarComoOrcamento() {
    if (itens.length === 0) return
    setErroVenda(null)
    salvarOrcamento(montarReq(), {
      onSuccess: (data) => {
        setVendaRealizada(data)
        setItens([])
      },
      onError: (err: unknown) => {
        const msg =
          (err as any)?.response?.data?.detalhes ??
          (err as any)?.response?.data?.erro ??
          (err instanceof Error ? err.message : 'Erro ao salvar orçamento.')
        setErroVenda(msg)
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

  // ── Painel de venda realizada ──────────────────────────────────────────────

  if (vendaRealizada) {
    return (
      <div>
        <PageHeader title="Balcão de Vendas" subtitle="Venda registrada com sucesso" />
        <div className="max-w-2xl">
          <div className="rounded-lg border border-success/30 bg-success/10 p-6 text-center">
            <p className="text-lg font-bold text-success">Venda registrada!</p>
            <p className="text-sm text-success">Nº {vendaRealizada.numero}</p>
            <div className="mt-4 space-y-3 text-left">
              {vendaRealizada.itens.map((item) => (
                <div
                  key={item.produtoId}
                  className="rounded-md border border-success/20 bg-card p-3 text-sm"
                >
                  {item.tipoProduto === 'MADEIRA' ? (
                    <p className="font-medium">
                      {item.produtoDescricao}:{' '}
                      {item.quantidadeMetroLinear}m →{' '}
                      {item.volumeM3Calculado} m³
                    </p>
                  ) : (
                    <p className="font-medium">
                      {item.produtoDescricao}: {item.quantidadeUnidade} {item.unidadeSigla ?? 'UN'}
                    </p>
                  )}
                  {item.formula && (
                    <p className="text-xs text-muted-foreground font-mono mt-1 break-all">
                      {item.formula}
                    </p>
                  )}
                  {item.tipoProduto === 'MADEIRA' && item.novoSaldoM3 && (
                    <p className="text-xs text-green-600 mt-1">
                      Novo saldo: {item.novoSaldoM3} m³
                      {item.novoSaldoMetrosLineares &&
                        ` (${item.novoSaldoMetrosLineares} m lineares)`}
                    </p>
                  )}
                  {item.tipoProduto === 'NORMAL' && item.novoSaldoUnidade && (
                    <p className="text-xs text-green-600 mt-1">
                      Novo saldo: {item.novoSaldoUnidade} {item.unidadeSigla ?? 'UN'}
                    </p>
                  )}
                  <p className="text-sm font-semibold text-foreground mt-1">
                    R$ {parseFloat(item.valorTotalItem).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-success/30 pt-3">
              <p className="font-bold text-success">
                Total: R$ {parseFloat(vendaRealizada.valorTotal).toFixed(2)}
              </p>
            </div>
            <Button className="mt-4" onClick={novaVenda}>
              Nova Venda
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Guarda: caixa deve estar aberto ────────────────────────────────────────

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
          <p className="mt-1 text-sm text-muted-foreground">
            Abra o caixa antes de registrar uma venda.
          </p>
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

  // ── Layout principal (duas colunas) ─────────────────────────────────────────

  return (
    <div>
      <PageHeader title="Balcão de Vendas" subtitle="Registre vendas de produtos em estoque" />

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Coluna esquerda — produtos */}
        <div className="flex-[3] min-w-0">
          <div className="mb-4">
            <Input
              placeholder="Buscar produto por código ou descrição..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          {isFetching ? (
            <div className="animate-pulse space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-muted" />
              ))}
            </div>
          ) : busca.trim().length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              Digite acima para buscar produtos.
            </div>
          ) : produtos && produtos.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              Nenhum produto encontrado para "{busca}".
            </div>
          ) : (
            <div className="space-y-2">
              {(produtos ?? []).map((produto) => (
                <div
                  key={produto.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-foreground truncate">
                      {produto.descricao}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {produto.codigo} · {produto.tipo}
                    </p>
                    {produto.tipo === 'MADEIRA' && produto.dimensaoVigente && (
                      <p className="text-xs text-muted-foreground">
                        {(produto.dimensaoVigente.espessuraM * 1000).toFixed(0)}mm ×{' '}
                        {(produto.dimensaoVigente.larguraM * 1000).toFixed(0)}mm · 1 m³ ={' '}
                        {produto.dimensaoVigente.metrosLinearPorM3} m
                      </p>
                    )}
                    {produto.tipo === 'MADEIRA' && !produto.dimensaoVigente && (
                      <p className="text-xs text-warning">Sem dimensões cadastradas</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    className="ml-3 shrink-0"
                    onClick={() => abrirAddItem(produto)}
                    disabled={produto.tipo === 'MADEIRA' && !produto.dimensaoVigente}
                  >
                    + Adicionar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Coluna direita — carrinho */}
        <div className="flex-[2] min-w-0">
          <div className="lg:sticky lg:top-4 space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold text-foreground">Itens da Venda</h3>
                  {itens.length > 0 && (
                    <span className="ml-auto text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                      {itens.length}
                    </span>
                  )}
                </div>

                <div className="mb-3">
                  <p className="text-xs text-muted-foreground mb-1">Cliente</p>
                  <ClienteSelector valor={clienteSelecionado} onChange={setClienteSelecionado} />
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-muted-foreground">Forma de Pagamento</p>
                    <span className={`text-xs font-semibold rounded px-1.5 py-0.5 ${
                      tipoPagamento === 'VISTA'
                        ? 'bg-success/10 text-success'
                        : 'bg-warning/10 text-warning'
                    }`}>
                      {tipoPagamento === 'VISTA' ? 'À Vista' : 'A Prazo'}
                    </span>
                  </div>
                  <select
                    value={formaPagamento}
                    onChange={(e) => { setFormaPagamento(e.target.value); setDataVencimentoFiado('') }}
                    className="w-full rounded-md border border-border bg-input text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="DINHEIRO">Dinheiro</option>
                    <option value="PIX">PIX</option>
                    <option value="CARTAO_DEBITO">Cartão Débito</option>
                    <option value="CARTAO_CREDITO">Cartão Crédito</option>
                    <option value="BOLETO">Boleto</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="FIADO">Fiado</option>
                  </select>
                </div>

                {formaPagamento === 'FIADO' && (
                  <div className="mb-3 space-y-2">
                    {!clienteSelecionado && (
                      <p className="rounded-md bg-warning/10 border border-warning/30 px-3 py-2 text-xs text-warning">
                        Venda fiado requer um cliente selecionado.
                      </p>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Vencimento <span className="text-muted-foreground">(vazio = 30 dias)</span>
                      </p>
                      <input
                        type="date"
                        value={dataVencimentoFiado}
                        onChange={(e) => setDataVencimentoFiado(e.target.value)}
                        className="w-full rounded-md border border-border bg-input text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                  </div>
                )}

                {itens.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Nenhum item adicionado.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {itens.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-start justify-between rounded-lg border border-border p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">
                            {item.descricao}
                          </p>
                          {item.tipo === 'MADEIRA' ? (
                            <p className="text-xs text-muted-foreground">
                              {formatarMetros(item.metros)} m →{' '}
                              {formatarM3(item.volumeM3)} m³
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              {item.qtd} {item.unidadeSigla} × R$ {item.precoUnitario.toFixed(2)}
                            </p>
                          )}
                          <p className="text-sm font-semibold text-foreground">
                            R$ {item.valorTotal.toFixed(2)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-2 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removerItem(i)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    <div className="border-t border-border pt-3">
                      <div className="flex justify-between font-semibold text-foreground">
                        <span>Total</span>
                        <span>R$ {totalGeral.toFixed(2)}</span>
                      </div>
                    </div>

                    {erroVenda && (
                      <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
                        {erroVenda}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={salvarComoOrcamento}
                        loading={isPendingOrc}
                        disabled={itens.length === 0}
                      >
                        Salvar Orçamento
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={confirmarVenda}
                        loading={isPending}
                        disabled={itens.length === 0}
                      >
                        Confirmar Venda
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
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
    </div>
  )
}
