import { api } from './client'

export interface SaldoResponse {
  produtoId: string
  saldoM3: string                    // para MADEIRA
  saldoMetrosLineares: string | null // para MADEIRA com dimensão
  saldoUnidade: string | null        // para NORMAL (em unidade nativa)
  unidadeSigla: string | null        // sigla da unidade para NORMAL ("KG", "UN"…)
  custoMedioM3: string | null
  dataUltimaAtualizacao: string
}

export interface AjusteEstoqueRequest {
  produtoId: string
  quantidade: string   // valor na unidade nativa do produto
  sinal: 'ENTRADA' | 'SAIDA'
  observacao: string
}

export interface MovimentacaoResponse {
  id: string
  produtoId: string | null
  produtoCodigo: string | null
  produtoDescricao: string | null
  tipoMovimentacao: string
  quantidadeM3: string | null       // para MADEIRA
  quantidadeUnidade: string | null  // para NORMAL
  sinal: 'POSITIVO' | 'NEGATIVO'
  saldoAntesM3: string | null
  saldoDepoisM3: string | null
  dataHora: string
  observacao: string | null
}

export interface SubloteResponse {
  id: string
  loteId: string
  volumeM3Disponivel: string
  metrosLineares: string | null
  comprimentoM: string
  quantidadePecas: number
  tipo: 'NORMAL' | 'SOBRA' | 'SEGUNDA_QUALIDADE'
}

export const estoqueApi = {
  consultarSaldo: (produtoId: string) =>
    api.get<SaldoResponse>(`/estoque/saldo/${produtoId}`).then((r) => r.data),

  listarMovimentacoes: (produtoId: string, limit = 50) =>
    api
      .get<MovimentacaoResponse[]>(`/estoque/movimentacoes/${produtoId}`, { params: { limit } })
      .then((r) => r.data),

  listarSublotes: (produtoId: string) =>
    api.get<SubloteResponse[]>(`/estoque/sublotes/${produtoId}`).then((r) => r.data),

  listarMovimentacoesGeral: (params?: { produtoId?: string; tipo?: string; limit?: number }) =>
    api
      .get<MovimentacaoResponse[]>('/estoque/movimentacoes', { params })
      .then((r) => r.data),

  registrarAjuste: (req: AjusteEstoqueRequest) =>
    api.post<MovimentacaoResponse>('/estoque/ajuste', req).then((r) => r.data),
}
