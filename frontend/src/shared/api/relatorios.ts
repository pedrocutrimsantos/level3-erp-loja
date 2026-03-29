import { api } from './client'

export interface TitulosAberto {
  quantidade: number
  valorTotal: string
}

export interface VendasDia {
  data: string
  total: string
  quantidade: number
}

export interface TopProduto {
  produtoId: string
  produtoCodigo: string
  produtoDescricao: string
  totalM3: string | null
  totalValor: string
  quantidadeVendas: number
}

export interface EstoqueCriticoItem {
  produtoId: string
  produtoCodigo: string
  produtoDescricao: string
  saldoM3: string
  saldoMetroLinear: string | null
}

export interface DashboardResponse {
  faturamentoDia: string
  faturamentoMes: string
  quantidadeVendasDia: number
  quantidadeVendasMes: number
  titulosEmAberto: TitulosAberto
  contasAPagar: TitulosAberto
  vendasUltimos30Dias: VendasDia[]
  topProdutos: TopProduto[]
  estoqueCritico: EstoqueCriticoItem[]
}

// ── Relatório de Vendas ───────────────────────────────────────────────────────

export interface RelatorioVendaLinha {
  vendaNumero: string
  data: string
  clienteNome: string
  formaPagamento: string
  produtoCodigo: string
  produtoDescricao: string
  tipo: string
  quantidade: string
  precoUnitario: string
  valorTotal: string
}

export interface RelatorioVendasResponse {
  dataInicio: string
  dataFim: string
  totalVendas: number
  totalFaturamento: string
  linhas: RelatorioVendaLinha[]
}

// ── Relatório de Estoque ──────────────────────────────────────────────────────

export interface RelatorioEstoqueLinha {
  codigo: string
  descricao: string
  tipo: string
  unidade: string
  saldoM3: string | null
  saldoMetroLinear: string | null
  saldoUnidade: string | null
}

export interface RelatorioEstoqueResponse {
  geradoEm: string
  totalProdutos: number
  linhas: RelatorioEstoqueLinha[]
}

// ── Relatório de Fluxo de Caixa ───────────────────────────────────────────────

export interface RelatorioFluxoLinha {
  data: string
  formaPagamento: string
  quantidade: number
  total: string
}

export interface RelatorioFluxoCaixaResponse {
  dataInicio: string
  dataFim: string
  totalEntradas: string
  linhas: RelatorioFluxoLinha[]
}

// ── Relatório de Margem ───────────────────────────────────────────────────────

export interface RelatorioMargemLinha {
  produtoCodigo: string
  produtoDescricao: string
  tipo: string
  precoVenda: string | null
  custoMedio: string | null
  margemBruta: string | null    // percentual "38.50"
  margemValor: string | null    // R$ por unidade
  saldoDisponivel: string | null
  semPreco: boolean
  semCusto: boolean
}

export interface RelatorioMargemResponse {
  geradoEm: string
  totalProdutos: number
  produtosSemPreco: number
  produtosSemCusto: number
  margemMediaGeral: string | null
  linhas: RelatorioMargemLinha[]
}

export const relatoriosApi = {
  dashboard: () =>
    api.get<DashboardResponse>('/relatorios/dashboard').then((r) => r.data),

  vendas: (dataInicio: string, dataFim: string) =>
    api
      .get<RelatorioVendasResponse>('/relatorios/vendas', { params: { dataInicio, dataFim } })
      .then((r) => r.data),

  estoque: () =>
    api.get<RelatorioEstoqueResponse>('/relatorios/estoque').then((r) => r.data),

  fluxoCaixa: (dataInicio: string, dataFim: string) =>
    api
      .get<RelatorioFluxoCaixaResponse>('/relatorios/fluxo-caixa', { params: { dataInicio, dataFim } })
      .then((r) => r.data),

  margem: () =>
    api.get<RelatorioMargemResponse>('/relatorios/margem').then((r) => r.data),
}
