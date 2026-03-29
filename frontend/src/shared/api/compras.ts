import { api } from './client'

export interface EntradaCompraRequest {
  produtoId: string
  quantidade: string        // m³ para MADEIRA, unidade nativa para NORMAL
  custoUnitario?: string    // opcional
  observacao: string
  fornecedorId?: string     // UUID — se informado, gera contas a pagar
  dataVencimento?: string   // ISO date yyyy-MM-dd
  formaPagamentoPrevisto?: string  // ex: BOLETO, CHEQUE, DINHEIRO
}

export interface EntradaCompraResponse {
  quantidade: string
  unidadeSigla: string               // "M3" para MADEIRA, "KG"/"UN"/… para NORMAL
  metrosLineares: string | null      // apenas para MADEIRA
  novoSaldo: string                  // novo saldo na unidade principal
  novoSaldoMetrosLineares: string | null
  tipoMovimentacao: string
  tituloPagarNumero: string | null   // número do título gerado (se fornecedor informado)
}

export interface EntradaListItemResponse {
  id: string
  dataHora: string
  produtoId: string
  produtoCodigo: string
  produtoDescricao: string
  tipoProduto: 'MADEIRA' | 'NORMAL'
  quantidadeM3: string | null
  quantidadeUnidade: string | null
  unidadeSigla: string
  custoUnitario: string | null
  observacao: string | null
}

export const comprasApi = {
  registrarEntrada: (req: EntradaCompraRequest) =>
    api.post<EntradaCompraResponse>('/compras/entrada', req).then((r) => r.data),

  listarEntradas: (limit = 50) =>
    api.get<EntradaListItemResponse[]>('/compras/entradas', { params: { limit } }).then((r) => r.data),
}
