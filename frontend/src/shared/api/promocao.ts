import { api } from './client'

export interface PromocaoResponse {
  id: string
  nome: string
  descricao: string | null
  tipo: 'DESCONTO_PERCENTUAL' | 'DESCONTO_FIXO' | 'PRECO_FIXO'
  valor: number
  escopo: 'GLOBAL' | 'PRODUTO'
  ativo: boolean
  dataInicio: string | null
  dataFim: string | null
  quantidadeMinima: number | null
  valorMinimoPedido: number | null
  produtoIds: string[]
  vigente: boolean
  createdAt: string
}

export interface PromocaoRequest {
  nome: string
  descricao?: string
  tipo: string
  valor: number
  escopo: string
  dataInicio?: string
  dataFim?: string
  quantidadeMinima?: number
  valorMinimoPedido?: number
  produtoIds?: string[]
}

export interface ItemCalculoRequest {
  produtoId: string
  quantidade: number
  precoUnitario: number
}

export interface ItemCalculoResponse {
  produtoId: string
  precoOriginal: number
  precoFinal: number
  desconto: number
  percentualDesconto: number
  promocaoId: string | null
  promocaoNome: string | null
  temDesconto: boolean
}

export interface CalculoResponse {
  itens: ItemCalculoResponse[]
  valorOriginal: number
  descontoTotal: number
  valorFinal: number
}

export const promocaoApi = {
  listar: () =>
    api.get<PromocaoResponse[]>('/promocoes').then((r) => r.data),

  listarAtivas: () =>
    api.get<PromocaoResponse[]>('/promocoes/ativas').then((r) => r.data),

  porProduto: (produtoId: string) =>
    api.get<PromocaoResponse[]>(`/promocoes/produto/${produtoId}`).then((r) => r.data),

  buscar: (id: string) =>
    api.get<PromocaoResponse>(`/promocoes/${id}`).then((r) => r.data),

  criar: (req: PromocaoRequest) =>
    api.post<PromocaoResponse>('/promocoes', req).then((r) => r.data),

  atualizar: (id: string, req: PromocaoRequest) =>
    api.put<PromocaoResponse>(`/promocoes/${id}`, req).then((r) => r.data),

  desativar: (id: string) =>
    api.delete(`/promocoes/${id}`),

  calcular: (itens: ItemCalculoRequest[]) =>
    api.post<CalculoResponse>('/promocoes/calcular', { itens }).then((r) => r.data),
}
