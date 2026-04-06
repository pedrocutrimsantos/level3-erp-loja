import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { empresaApi, EmpresaRequest } from '@/shared/api/empresa'

export function useEmpresa() {
  return useQuery({
    queryKey: ['empresa'],
    queryFn: empresaApi.get,
    retry: false,
  })
}

export function useSalvarEmpresa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: EmpresaRequest) => empresaApi.salvar(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['empresa'] }),
  })
}
