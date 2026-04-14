import { api } from './client'

/**
 * Baixa o arquivo EFD ICMS/IPI para o período informado.
 * Retorna o conteúdo em texto para ser salvo pelo browser.
 */
export async function downloadEfdIcmsIpi(ano: number, mes: number): Promise<void> {
  const response = await api.get('/fiscal/sped/efd', {
    params: { ano, mes },
    responseType: 'blob',
  })

  const blob     = new Blob([response.data], { type: 'text/plain;charset=iso-8859-1' })
  const url      = URL.createObjectURL(blob)
  const link     = document.createElement('a')
  const aamm     = `${ano}${String(mes).padStart(2, '0')}`
  link.href      = url
  link.download  = `EFD_ICMS_IPI_${aamm}.txt`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
