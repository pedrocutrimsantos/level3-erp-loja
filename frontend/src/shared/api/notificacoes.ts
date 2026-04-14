import { api } from './client'

export interface NotificacaoItem {
  tipo: string
  severidade: 'CRITICA' | 'ALERTA' | 'INFO'
  titulo: string
  descricao: string
  quantidade: number
  valorTotal: string | null
  link: string
}

export interface NotificacoesResponse {
  total: number
  criticas: number
  itens: NotificacaoItem[]
}

export const notificacoesApi = {
  listar: () =>
    api.get<NotificacoesResponse>('/relatorios/notificacoes').then((r) => r.data),
}
