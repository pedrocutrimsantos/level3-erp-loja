/** Extrai mensagem de erro de respostas axios ou erros genéricos. */
export function erroMsg(err: unknown, fallback = 'Ocorreu um erro. Tente novamente.'): string {
  return (
    (err as any)?.response?.data?.detalhes ??
    (err as any)?.response?.data?.erro ??
    (err instanceof Error ? err.message : fallback)
  )
}
