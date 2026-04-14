import { api } from './client'

export interface NfListItemResponse {
  id: string
  vendaId: string | null
  vendaNumero: string | null
  numero: number
  serie: string
  statusSefaz: string
  ambiente: string
  chaveAcesso: string | null
  dataEmissao: string
  dataAutorizacao: string | null
  protocoloAutorizacao: string | null
  motivoRejeicao: string | null
}

export interface VendaPendenteNfResponse {
  vendaId: string
  vendaNumero: string
  clienteNome: string | null
  valorTotal: string
  formaPagamento: string | null
  createdAt: string
}

// ── DANFE ─────────────────────────────────────────────────────────────────────

export interface DanfeNfData {
  numero: string; serie: string; chaveAcesso: string | null
  protocoloAutorizacao: string | null; dataEmissao: string; dataAutorizacao: string | null
  naturezaOperacao: string; ambiente: string; tipoOperacao: string
}
export interface DanfeEmitente {
  cnpj: string; razaoSocial: string; nomeFantasia: string | null; ie: string | null
  logradouro: string; numero: string; bairro: string; cidade: string; uf: string; cep: string
}
export interface DanfeDestinatario {
  nome: string; cpfCnpj: string | null; ie: string | null
  logradouro: string | null; numero: string | null; bairro: string | null
  cidade: string | null; uf: string | null; cep: string | null
}
export interface DanfeItem {
  numeroItem: number; codigo: string; descricao: string; ncm: string
  cfop: string; unidade: string; quantidade: string; valorUnitario: string; valorTotal: string
}
export interface DanfeTotais {
  valorProdutos: string; valorDesconto: string; valorFrete: string; valorTotal: string
}
export interface DanfeResponse {
  nf: DanfeNfData; emitente: DanfeEmitente; destinatario: DanfeDestinatario | null
  itens: DanfeItem[]; totais: DanfeTotais
}

// ── XML Import ────────────────────────────────────────────────────────────────

export interface NfeXmlItemPreview {
  numeroItem: number; codigoFornecedor: string; descricao: string
  ncm: string; cfop: string; unidade: string
  quantidade: string; valorUnitario: string; valorTotal: string
  produtoIdSistema: string | null
}
export interface NfeXmlPreviewResponse {
  chaveAcesso: string | null; protocolo: string | null; dataEmissao: string
  emitenteCnpj: string; emitenteNome: string; valorTotal: string
  itens: NfeXmlItemPreview[]
}
export interface NfeXmlItemConfirmar {
  descricao: string; quantidade: string; valorUnitario: string
  produtoId: string; observacao?: string
}
export interface NfeXmlImportarResponse {
  itensImportados: number; erros: string[]
}

export const nfeApi = {
  listar: () =>
    api.get<NfListItemResponse[]>('/fiscal/nfe').then((r) => r.data),

  listarPendentes: () =>
    api.get<VendaPendenteNfResponse[]>('/fiscal/nfe/pendentes').then((r) => r.data),

  emitir: (vendaId: string) =>
    api.post<NfListItemResponse>('/fiscal/nfe/emitir', { vendaId }).then((r) => r.data),

  cancelar: (id: string, justificativa: string) =>
    api.post<NfListItemResponse>(`/fiscal/nfe/${id}/cancelar`, { justificativa }).then((r) => r.data),

  danfe: (id: string) =>
    api.get<DanfeResponse>(`/fiscal/nfe/${id}/danfe`).then((r) => r.data),

  previewXml: (file: File) =>
    file.arrayBuffer().then((buf) =>
      api.post<NfeXmlPreviewResponse>('/fiscal/nfe/xml/preview', buf, {
        headers: { 'Content-Type': 'application/xml' },
      }).then((r) => r.data)
    ),

  reprocessar: (id: string) =>
    api.post<NfListItemResponse>(`/fiscal/nfe/${id}/reprocessar`).then((r) => r.data),

  importarXml: (payload: {
    chaveAcesso: string | null
    emitenteCnpj: string
    emitenteNome: string
    fornecedorId?: string | null
    itens: NfeXmlItemConfirmar[]
  }) => api.post<NfeXmlImportarResponse>('/fiscal/nfe/xml/importar', payload).then((r) => r.data),
}
