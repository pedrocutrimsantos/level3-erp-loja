import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { nfeApi, NfeXmlItemConfirmar } from '@/shared/api/nfe'

export function useNfeLista() {
  return useQuery({
    queryKey: ['nfe', 'lista'],
    queryFn: nfeApi.listar,
  })
}

export function useNfePendentes() {
  return useQuery({
    queryKey: ['nfe', 'pendentes'],
    queryFn: nfeApi.listarPendentes,
  })
}

export function useEmitirNfe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vendaId: string) => nfeApi.emitir(vendaId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nfe'] })
    },
  })
}

export function useCancelarNfe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, justificativa }: { id: string; justificativa: string }) =>
      nfeApi.cancelar(id, justificativa),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nfe'] })
    },
  })
}

export function useDanfe(id: string | null) {
  return useQuery({
    queryKey: ['nfe', 'danfe', id],
    queryFn: () => nfeApi.danfe(id!),
    enabled: !!id,
  })
}

export function usePreviewXml() {
  return useMutation({
    mutationFn: (file: File) => nfeApi.previewXml(file),
  })
}

export function useImportarXml() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      chaveAcesso: string | null
      emitenteCnpj: string
      emitenteNome: string
      itens: NfeXmlItemConfirmar[]
    }) => nfeApi.importarXml(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['estoque'] })
    },
  })
}
