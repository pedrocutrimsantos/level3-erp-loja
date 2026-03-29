import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { turnoApi, type AbrirCaixaRequest, type FecharCaixaRequest, type RegistrarSangriaRequest } from '@/shared/api/turno'

export function useTurno(data?: string) {
  return useQuery({
    queryKey: ['turno', data ?? 'hoje'],
    queryFn: () => turnoApi.buscar(data),
    retry: false,
  })
}

export function useAbrirCaixa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (req: AbrirCaixaRequest) => turnoApi.abrir(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['turno'] }),
  })
}

export function useFecharCaixa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (req: FecharCaixaRequest) => turnoApi.fechar(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['turno'] }),
  })
}

export function useReabrirCaixa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => turnoApi.reabrir(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['turno'] }),
  })
}

export function useRegistrarSangria() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (req: RegistrarSangriaRequest) => turnoApi.sangria(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['turno'] }),
  })
}
