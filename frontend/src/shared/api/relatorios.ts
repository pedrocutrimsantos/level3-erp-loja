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
  totalM3Madeira: string
  totalMetrosLineares: string
  linhas: RelatorioEstoqueLinha[]
}

// ── Relatório de Volume Vendido ───────────────────────────────────────────────

export interface VolumeVendidoLinha {
  produtoCodigo: string
  produtoDescricao: string
  totalM3: string
  totalMetrosLineares: string
  totalFaturamento: string
  quantidadeVendas: number
}

export interface VolumeVendidoResponse {
  dataInicio: string
  dataFim: string
  totalM3: string
  totalMetrosLineares: string
  totalFaturamento: string
  linhas: VolumeVendidoLinha[]
}

// ── Relatório de Vendas por Vendedor ─────────────────────────────────────────

export interface VendasPorVendedorLinha {
  vendedorNome: string
  totalVendas: number
  totalFaturamento: string
  ticketMedio: string
  totalM3: string
  totalMetrosLineares: string
}

export interface VendasPorVendedorResponse {
  dataInicio: string
  dataFim: string
  totalFaturamento: string
  totalVendas: number
  linhas: VendasPorVendedorLinha[]
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

// ── Relatório de Margem por Período ──────────────────────────────────────────

export interface MargemPeriodoDetalhe {
  vendaNumero: string
  data: string
  quantidade: string
  precoUnitario: string
  valorTotal: string
  custoEstimado: string | null
  lucroEstimado: string | null
}

export interface RelatorioMargemPeriodoLinha {
  produtoCodigo: string
  produtoDescricao: string
  tipo: string
  unidade: string
  quantidadeVendida: string
  receitaTotal: string
  custoTotal: string | null
  lucroBruto: string | null
  margemBruta: string | null
  ticketMedio: string
  quantidadeVendas: number
  semCusto: boolean
  detalhe: MargemPeriodoDetalhe[]
}

export interface RelatorioMargemPeriodoResponse {
  dataInicio: string
  dataFim: string
  geradoEm: string
  totalProdutos: number
  receitaTotalPeriodo: string
  custoTotalPeriodo: string
  lucroBrutoPeriodo: string
  margemMediaPonderada: string | null
  produtosSemCusto: number
  linhas: RelatorioMargemPeriodoLinha[]
}

// ── DRE ───────────────────────────────────────────────────────────────────────

export interface DreCategoriaDto {
  categoria: string
  valor: string
  percentualSobreReceita: string
}

export interface DreResponse {
  dataInicio: string
  dataFim: string
  geradoEm: string
  receitaBruta: string
  devolucoes: string
  receitaLiquida: string
  custoMercadorias: string
  cmvEstimado: boolean
  lucroBruto: string
  margemBruta: string
  despesas: DreCategoriaDto[]
  totalDespesas: string
  resultadoOperacional: string
  margemOperacional: string
  resultadoPositivo: boolean
  quantidadeVendas: number
  ticketMedio: string
  quantidadeDevolucoes: number
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

  dre: (dataInicio: string, dataFim: string) =>
    api
      .get<DreResponse>('/relatorios/dre', { params: { dataInicio, dataFim } })
      .then((r) => r.data),

  margemPeriodo: (dataInicio: string, dataFim: string) =>
    api
      .get<RelatorioMargemPeriodoResponse>('/relatorios/margem-periodo', { params: { dataInicio, dataFim } })
      .then((r) => r.data),

  volumeVendido: (dataInicio: string, dataFim: string) =>
    api
      .get<VolumeVendidoResponse>('/relatorios/volume-vendido', { params: { dataInicio, dataFim } })
      .then((r) => r.data),

  vendasPorVendedor: (dataInicio: string, dataFim: string) =>
    api
      .get<VendasPorVendedorResponse>('/relatorios/vendas-por-vendedor', { params: { dataInicio, dataFim } })
      .then((r) => r.data),
}
