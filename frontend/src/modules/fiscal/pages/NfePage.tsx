import React, { useEffect, useRef, useState } from 'react'
import { FileCheck, FileUp, Printer, RefreshCw, Send, XCircle } from 'lucide-react'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { useTemPermissao } from '@/shared/hooks/useTemPermissao'
import { Perms } from '@/shared/utils/permissions'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import { Modal } from '@/shared/components/ui/Modal'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/shared/components/ui/Table'
import {
  useCancelarNfe, useEmitirNfe, useImportarXml, useNfeLista,
  useNfePendentes, usePreviewXml, useReprocessarNfe,
} from '../hooks/useNfe'
import type { NfeXmlItemPreview } from '@/shared/api/nfe'
import { produtosApi } from '@/shared/api/produtos'
import type { ProdutoResponse } from '@/shared/api/produtos'
import { useFornecedores } from '@/modules/fornecedor/hooks/useFornecedores'
import type { FornecedorResponse } from '@/shared/api/fornecedores'

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

type BadgeVariant = 'default' | 'success' | 'destructive' | 'warning' | 'outline'

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  AUTORIZADA:   'success',
  AGUARDANDO:   'default',
  PENDENTE:     'warning',
  REJEITADA:    'destructive',
  DENEGADA:     'destructive',
  CANCELADA:    'outline',
  CONTINGENCIA: 'warning',
  INUTILIZADA:  'outline',
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

// ── Produto Selector ──────────────────────────────────────────────────────────

function ProdutoSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [query, setQuery]             = useState('')
  const [resultados, setResultados]   = useState<ProdutoResponse[]>([])
  const [aberto, setAberto]           = useState(false)
  const [selecionado, setSelecionado] = useState<ProdutoResponse | null>(null)
  const containerRef                  = useRef<HTMLDivElement>(null)

  // pesquisa com debounce
  useEffect(() => {
    if (!aberto || query.trim().length < 2) { setResultados([]); return }
    const t = setTimeout(() => {
      produtosApi.pesquisar(query).then(setResultados).catch(() => setResultados([]))
    }, 300)
    return () => clearTimeout(t)
  }, [query, aberto])

  // fechar ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // carregar nome quando já existe valor (ex: reabertura do modal)
  useEffect(() => {
    if (value && !selecionado) {
      produtosApi.buscar(value).then(setSelecionado).catch(() => {})
    }
    if (!value) setSelecionado(null)
  }, [value])

  function handleSelect(p: ProdutoResponse) {
    setSelecionado(p)
    setQuery('')
    setAberto(false)
    onChange(p.id)
  }

  function handleClear() {
    setSelecionado(null)
    setQuery('')
    setResultados([])
    onChange('')
  }

  if (selecionado) {
    return (
      <div className="flex items-center gap-1 rounded border border-primary/40 bg-primary/5 px-2 py-1">
        <span className="flex-1 truncate text-xs text-foreground">{selecionado.descricao}</span>
        <span className="shrink-0 text-xs text-muted-foreground">{selecionado.codigo}</span>
        <button
          type="button"
          onClick={handleClear}
          className="ml-1 shrink-0 text-sm leading-none text-muted-foreground hover:text-destructive"
          title="Remover seleção"
        >
          ×
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        placeholder="Buscar produto..."
        value={query}
        onChange={(e) => { setQuery(e.target.value); setAberto(true) }}
        onFocus={() => setAberto(true)}
        className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
      />
      {aberto && resultados.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-0.5 max-h-40 w-72 overflow-y-auto rounded border border-border bg-popover shadow-lg">
          {resultados.map((p) => (
            <button
              key={p.id}
              type="button"
              className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-muted/60"
              onMouseDown={() => handleSelect(p)}
            >
              <span className="shrink-0 font-mono text-muted-foreground">{p.codigo}</span>
              <span className="flex-1 truncate text-foreground">{p.descricao}</span>
              <span className="shrink-0 text-muted-foreground">{p.unidadeVendaSigla}</span>
            </button>
          ))}
        </div>
      )}
      {aberto && query.trim().length >= 2 && resultados.length === 0 && (
        <div className="absolute left-0 top-full z-50 mt-0.5 w-72 rounded border border-border bg-popover px-3 py-2 text-xs text-muted-foreground shadow-lg">
          Nenhum produto encontrado.
        </div>
      )}
    </div>
  )
}

// ── Fornecedor Selector ───────────────────────────────────────────────────────

function FornecedorSelect({
  value,
  onChange,
  cnpjHint,
}: {
  value: FornecedorResponse | null
  onChange: (f: FornecedorResponse | null) => void
  cnpjHint?: string  // CNPJ vindo do XML para auto-match
}) {
  const { data: fornecedores } = useFornecedores()
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-match por CNPJ ao carregar
  useEffect(() => {
    if (!cnpjHint || !fornecedores || value) return
    const cnpjLimpo = cnpjHint.replace(/\D/g, '')
    const match = fornecedores.find((f) => f.cnpjCpf.replace(/\D/g, '') === cnpjLimpo)
    if (match) onChange(match)
  }, [cnpjHint, fornecedores])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setAberto(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtrados = (fornecedores ?? [])
    .filter((f) => {
      const t = busca.toLowerCase().trim()
      if (!t) return true
      return (
        f.razaoSocial.toLowerCase().includes(t) ||
        (f.nomeFantasia ?? '').toLowerCase().includes(t) ||
        f.cnpjCpf.replace(/\D/g, '').includes(t.replace(/\D/g, ''))
      )
    })
    .slice(0, 20)

  if (value) {
    return (
      <div className="flex items-center gap-2 rounded border border-primary/40 bg-primary/5 px-2 py-1.5 text-sm">
        <span className="flex-1 truncate font-medium text-foreground">{value.razaoSocial}</span>
        <span className="shrink-0 font-mono text-xs text-muted-foreground">{value.cnpjCpf}</span>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="ml-1 text-muted-foreground hover:text-destructive text-sm leading-none"
          title="Remover vínculo"
        >
          ×
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        placeholder="Buscar por nome ou CNPJ…"
        value={busca}
        onChange={(e) => { setBusca(e.target.value); setAberto(true) }}
        onFocus={() => setAberto(true)}
        className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40"
      />
      {aberto && filtrados.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-0.5 w-full max-h-48 overflow-y-auto rounded border border-border bg-popover shadow-lg">
          {filtrados.map((f) => (
            <button
              key={f.id}
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/60 border-b border-border/50 last:border-b-0"
              onMouseDown={() => { onChange(f); setBusca(''); setAberto(false) }}
            >
              <span className="flex-1 truncate font-medium text-foreground">{f.razaoSocial}</span>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">{f.cnpjCpf}</span>
            </button>
          ))}
        </div>
      )}
      {aberto && busca.trim().length > 0 && filtrados.length === 0 && (
        <div className="absolute left-0 top-full z-50 mt-0.5 w-full rounded border border-border bg-popover px-3 py-2 text-sm text-muted-foreground shadow-lg">
          Nenhum fornecedor encontrado.
        </div>
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function NfePage() {
  const { data: nfs,      isLoading: loadingNfs  } = useNfeLista()
  const { data: pendentes, isLoading: loadingPend } = useNfePendentes()
  const emitir       = useEmitirNfe()
  const cancelar     = useCancelarNfe()
  const reprocessar  = useReprocessarNfe()

  const podeEmitir    = useTemPermissao(Perms.FIS_EMITIR_NF)
  const podeCancelarNf = useTemPermissao(Perms.VEN_CANCELAR_NF)
  const previewXml   = usePreviewXml()
  const importarXml  = useImportarXml()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [modalCancelar, setModalCancelar]   = useState<{ id: string; numero: number } | null>(null)
  const [justificativa, setJustificativa]   = useState('')
  const [erroCancelar, setErroCancelar]     = useState('')

  // XML import state
  const [modalXml, setModalXml]           = useState(false)
  const [xmlPreview, setXmlPreview]       = useState<ReturnType<typeof usePreviewXml>['data']>(undefined)
  const [xmlMeta, setXmlMeta]             = useState<{ chaveAcesso: string | null; emitenteCnpj: string; emitenteNome: string } | null>(null)
  const [fornecedorXml, setFornecedorXml] = useState<FornecedorResponse | null>(null)
  const [mapeamento, setMapeamento]       = useState<Record<number, string>>({})
  const [erroImport, setErroImport]       = useState<string[]>([])
  const [importOk, setImportOk]           = useState<number | null>(null)

  function handleArquivoXml(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setXmlPreview(undefined); setErroImport([]); setImportOk(null); setMapeamento({}); setFornecedorXml(null)
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
      { ...xmlMeta, fornecedorId: fornecedorXml?.id ?? null, itens },
      {
        onSuccess: (resp) => {
          setImportOk(resp.itensImportados)
          setErroImport(resp.erros)
        },
      },
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
        onSuccess: () => { setModalCancelar(null); setJustificativa(''); setErroCancelar('') },
        onError: (err: unknown) => {
          setErroCancelar((err as any)?.response?.data?.detalhes ?? 'Erro ao cancelar NF-e.')
        },
      },
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="NF-e"
        subtitle="Emissão e controle de notas fiscais eletrônicas"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setModalXml(true); setXmlPreview(undefined); setImportOk(null); setErroImport([]) }}
          >
            <FileUp className="h-3.5 w-3.5" />
            Importar XML
          </Button>
        }
      />

      <input ref={fileInputRef} type="file" accept=".xml" className="hidden" onChange={handleArquivoXml} />

      {/* ── Vendas aguardando emissão ── */}
      <Card>
        <CardContent className="p-5">
          <div className="mb-4">
            <p className="text-sm font-semibold text-foreground dark:text-[#e2e8f0]">
              Vendas aguardando emissão de NF-e
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Vendas confirmadas ainda sem nota fiscal eletrônica
            </p>
          </div>

          {loadingPend ? (
            <div className="animate-pulse space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-10 rounded bg-muted" />)}
            </div>
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
                      {podeEmitir && (
                        <Button
                          size="sm"
                          onClick={() => emitir.mutate(v.vendaId)}
                          loading={emitir.isPending}
                        >
                          <Send className="h-3 w-3" />
                          Emitir NF-e
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── NF-e emitidas ── */}
      <Card>
        <CardContent className="p-0">
          {loadingNfs ? (
            <div className="animate-pulse space-y-2 m-5">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-10 rounded bg-muted" />)}
            </div>
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
                      <Badge variant={STATUS_VARIANT[nf.statusSefaz] ?? 'outline'}>
                        {STATUS_LABEL[nf.statusSefaz] ?? nf.statusSefaz}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={nf.ambiente === 'PRODUCAO' ? 'success' : 'warning'}>
                        {nf.ambiente === 'PRODUCAO' ? 'Produção' : 'Homologação'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatarDataHora(nf.dataEmissao)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {nf.chaveAcesso
                        ? `${nf.chaveAcesso.slice(0, 8)}…${nf.chaveAcesso.slice(-4)}`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Reprocessar — só para NF em AGUARDANDO */}
                        {nf.statusSefaz === 'AGUARDANDO' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => reprocessar.mutate(nf.id)}
                            loading={reprocessar.isPending}
                            title="Consultar status na SEFAZ"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Reprocessar
                          </Button>
                        )}
                        {/* DANFE */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`/fiscal/nfe/${nf.id}/danfe`, '_blank')}
                        >
                          <Printer className="h-3.5 w-3.5" />
                          DANFE
                        </Button>
                        {/* Cancelar — só para AUTORIZADA e com permissão */}
                        {nf.statusSefaz === 'AUTORIZADA' && podeCancelarNf && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setModalCancelar({ id: nf.id, numero: nf.numero })}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Cancelar
                          </Button>
                        )}
                        {/* Motivo de rejeição — tooltip via title */}
                        {(nf.statusSefaz === 'REJEITADA' || nf.statusSefaz === 'DENEGADA') && nf.motivoRejeicao && (
                          <span
                            title={nf.motivoRejeicao}
                            className="cursor-help text-xs text-destructive underline decoration-dotted"
                          >
                            ver motivo
                          </span>
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

      {/* ── Modal importação XML ── */}
      {modalXml && (
        <Modal
          open={modalXml}
          title="Importar NF-e XML — Entrada de Estoque"
          onClose={() => setModalXml(false)}
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            {!xmlPreview && !previewXml.isPending && (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                  <FileUp className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Selecione o arquivo XML da NF-e de entrada (compra/fornecedor)
                </p>
                <Button onClick={() => fileInputRef.current?.click()}>
                  Selecionar XML
                </Button>
              </div>
            )}

            {previewXml.isPending && (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            )}

            {xmlPreview && importOk === null && (
              <>
                <div className="rounded-lg bg-muted/50 px-4 py-3 text-sm space-y-1 text-foreground dark:text-[#e2e8f0]">
                  <div>
                    <span className="text-muted-foreground">Emitente: </span>
                    <strong>{xmlPreview.emitenteNome}</strong> — {xmlPreview.emitenteCnpj}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Valor Total: </span>
                    <strong>R$ {parseFloat(xmlPreview.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                  </div>
                  {xmlPreview.chaveAcesso && (
                    <div className="font-mono text-xs text-muted-foreground">{xmlPreview.chaveAcesso}</div>
                  )}
                </div>

                {/* Fornecedor */}
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-foreground">
                    Fornecedor
                    <span className="ml-1 font-normal text-muted-foreground">
                      (vincula contas a pagar — opcional)
                    </span>
                  </label>
                  <FornecedorSelect
                    value={fornecedorXml}
                    onChange={setFornecedorXml}
                    cnpjHint={xmlMeta?.emitenteCnpj}
                  />
                  {!fornecedorXml && (
                    <p className="text-xs text-muted-foreground">
                      CNPJ do emitente: <span className="font-mono">{xmlMeta?.emitenteCnpj}</span>
                      {' '}— nenhum fornecedor correspondente encontrado automaticamente.
                    </p>
                  )}
                </div>

                <p className="text-xs font-medium text-muted-foreground">
                  Busque e vincule o produto do sistema para cada item da nota:
                </p>

                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/40">
                      <th className="border border-border px-2 py-1 text-left text-foreground">#</th>
                      <th className="border border-border px-2 py-1 text-left text-foreground">Descrição (fornecedor)</th>
                      <th className="border border-border px-2 py-1 text-right text-foreground">Qtd</th>
                      <th className="border border-border px-2 py-1 text-right text-foreground">Vl. Unit.</th>
                      <th className="border border-border px-2 py-1 text-foreground">Produto (sistema)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {xmlPreview.itens.map((item: NfeXmlItemPreview) => (
                      <tr key={item.numeroItem} className="border-b border-border/50">
                        <td className="border border-border px-2 py-1 text-center text-foreground">{item.numeroItem}</td>
                        <td className="border border-border px-2 py-1 text-foreground">{item.descricao}</td>
                        <td className="border border-border px-2 py-1 text-right tabular-nums text-foreground">{item.quantidade}</td>
                        <td className="border border-border px-2 py-1 text-right tabular-nums text-foreground">{item.valorUnitario}</td>
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
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive space-y-1">
                    {erroImport.map((e, i) => <div key={i}>{e}</div>)}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setXmlPreview(undefined); fileInputRef.current?.click() }}
                  >
                    Trocar XML
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleConfirmarImport}
                    loading={importarXml.isPending}
                  >
                    Confirmar e Atualizar Estoque
                  </Button>
                </div>
              </>
            )}

            {importOk !== null && (
              <div className="space-y-3 py-4">
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">
                  <strong>{importOk} item(s) importado(s)</strong> com sucesso. Estoque atualizado.
                </div>
                {erroImport.length > 0 && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive space-y-1">
                    <div className="font-medium">Itens com erro:</div>
                    {erroImport.map((e, i) => <div key={i}>{e}</div>)}
                  </div>
                )}
                <div className="flex justify-end">
                  <Button onClick={() => setModalXml(false)}>Fechar</Button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── Modal cancelamento ── */}
      {modalCancelar && (
        <Modal
          open={!!modalCancelar}
          title={`Cancelar NF ${modalCancelar.numero.toString().padStart(9, '0')}`}
          onClose={() => { setModalCancelar(null); setJustificativa(''); setErroCancelar('') }}
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => { setModalCancelar(null); setJustificativa(''); setErroCancelar('') }}
                disabled={cancelar.isPending}
              >
                Voltar
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelar}
                loading={cancelar.isPending}
              >
                Confirmar cancelamento
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Justificativa{' '}
                <span className="text-muted-foreground font-normal">(mínimo 15 caracteres)</span>
              </label>
              <textarea
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none dark:bg-[#0d1117] dark:border-[#243040]"
                rows={3}
                value={justificativa}
                onChange={(e) => { setJustificativa(e.target.value); setErroCancelar('') }}
                placeholder="Motivo do cancelamento..."
              />
              {erroCancelar && <p className="mt-1 text-xs text-destructive">{erroCancelar}</p>}
            </div>
            <p className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
              O cancelamento é irreversível e só é aceito pela SEFAZ dentro de 24 horas após a emissão.
            </p>
          </div>
        </Modal>
      )}
    </div>
  )
}
