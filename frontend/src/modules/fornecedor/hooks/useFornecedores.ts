import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fornecedoresApi, type CriarFornecedorRequest } from '@/shared/api/fornecedores'

export function useFornecedores(apenasAtivos = true) {
  return useQuery({
    queryKey: ['fornecedores', apenasAtivos],
    queryFn: () => fornecedoresApi.listar(apenasAtivos),
  })
}

export function useCriarFornecedor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (req: CriarFornecedorRequest) => fornecedoresApi.criar(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fornecedores'] }),
  })
}
