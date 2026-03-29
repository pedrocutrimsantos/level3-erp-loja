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

export const nfeApi = {
  listar: () =>
    api.get<NfListItemResponse[]>('/fiscal/nfe').then((r) => r.data),

  listarPendentes: () =>
    api.get<VendaPendenteNfResponse[]>('/fiscal/nfe/pendentes').then((r) => r.data),

  emitir: (vendaId: string) =>
    api.post<NfListItemResponse>('/fiscal/nfe/emitir', { vendaId }).then((r) => r.data),

  cancelar: (id: string, justificativa: string) =>
    api.post<NfListItemResponse>(`/fiscal/nfe/${id}/cancelar`, { justificativa }).then((r) => r.data),
}
