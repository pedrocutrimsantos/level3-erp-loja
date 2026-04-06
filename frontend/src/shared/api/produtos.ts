import { api } from './client'

export interface DimensaoResponse {
  espessuraM: number    // espessura em metros (ex: 0.05)
  larguraM: number      // largura em metros (ex: 0.20)
  fatorConversao: string
  metrosLinearPorM3: string
}

export interface ProdutoResponse {
  id: string
  codigo: string
  descricao: string
  tipo: 'MADEIRA' | 'NORMAL'
  ncm: string
  unidadeVendaSigla: string   // "M", "KG", "UN", "L", etc.
  ativo: boolean
  dimensaoVigente?: DimensaoResponse
  controlarConversaoMadeira: boolean
  comprimentoPecaM?: number   // ex: 10.0 para tábuas de 10m — habilita modo "por peça"
  unidadeCompra?: string      // "m³" para MADEIRA
  unidadeEstoque?: string     // "metro linear (m)" para MADEIRA
  unidadeFiscal?: string      // "m³" para MADEIRA
  precoVenda?: string         // R$/m (MADEIRA) ou R$/unidade (NORMAL)
}

export interface UnidadeMedidaResponse {
  id: string
  codigo: string
  descricao: string
  tipo: string
  casasDecimais: number
}

export interface CriarProdutoRequest {
  codigo: string
  descricao: string
  tipo: string
  ncm: string
  unidadeVendaSigla?: string   // obrigatório para NORMAL; omitir para MADEIRA (usa "M")
  espessuraM?: number          // obrigatório para MADEIRA (em metros, ex: 0.05)
  larguraM?: number            // obrigatório para MADEIRA (em metros, ex: 0.20)
  controlarConversaoMadeira?: boolean
  comprimentoPecaM?: number    // ex: 10.0 para tábuas de 10m (null = sem modo peça)
  precoVenda?: number          // R$/m (MADEIRA) ou R$/unidade (NORMAL)
}

export interface AtualizarProdutoRequest {
  descricao: string
  ncm: string
  comprimentoPecaM?: number | null  // null = sem modo peça; >0 = atualizar comprimento
  precoVenda?: number | null        // null = não alterar; 0 = remover; >0 = atualizar
}

export interface PrecificacaoResponse {
  pfVista: string | null
  pfPrazo: string | null
  pjVista: string | null
  pjPrazo: string | null
}

export interface SalvarPrecificacaoRequest {
  pfVista?: number | null
  pfPrazo?: number | null
  pjVista?: number | null
  pjPrazo?: number | null
}

export const produtosApi = {
  listar: (apenasAtivos = true) =>
    api.get<ProdutoResponse[]>('/produtos', { params: { ativo: apenasAtivos } }).then((r) => r.data),

  pesquisar: (q: string, apenasAtivos = true) =>
    api.get<ProdutoResponse[]>('/produtos', { params: { ativo: apenasAtivos, q } }).then((r) => r.data),

  buscar: (id: string) =>
    api.get<ProdutoResponse>(`/produtos/${id}`).then((r) => r.data),

  listarUnidades: () =>
    api.get<UnidadeMedidaResponse[]>('/produtos/unidades').then((r) => r.data),

  criar: (req: CriarProdutoRequest) =>
    api.post<ProdutoResponse>('/produtos', req).then((r) => r.data),

  atualizar: (id: string, req: AtualizarProdutoRequest) =>
    api.put<ProdutoResponse>(`/produtos/${id}`, req).then((r) => r.data),

  inativar: (id: string) =>
    api.delete<ProdutoResponse>(`/produtos/${id}`).then((r) => r.data),

  atualizarDimensao: (id: string, req: { espessuraM: number; larguraM: number }) =>
    api.put<ProdutoResponse>(`/produtos/${id}/dimensao`, req).then((r) => r.data),

  buscarPrecificacao: (id: string) =>
    api.get<PrecificacaoResponse>(`/produtos/${id}/precificacao`).then((r) => r.data),

  salvarPrecificacao: (id: string, req: SalvarPrecificacaoRequest) =>
    api.put<PrecificacaoResponse>(`/produtos/${id}/precificacao`, req).then((r) => r.data),

  atualizarPreco: (id: string, preco: number | null) =>
    api.patch<ProdutoResponse>(`/produtos/${id}/preco`, { preco }).then((r) => r.data),
}
