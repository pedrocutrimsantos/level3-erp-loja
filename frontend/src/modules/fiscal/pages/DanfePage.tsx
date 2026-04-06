import { useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useDanfe } from '../hooks/useNfe'
import type { DanfeResponse } from '@/shared/api/nfe'

// ── Helpers ───────────────────────────────────────────────────────────────────

function brl(v: string) {
  return parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtCnpj(v: string | null | undefined) {
  if (!v) return ''
  const d = v.replace(/\D/g, '')
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  return v
}

function chaveFormatada(chave: string | null) {
  if (!chave) return '— aguardando autorização SEFAZ —'
  return chave.replace(/(.{4})/g, '$1 ').trim()
}

// ── Layout ────────────────────────────────────────────────────────────────────

function DanfeLayout({ d }: { d: DanfeResponse }) {
  const { nf, emitente, destinatario, itens, totais } = d

  const endEmit = [emitente.logradouro, emitente.numero, emitente.bairro, emitente.cidade, emitente.uf]
    .filter(Boolean).join(', ')

  const endDest = destinatario
    ? [destinatario.logradouro, destinatario.numero, destinatario.bairro, destinatario.cidade, destinatario.uf]
        .filter(Boolean).join(', ')
    : 'CONSUMIDOR FINAL'

  return (
    <div className="danfe-root">
      {/* ── Cabeçalho ── */}
      <table className="w-full border-collapse">
        <tbody>
          <tr>
            {/* Emitente */}
            <td className="danfe-cell" style={{ width: '50%' }} rowSpan={3}>
              <div className="font-bold text-[11px] uppercase">{emitente.razaoSocial}</div>
              {emitente.nomeFantasia && <div className="text-[10px]">{emitente.nomeFantasia}</div>}
              <div className="text-[9px] mt-1">{endEmit}</div>
              <div className="text-[9px]">CNPJ: {fmtCnpj(emitente.cnpj)}  &nbsp; IE: {emitente.ie ?? '—'}</div>
            </td>
            {/* Título DANFE */}
            <td className="danfe-cell text-center" style={{ width: '25%' }} rowSpan={3}>
              <div className="font-bold text-[13px] leading-tight">DANFE</div>
              <div className="text-[8px] leading-tight mt-1">
                Documento Auxiliar da<br />Nota Fiscal Eletrônica
              </div>
              <div className="text-[9px] mt-2">
                <span className="font-semibold">0 - ENTRADA</span><br />
                <span className="font-semibold">1 - SAÍDA</span>
              </div>
              <div className="mt-1 border border-black px-2 py-0.5 text-[13px] font-bold inline-block">
                {nf.tipoOperacao.includes('ENTRADA') ? '0' : '1'}
              </div>
            </td>
            {/* Número NF / Série */}
            <td className="danfe-cell text-center" style={{ width: '25%' }}>
              <div className="text-[8px] text-gray-500">Nº</div>
              <div className="font-bold text-[13px]">{nf.numero}</div>
              <div className="text-[8px] text-gray-500 mt-1">Série</div>
              <div className="font-bold text-[11px]">{nf.serie}</div>
            </td>
          </tr>
          <tr>
            <td className="danfe-cell text-center">
              <div className="text-[8px] text-gray-500">Data de Emissão</div>
              <div className="font-semibold text-[10px]">{nf.dataEmissao}</div>
            </td>
          </tr>
          <tr>
            <td className="danfe-cell text-center">
              <div className="text-[8px] text-gray-500">Data/Hora Saída</div>
              <div className="font-semibold text-[10px]">{nf.dataAutorizacao ?? '—'}</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Natureza da operação ── */}
      <table className="w-full border-collapse">
        <tbody>
          <tr>
            <td className="danfe-cell" style={{ width: '60%' }}>
              <div className="text-[8px] text-gray-500">Natureza da Operação</div>
              <div className="font-semibold text-[10px] uppercase">{nf.naturezaOperacao}</div>
            </td>
            <td className="danfe-cell" style={{ width: '40%' }}>
              <div className="text-[8px] text-gray-500">Protocolo de Autorização</div>
              <div className="font-semibold text-[10px]">{nf.protocoloAutorizacao ?? '— PENDENTE —'}</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Chave de acesso ── */}
      <table className="w-full border-collapse">
        <tbody>
          <tr>
            <td className="danfe-cell">
              <div className="text-[8px] text-gray-500">Chave de Acesso</div>
              <div className="font-mono text-[9px] tracking-wide mt-0.5">{chaveFormatada(nf.chaveAcesso)}</div>
              {nf.ambiente === 'HOMOLOGACAO' && (
                <div className="mt-1 text-center text-[9px] font-bold text-red-600 border border-red-400 rounded px-1">
                  HOMOLOGAÇÃO — SEM VALOR FISCAL
                </div>
              )}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Destinatário ── */}
      <table className="w-full border-collapse">
        <tbody>
          <tr>
            <td className="danfe-cell" colSpan={3}>
              <div className="text-[8px] text-gray-500 font-semibold uppercase">Destinatário / Remetente</div>
            </td>
          </tr>
          <tr>
            <td className="danfe-cell" style={{ width: '50%' }}>
              <div className="text-[8px] text-gray-500">Nome / Razão Social</div>
              <div className="font-semibold text-[10px]">{destinatario?.nome ?? 'CONSUMIDOR FINAL'}</div>
            </td>
            <td className="danfe-cell" style={{ width: '25%' }}>
              <div className="text-[8px] text-gray-500">CNPJ / CPF</div>
              <div className="font-semibold text-[10px]">{fmtCnpj(destinatario?.cpfCnpj) || '—'}</div>
            </td>
            <td className="danfe-cell" style={{ width: '25%' }}>
              <div className="text-[8px] text-gray-500">Inscrição Estadual</div>
              <div className="font-semibold text-[10px]">{destinatario?.ie ?? '—'}</div>
            </td>
          </tr>
          <tr>
            <td className="danfe-cell" colSpan={2}>
              <div className="text-[8px] text-gray-500">Endereço</div>
              <div className="text-[10px]">{endDest}</div>
            </td>
            <td className="danfe-cell">
              <div className="text-[8px] text-gray-500">CEP</div>
              <div className="text-[10px]">{destinatario?.cep ?? '—'}</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Produtos ── */}
      <table className="w-full border-collapse mt-px">
        <thead>
          <tr className="bg-gray-100">
            <th className="danfe-th" style={{ width: '4%' }}>#</th>
            <th className="danfe-th" style={{ width: '10%' }}>Código</th>
            <th className="danfe-th" style={{ width: '32%' }}>Descrição do Produto</th>
            <th className="danfe-th" style={{ width: '8%' }}>NCM</th>
            <th className="danfe-th" style={{ width: '6%' }}>CFOP</th>
            <th className="danfe-th" style={{ width: '5%' }}>UN</th>
            <th className="danfe-th" style={{ width: '9%' }}>Qtd</th>
            <th className="danfe-th" style={{ width: '13%' }}>Vl. Unit.</th>
            <th className="danfe-th" style={{ width: '13%' }}>Vl. Total</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item) => (
            <tr key={item.numeroItem} className="text-[9px]">
              <td className="danfe-td text-center">{item.numeroItem}</td>
              <td className="danfe-td font-mono">{item.codigo}</td>
              <td className="danfe-td">{item.descricao}</td>
              <td className="danfe-td text-center font-mono">{item.ncm}</td>
              <td className="danfe-td text-center">{item.cfop}</td>
              <td className="danfe-td text-center">{item.unidade}</td>
              <td className="danfe-td text-right tabular-nums">{parseFloat(item.quantidade).toFixed(3)}</td>
              <td className="danfe-td text-right tabular-nums">{brl(item.valorUnitario)}</td>
              <td className="danfe-td text-right tabular-nums font-semibold">{brl(item.valorTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Totais ── */}
      <table className="w-full border-collapse mt-px">
        <tbody>
          <tr>
            <td className="danfe-cell" style={{ width: '40%' }}>
              <div className="text-[8px] text-gray-500">Informações Adicionais</div>
              <div className="text-[9px] mt-1 text-gray-700">
                {nf.ambiente === 'HOMOLOGACAO'
                  ? 'NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGAÇÃO — SEM VALOR FISCAL'
                  : 'Obrigado pela preferência.'}
              </div>
            </td>
            <td className="danfe-cell text-right" style={{ width: '60%' }}>
              <table className="w-full text-[9px]">
                <tbody>
                  <tr>
                    <td className="text-gray-500 pr-4">Valor dos Produtos</td>
                    <td className="text-right font-semibold tabular-nums">R$ {brl(totais.valorProdutos)}</td>
                  </tr>
                  {parseFloat(totais.valorDesconto) > 0 && (
                    <tr>
                      <td className="text-gray-500 pr-4">(-) Desconto</td>
                      <td className="text-right tabular-nums text-red-600">R$ {brl(totais.valorDesconto)}</td>
                    </tr>
                  )}
                  {parseFloat(totais.valorFrete) > 0 && (
                    <tr>
                      <td className="text-gray-500 pr-4">(+) Frete</td>
                      <td className="text-right tabular-nums">R$ {brl(totais.valorFrete)}</td>
                    </tr>
                  )}
                  <tr className="border-t border-black">
                    <td className="font-bold pr-4 pt-1">VALOR TOTAL DA NF-e</td>
                    <td className="text-right font-bold text-[11px] tabular-nums pt-1">R$ {brl(totais.valorTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function DanfePage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, isError } = useDanfe(id ?? null)
  const didPrint = useRef(false)

  useEffect(() => {
    if (data && !didPrint.current) {
      didPrint.current = true
      setTimeout(() => window.print(), 400)
    }
  }, [data])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center print:hidden">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex h-screen items-center justify-center print:hidden text-red-600">
        NF-e não encontrada.
      </div>
    )
  }

  return (
    <>
      {/* Barra de ações — some na impressão */}
      <div className="print:hidden flex items-center gap-4 p-4 border-b bg-white sticky top-0 z-10">
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Imprimir / Salvar PDF
        </button>
        <button
          onClick={() => window.close()}
          className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted/50"
        >
          Fechar
        </button>
        <span className="text-sm text-muted-foreground">
          NF-e {data.nf.numero}/{data.nf.serie}
        </span>
      </div>

      {/* CSS de impressão embutido */}
      <style>{`
        .danfe-root { font-family: Arial, sans-serif; font-size: 10px; padding: 8px; }
        .danfe-cell { border: 1px solid #333; padding: 3px 5px; vertical-align: top; }
        .danfe-th   { border: 1px solid #333; padding: 3px 4px; font-size: 8px; text-align: center; }
        .danfe-td   { border: 1px solid #333; padding: 2px 4px; vertical-align: middle; }
        @media print {
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { margin: 0; }
          .print\\:hidden { display: none !important; }
          @page { size: A4 portrait; margin: 8mm; }
        }
      `}</style>

      {/* Conteúdo DANFE */}
      <div className="mx-auto max-w-[210mm] bg-white p-4">
        <DanfeLayout d={data} />
      </div>
    </>
  )
}
