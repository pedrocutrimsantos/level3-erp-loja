import React, { useRef, useState } from 'react'
import { FileCheck, FileUp, Printer, Send, XCircle } from 'lucide-react'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/shared/components/ui/Table'
import { Modal } from '@/shared/components/ui/Modal'
import {
  useCancelarNfe, useEmitirNfe, useImportarXml, useNfeLista, useNfePendentes, usePreviewXml,
} from '../hooks/useNfe'
import type { NfeXmlItemPreview } from '@/shared/api/nfe'

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  PENDENTE:     'Pendente',
  AGUARDANDO:   'Aguardando',
  AUTORIZADA:   'Autorizada',
  REJEITADA:    'Rejeitada',
  CANCELADA:    'Cancelada',
  DENEGADA:     'Denegada',
  CONTINGENCIA: 'Contingência',
  INUTILIZADA:  'Inutilizada',
}

const STATUS_COR: Record<string, string> = {
  AUTORIZADA:   'bg-green-100 text-green-800',
  PENDENTE:     'bg-yellow-100 text-yellow-800',
  AGUARDANDO:   'bg-blue-100 text-blue-800',
  REJEITADA:    'bg-red-100 text-red-800',
  CANCELADA:    'bg-gray-100 text-gray-600',
  DENEGADA:     'bg-red-200 text-red-900',
  CONTINGENCIA: 'bg-orange-100 text-orange-800',
  INUTILIZADA:  'bg-gray-100 text-gray-600',
}

const FORMA_LABEL: Record<string, string> = {
  DINHEIRO:       'Dinheiro',
  CARTAO_DEBITO:  'Débito',
  CARTAO_CREDITO: 'Crédito',
  PIX:            'PIX',
  BOLETO:         'Boleto',
  CHEQUE:         'Cheque',
  FIADO:          'Fiado',
}

function formatarReais(valor: string) {
  return parseFloat(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Componente principal ───────────────────────────────────────────────────────

// ── Produto Selector ──────────────────────────────────────────────────────────

function ProdutoSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      placeholder="UUID do produto no sistema"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded border border-border px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/40"
    />
  )
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function NfePage() {
  const { data: nfs, isLoading: loadingNfs } = useNfeLista()
  const { data: pendentes, isLoading: loadingPend } = useNfePendentes()
  const emitir    = useEmitirNfe()
  const cancelar  = useCancelarNfe()
  const previewXml   = usePreviewXml()
  const importarXml  = useImportarXml()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [modalCancelar, setModalCancelar] = useState<{ id: string; numero: number } | null>(null)
  const [justificativa, setJustificativa] = useState('')
  const [erroCancelar, setErroCancelar] = useState('')

  // XML import state
  const [modalXml, setModalXml]         = useState(false)
  const [xmlPreview, setXmlPreview]     = useState<ReturnType<typeof usePreviewXml>['data']>(undefined)
  const [xmlMeta, setXmlMeta]           = useState<{ chaveAcesso: string | null; emitenteCnpj: string; emitenteNome: string } | null>(null)
  const [mapeamento, setMapeamento]     = useState<Record<number, string>>({})
  const [erroImport, setErroImport]     = useState<string[]>([])
  const [importOk, setImportOk]         = useState<number | null>(null)

  function handleArquivoXml(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setXmlPreview(undefined); setErroImport([]); setImportOk(null); setMapeamento({})
    previewXml.mutate(file, {
      onSuccess: (data) => {
        setXmlPreview(data)
        setXmlMeta({ chaveAcesso: data.chaveAcesso, emitenteCnpj: data.emitenteCnpj, emitenteNome: data.emitenteNome })
      },
    })
  }

  function handleConfirmarImport() {
    if (!xmlPreview || !xmlMeta) return
    const itens = xmlPreview.itens
      .filter((item) => mapeamento[item.numeroItem])
      .map((item) => ({
        descricao:     item.descricao,
        quantidade:    item.quantidade,
        valorUnitario: item.valorUnitario,
        produtoId:     mapeamento[item.numeroItem],
      }))
    if (itens.length === 0) { setErroImport(['Mapeie pelo menos um item antes de importar.']); return }
    importarXml.mutate(
      { ...xmlMeta, itens },
      {
        onSuccess: (resp) => {
          setImportOk(resp.itensImportados)
          setErroImport(resp.erros)
        },
      }
    )
  }

  function handleCancelar() {
    if (!modalCancelar) return
    if (justificativa.trim().length < 15) {
      setErroCancelar('A justificativa deve ter pelo menos 15 caracteres.')
      return
    }
    cancelar.mutate(
      { id: modalCancelar.id, justificativa: justificativa.trim() },
      {
        onSuccess: () => {
          setModalCancelar(null)
          setJustificativa('')
          setErroCancelar('')
        },
        onError: (err: unknown) => {
          setErroCancelar(err instanceof Error ? err.message : 'Erro ao cancelar')
        },
      }
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <PageHeader title="NF-e" subtitle="Emissão e controle de notas fiscais eletrônicas" />
        <button
          onClick={() => { setModalXml(true); setXmlPreview(undefined); setImportOk(null); setErroImport([]) }}
          className="mt-1 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
        >
          <FileUp className="h-4 w-4" />
          Importar XML
        </button>
      </div>
      <input ref={fileInputRef} type="file" accept=".xml" className="hidden" onChange={handleArquivoXml} />

      {/* Vendas pendentes de NF */}
      <Card>
        <CardContent className="p-5">
          <p className="mb-4 text-sm font-semibold text-gray-700">
            Vendas aguardando emissão de NF-e
          </p>

          {loadingPend ? (
            <div className="animate-pulse h-32 rounded bg-gray-100" />
          ) : !pendentes || pendentes.length === 0 ? (
            <EmptyState
              icon={<FileCheck className="h-5 w-5" />}
              title="Nenhuma venda pendente"
              description="Todas as vendas confirmadas já possuem NF-e emitida."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Forma</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendentes.map((v) => (
                  <TableRow key={v.vendaId}>
                    <TableCell className="font-mono text-sm font-medium">{v.vendaNumero}</TableCell>
                    <TableCell className="text-sm">
                      {v.clienteNome ?? <span className="text-muted-foreground">Consumidor final</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {v.formaPagamento ? FORMA_LABEL[v.formaPagamento] ?? v.formaPagamento : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatarDataHora(v.createdAt)}
                    </TableCell>
                    <TableCell className="tabular-nums text-sm font-semibold text-right">
                      {formatarReais(v.valorTotal)}
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => emitir.mutate(v.vendaId)}
                        disabled={emitir.isPending}
                        className="inline-flex items-center gap-1.5 rounded-md bg-primary-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
                      >
                        <Send className="h-3 w-3" />
                        Emitir NF-e
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* NF-e emitidas */}
      <Card>
        <CardContent className="p-0">
          {loadingNfs ? (
            <div className="animate-pulse m-5 h-40 rounded bg-gray-100" />
          ) : !nfs || nfs.length === 0 ? (
            <EmptyState
              icon={<FileCheck className="h-5 w-5" />}
              title="Nenhuma NF-e emitida"
              description="As notas emitidas aparecerão aqui."
              className="py-16"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>NF-e</TableHead>
                  <TableHead>Venda</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ambiente</TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead>Chave</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {nfs.map((nf) => (
                  <TableRow key={nf.id}>
                    <TableCell className="font-mono text-sm font-medium">
                      {nf.numero.toString().padStart(9, '0')}/{nf.serie}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {nf.vendaNumero ?? '—'}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COR[nf.statusSefaz] ?? 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABEL[nf.statusSefaz] ?? nf.statusSefaz}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${nf.ambiente === 'PRODUCAO' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-700'}`}>
                        {nf.ambiente === 'PRODUCAO' ? 'Produção' : 'Homologação'}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatarDataHora(nf.dataEmissao)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {nf.chaveAcesso
                        ? `${nf.chaveAcesso.slice(0, 8)}...${nf.chaveAcesso.slice(-4)}`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => window.open(`/fiscal/nfe/${nf.id}/danfe`, '_blank')}
                          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
                        >
                          <Printer className="h-3 w-3" />
                          DANFE
                        </button>
                        {nf.statusSefaz === 'AUTORIZADA' && (
                          <button
                            onClick={() => setModalCancelar({ id: nf.id, numero: nf.numero })}
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <XCircle className="h-3 w-3" />
                            Cancelar
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal importação XML */}
      {modalXml && (
        <Modal
          open={modalXml}
          title="Importar NF-e XML — Entrada de Estoque"
          onClose={() => setModalXml(false)}
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            {!xmlPreview && !previewXml.isPending && (
              <div className="flex flex-col items-center gap-3 py-6">
                <FileUp className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground text-center">
                  Selecione o arquivo XML da NF-e de entrada (compra/fornecedor)
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                >
                  Selecionar XML
                </button>
              </div>
            )}

            {previewXml.isPending && (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            )}

            {xmlPreview && importOk === null && (
              <>
                <div className="rounded-lg bg-muted/50 px-4 py-3 text-sm space-y-1">
                  <div><span className="text-muted-foreground">Emitente:</span> <strong>{xmlPreview.emitenteNome}</strong> — {xmlPreview.emitenteCnpj}</div>
                  <div><span className="text-muted-foreground">Valor Total:</span> <strong>R$ {parseFloat(xmlPreview.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div>
                  {xmlPreview.chaveAcesso && <div className="font-mono text-xs text-muted-foreground">{xmlPreview.chaveAcesso}</div>}
                </div>

                <p className="text-xs font-medium text-muted-foreground">
                  Informe o ID do produto correspondente no sistema para cada item:
                </p>

                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/40">
                      <th className="border border-border px-2 py-1 text-left">#</th>
                      <th className="border border-border px-2 py-1 text-left">Descrição (fornecedor)</th>
                      <th className="border border-border px-2 py-1 text-right">Qtd</th>
                      <th className="border border-border px-2 py-1 text-right">Vl. Unit.</th>
                      <th className="border border-border px-2 py-1">Produto (ID sistema)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {xmlPreview.itens.map((item: NfeXmlItemPreview) => (
                      <tr key={item.numeroItem}>
                        <td className="border border-border px-2 py-1 text-center">{item.numeroItem}</td>
                        <td className="border border-border px-2 py-1">{item.descricao}</td>
                        <td className="border border-border px-2 py-1 text-right tabular-nums">{item.quantidade}</td>
                        <td className="border border-border px-2 py-1 text-right tabular-nums">{item.valorUnitario}</td>
                        <td className="border border-border px-1 py-0.5">
                          <ProdutoSelect
                            value={mapeamento[item.numeroItem] ?? ''}
                            onChange={(v) => setMapeamento((m) => ({ ...m, [item.numeroItem]: v }))}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {erroImport.length > 0 && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 space-y-1">
                    {erroImport.map((e, i) => <div key={i}>{e}</div>)}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => { setXmlPreview(undefined); fileInputRef.current?.click() }}
                    className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/50"
                  >
                    Trocar XML
                  </button>
                  <button
                    onClick={handleConfirmarImport}
                    disabled={importarXml.isPending}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {importarXml.isPending ? 'Importando...' : 'Confirmar e Atualizar Estoque'}
                  </button>
                </div>
              </>
            )}

            {importOk !== null && (
              <div className="space-y-3 py-4">
                <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
                  <strong>{importOk} item(s) importado(s)</strong> com sucesso. Estoque atualizado.
                </div>
                {erroImport.length > 0 && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 space-y-1">
                    <div className="font-medium">Itens com erro:</div>
                    {erroImport.map((e, i) => <div key={i}>{e}</div>)}
                  </div>
                )}
                <div className="flex justify-end">
                  <button
                    onClick={() => setModalXml(false)}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Modal cancelamento */}
      {modalCancelar && (
        <Modal
          open={!!modalCancelar}
          title={`Cancelar NF ${modalCancelar.numero.toString().padStart(9, '0')}`}
          onClose={() => { setModalCancelar(null); setJustificativa(''); setErroCancelar('') }}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Justificativa <span className="text-muted-foreground font-normal">(mínimo 15 caracteres)</span>
              </label>
              <textarea
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                rows={3}
                value={justificativa}
                onChange={(e) => { setJustificativa(e.target.value); setErroCancelar('') }}
                placeholder="Motivo do cancelamento..."
              />
              {erroCancelar && <p className="mt-1 text-xs text-red-600">{erroCancelar}</p>}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setModalCancelar(null); setJustificativa(''); setErroCancelar('') }}
                className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted/50 transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={handleCancelar}
                disabled={cancelar.isPending}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {cancelar.isPending ? 'Cancelando...' : 'Confirmar cancelamento'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
