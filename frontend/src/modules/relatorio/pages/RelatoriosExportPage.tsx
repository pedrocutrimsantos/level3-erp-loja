import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileDown, FileSpreadsheet, FileText } from 'lucide-react'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Button } from '@/shared/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/Card'
import { relatoriosApi } from '@/shared/api/relatorios'
import { exportarExcel, exportarPdf, type ColDef } from '@/shared/utils/exportUtils'

// ── Helpers ───────────────────────────────────────────────────────────────────

const FORMA_PAGAMENTO_LABEL: Record<string, string> = {
  DINHEIRO:      'Dinheiro',
  PIX:           'PIX',
  CARTAO_DEBITO: 'Cartão Débito',
  CARTAO_CREDITO:'Cartão Crédito',
  BOLETO:        'Boleto',
  CHEQUE:        'Cheque',
  FIADO:         'Fiado',
  '—':           '—',
}

function fmtFp(v: string) { return FORMA_PAGAMENTO_LABEL[v] ?? v }

function fmtBrl(v: string | null | undefined) {
  if (!v) return '—'
  return parseFloat(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function primeiroDiaMes() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function hoje() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── Skeleton de carregamento ──────────────────────────────────────────────────

function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-2">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-6 flex-1 rounded bg-gray-100" />
          ))}
        </div>
      ))}
    </div>
  )
}

// ── Botões de exportação ──────────────────────────────────────────────────────

function ExportButtons({
  onExcel,
  onPdf,
  disabled,
}: {
  onExcel: () => void
  onPdf: () => void
  disabled?: boolean
}) {
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onExcel}
        disabled={disabled}
        className="gap-1.5 border-green-300 text-green-700 hover:bg-green-50"
      >
        <FileSpreadsheet className="h-4 w-4" />
        Excel
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onPdf}
        disabled={disabled}
        className="gap-1.5 border-red-300 text-red-700 hover:bg-red-50"
      >
        <FileText className="h-4 w-4" />
        PDF
      </Button>
    </div>
  )
}

// ── Filtro de período ─────────────────────────────────────────────────────────

function PeriodoFilter({
  dataInicio,
  dataFim,
  onInicioChange,
  onFimChange,
}: {
  dataInicio: string
  dataFim: string
  onInicioChange: (v: string) => void
  onFimChange: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground whitespace-nowrap">De</label>
        <input
          type="date"
          value={dataInicio}
          onChange={(e) => onInicioChange(e.target.value)}
          className="rounded-md border border-border bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground whitespace-nowrap">Até</label>
        <input
          type="date"
          value={dataFim}
          onChange={(e) => onFimChange(e.target.value)}
          className="rounded-md border border-border bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>
    </div>
  )
}

// ── Seção: Vendas ─────────────────────────────────────────────────────────────

function SecaoVendas() {
  const [dataInicio, setDataInicio] = useState(primeiroDiaMes)
  const [dataFim, setDataFim] = useState(hoje)

  const { data, isLoading } = useQuery({
    queryKey: ['relatorio-vendas', dataInicio, dataFim],
    queryFn: () => relatoriosApi.vendas(dataInicio, dataFim),
    enabled: !!dataInicio && !!dataFim,
  })

  const colunas: ColDef[] = [
    { header: 'Nº Venda',    key: 'vendaNumero',      widthChars: 14 },
    { header: 'Data',        key: 'data',              widthChars: 12 },
    { header: 'Cliente',     key: 'clienteNome',       widthChars: 28 },
    { header: 'Pagamento',   key: 'formaPagamentoFmt', widthChars: 16 },
    { header: 'Produto',     key: 'produtoCodigo',     widthChars: 18 },
    { header: 'Descrição',   key: 'produtoDescricao',  widthChars: 36 },
    { header: 'Quantidade',  key: 'quantidade',        widthChars: 14 },
    { header: 'Preço Unit.', key: 'precoUnitario',     widthChars: 14 },
    { header: 'Total Item',  key: 'valorTotal',        widthChars: 14 },
  ]

  const linhas = (data?.linhas ?? []).map((l) => ({
    ...l,
    formaPagamentoFmt: fmtFp(l.formaPagamento),
  }))

  function nomeArquivo() { return `vendas_${dataInicio}_${dataFim}` }
  function subtitulo() { return `Período: ${dataInicio} a ${dataFim} · ${data?.totalVendas ?? 0} vendas · Total: ${fmtBrl(data?.totalFaturamento)}` }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Relatório de Vendas</CardTitle>
          <ExportButtons
            disabled={!data || linhas.length === 0}
            onExcel={() => exportarExcel(nomeArquivo(), 'Vendas', colunas, linhas, subtitulo())}
            onPdf={() => exportarPdf(nomeArquivo(), 'Relatório de Vendas', subtitulo(), colunas, linhas)}
          />
        </div>
        <PeriodoFilter
          dataInicio={dataInicio}
          dataFim={dataFim}
          onInicioChange={setDataInicio}
          onFimChange={setDataFim}
        />
      </CardHeader>
      <CardContent>
        {data && (
          <div className="mb-3 flex gap-6 text-sm">
            <span className="text-muted-foreground">
              <span className="font-semibold text-gray-900">{data.totalVendas}</span> vendas
            </span>
            <span className="text-muted-foreground">
              Faturamento: <span className="font-semibold text-gray-900">{fmtBrl(data.totalFaturamento)}</span>
            </span>
          </div>
        )}
        {isLoading ? (
          <TableSkeleton rows={6} cols={9} />
        ) : !data || linhas.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma venda encontrada no período.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {colunas.map((c) => (
                    <th key={c.key} className="px-2 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhas.map((l, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="px-2 py-1.5 font-mono">{l.vendaNumero}</td>
                    <td className="px-2 py-1.5">{l.data}</td>
                    <td className="px-2 py-1.5 max-w-[180px] truncate">{l.clienteNome}</td>
                    <td className="px-2 py-1.5">{l.formaPagamentoFmt}</td>
                    <td className="px-2 py-1.5 font-mono">{l.produtoCodigo}</td>
                    <td className="px-2 py-1.5 max-w-[200px] truncate">{l.produtoDescricao}</td>
                    <td className="px-2 py-1.5 text-right">{l.quantidade}</td>
                    <td className="px-2 py-1.5 text-right">{fmtBrl(l.precoUnitario)}</td>
                    <td className="px-2 py-1.5 text-right font-semibold">{fmtBrl(l.valorTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Seção: Estoque ────────────────────────────────────────────────────────────

function SecaoEstoque() {
  const { data, isLoading } = useQuery({
    queryKey: ['relatorio-estoque'],
    queryFn: () => relatoriosApi.estoque(),
    staleTime: 60_000,
  })

  const colunas: ColDef[] = [
    { header: 'Código',        key: 'codigo',           widthChars: 18 },
    { header: 'Descrição',     key: 'descricao',        widthChars: 40 },
    { header: 'Tipo',          key: 'tipo',             widthChars: 10 },
    { header: 'Unidade',       key: 'unidade',          widthChars: 10 },
    { header: 'Saldo m³',      key: 'saldoM3',          widthChars: 14 },
    { header: 'Saldo m Linear',key: 'saldoMetroLinear', widthChars: 16 },
    { header: 'Saldo Unid.',   key: 'saldoUnidade',     widthChars: 14 },
  ]

  const linhas = data?.linhas ?? []

  function nomeArquivo() { return `estoque_${hoje()}` }
  function subtitulo() {
    const partes = [`Gerado em: ${data?.geradoEm ?? hoje()}`, `${data?.totalProdutos ?? 0} produtos`]
    if (data?.totalM3Madeira) partes.push(`Total m³ madeira: ${parseFloat(data.totalM3Madeira).toFixed(4)} m³`)
    if (data?.totalMetrosLineares) partes.push(`Total m linear: ${parseFloat(data.totalMetrosLineares).toFixed(2)} m`)
    return partes.join(' · ')
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Relatório de Estoque</CardTitle>
          <ExportButtons
            disabled={!data || linhas.length === 0}
            onExcel={() => exportarExcel(nomeArquivo(), 'Estoque', colunas, linhas, subtitulo())}
            onPdf={() => exportarPdf(nomeArquivo(), 'Relatório de Estoque', subtitulo(), colunas, linhas)}
          />
        </div>
        {data && (
          <div className="flex flex-wrap gap-5 text-xs text-muted-foreground">
            <span>Snapshot: <span className="font-semibold text-gray-900">{data.geradoEm}</span></span>
            <span><span className="font-semibold text-gray-900">{data.totalProdutos}</span> produtos</span>
            {parseFloat(data.totalM3Madeira) > 0 && (
              <span>Madeira em estoque: <span className="font-semibold text-amber-700">{parseFloat(data.totalM3Madeira).toFixed(4)} m³</span></span>
            )}
            {parseFloat(data.totalMetrosLineares) > 0 && (
              <span>= <span className="font-semibold text-amber-700">{parseFloat(data.totalMetrosLineares).toFixed(2)} m linear</span></span>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <TableSkeleton rows={6} cols={7} />
        ) : !data || linhas.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum produto com saldo cadastrado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {colunas.map((c) => (
                    <th key={c.key} className="px-2 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhas.map((l, i) => (
                  <tr key={i} className={`border-b border-border/50 hover:bg-muted/20 ${l.tipo === 'MADEIRA' ? 'bg-amber-50/30' : ''}`}>
                    <td className="px-2 py-1.5 font-mono">{l.codigo}</td>
                    <td className="px-2 py-1.5 max-w-[220px] truncate">{l.descricao}</td>
                    <td className="px-2 py-1.5">
                      <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                        l.tipo === 'MADEIRA'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {l.tipo}
                      </span>
                    </td>
                    <td className="px-2 py-1.5">{l.unidade}</td>
                    <td className="px-2 py-1.5 text-right font-mono">{l.saldoM3 ? `${parseFloat(l.saldoM3).toFixed(4)} m³` : '—'}</td>
                    <td className="px-2 py-1.5 text-right font-mono">{l.saldoMetroLinear ? `${parseFloat(l.saldoMetroLinear).toFixed(2)} m` : '—'}</td>
                    <td className="px-2 py-1.5 text-right font-mono">{l.saldoUnidade ? `${parseFloat(l.saldoUnidade).toFixed(3)} ${l.unidade}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Seção: Fluxo de Caixa ─────────────────────────────────────────────────────

function SecaoFluxoCaixa() {
  const [dataInicio, setDataInicio] = useState(primeiroDiaMes)
  const [dataFim, setDataFim] = useState(hoje)

  const { data, isLoading } = useQuery({
    queryKey: ['relatorio-fluxo-caixa', dataInicio, dataFim],
    queryFn: () => relatoriosApi.fluxoCaixa(dataInicio, dataFim),
    enabled: !!dataInicio && !!dataFim,
  })

  const colunas: ColDef[] = [
    { header: 'Data',          key: 'data',              widthChars: 12 },
    { header: 'Forma Pag.',    key: 'formaPagamentoFmt', widthChars: 18 },
    { header: 'Qtd Vendas',    key: 'quantidade',        widthChars: 12 },
    { header: 'Total',         key: 'total',             widthChars: 16 },
  ]

  const linhas = (data?.linhas ?? []).map((l) => ({
    ...l,
    formaPagamentoFmt: fmtFp(l.formaPagamento),
  }))

  function nomeArquivo() { return `fluxo_caixa_${dataInicio}_${dataFim}` }
  function subtitulo() { return `Período: ${dataInicio} a ${dataFim} · Total entradas: ${fmtBrl(data?.totalEntradas)}` }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Fluxo de Caixa</CardTitle>
          <ExportButtons
            disabled={!data || linhas.length === 0}
            onExcel={() => exportarExcel(nomeArquivo(), 'Fluxo de Caixa', colunas, linhas, subtitulo())}
            onPdf={() => exportarPdf(nomeArquivo(), 'Fluxo de Caixa', subtitulo(), colunas, linhas)}
          />
        </div>
        <PeriodoFilter
          dataInicio={dataInicio}
          dataFim={dataFim}
          onInicioChange={setDataInicio}
          onFimChange={setDataFim}
        />
      </CardHeader>
      <CardContent>
        {data && (
          <div className="mb-3 text-sm text-muted-foreground">
            Total entradas: <span className="font-semibold text-gray-900">{fmtBrl(data.totalEntradas)}</span>
          </div>
        )}
        {isLoading ? (
          <TableSkeleton rows={6} cols={4} />
        ) : !data || linhas.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum lançamento encontrado no período.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {colunas.map((c) => (
                    <th key={c.key} className="px-2 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhas.map((l, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="px-2 py-1.5">{l.data}</td>
                    <td className="px-2 py-1.5">{l.formaPagamentoFmt}</td>
                    <td className="px-2 py-1.5 text-center">{l.quantidade}</td>
                    <td className="px-2 py-1.5 text-right font-semibold">{fmtBrl(l.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Seção: Margem Bruta ───────────────────────────────────────────────────────

function classeMargem(mb: string | null, semPreco: boolean, semCusto: boolean): string {
  if (semPreco || semCusto) return 'text-muted-foreground'
  if (mb === null) return ''
  const v = parseFloat(mb)
  if (v < 0)  return 'text-red-600 font-semibold'
  if (v < 10) return 'text-orange-500 font-semibold'
  if (v < 30) return 'text-yellow-600 font-semibold'
  return 'text-green-600 font-semibold'
}

function SecaoMargem() {
  const { data, isLoading } = useQuery({
    queryKey: ['relatorio-margem'],
    queryFn: () => relatoriosApi.margem(),
    staleTime: 60_000,
  })

  const colunas: ColDef[] = [
    { header: 'Código',      key: 'produtoCodigo',    widthChars: 18 },
    { header: 'Descrição',   key: 'produtoDescricao', widthChars: 36 },
    { header: 'Tipo',        key: 'tipo',             widthChars: 10 },
    { header: 'Preço Venda', key: 'precoVenda',       widthChars: 14 },
    { header: 'Custo Médio', key: 'custoMedio',       widthChars: 14 },
    { header: 'Margem %',    key: 'margemBruta',      widthChars: 12 },
    { header: 'Margem R$',   key: 'margemValor',      widthChars: 14 },
    { header: 'Saldo',       key: 'saldoDisponivel',  widthChars: 14 },
  ]

  const linhas = data?.linhas ?? []

  function nomeArquivo() { return `margem_${hoje()}` }
  function subtitulo() {
    const media = data?.margemMediaGeral ? `Margem média: ${data.margemMediaGeral}%` : ''
    return `Gerado em: ${data?.geradoEm ?? hoje()} · ${data?.totalProdutos ?? 0} produtos · ${media}`
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Relatório de Margem Bruta</CardTitle>
          <ExportButtons
            disabled={!data || linhas.length === 0}
            onExcel={() => exportarExcel(nomeArquivo(), 'Margem', colunas, linhas, subtitulo())}
            onPdf={() => exportarPdf(nomeArquivo(), 'Relatório de Margem Bruta', subtitulo(), colunas, linhas)}
          />
        </div>
        {data && (
          <div className="flex flex-wrap gap-5 text-sm text-muted-foreground">
            <span>
              <span className="font-semibold text-gray-900">{data.totalProdutos}</span> produtos
            </span>
            {data.margemMediaGeral && (
              <span>
                Margem média:{' '}
                <span className="font-semibold text-gray-900">{data.margemMediaGeral}%</span>
              </span>
            )}
            {data.produtosSemPreco > 0 && (
              <span className="text-orange-500">
                {data.produtosSemPreco} sem preço de venda
              </span>
            )}
            {data.produtosSemCusto > 0 && (
              <span className="text-yellow-600">
                {data.produtosSemCusto} sem custo médio
              </span>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <TableSkeleton rows={6} cols={8} />
        ) : !data || linhas.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum produto ativo encontrado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {colunas.map((c) => (
                    <th key={c.key} className="px-2 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhas.map((l, i) => (
                  <tr
                    key={i}
                    className={`border-b border-border/50 hover:bg-muted/20 ${
                      l.semPreco || l.semCusto ? 'opacity-60' : ''
                    }`}
                  >
                    <td className="px-2 py-1.5 font-mono">{l.produtoCodigo}</td>
                    <td className="px-2 py-1.5 max-w-[200px] truncate">{l.produtoDescricao}</td>
                    <td className="px-2 py-1.5">
                      <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                        l.tipo === 'MADEIRA'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {l.tipo === 'MADEIRA' ? 'Madeira' : 'Normal'}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {l.precoVenda ? fmtBrl(l.precoVenda) : <span className="text-orange-500">Sem preço</span>}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {l.custoMedio ? fmtBrl(l.custoMedio) : <span className="text-yellow-600">Sem custo</span>}
                    </td>
                    <td className={`px-2 py-1.5 text-right ${classeMargem(l.margemBruta, l.semPreco, l.semCusto)}`}>
                      {l.margemBruta != null ? `${l.margemBruta}%` : '—'}
                    </td>
                    <td className={`px-2 py-1.5 text-right ${classeMargem(l.margemBruta, l.semPreco, l.semCusto)}`}>
                      {l.margemValor ? fmtBrl(l.margemValor) : '—'}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono text-gray-600">
                      {l.saldoDisponivel
                        ? `${parseFloat(l.saldoDisponivel).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} ${l.tipo === 'MADEIRA' ? 'm' : 'un'}`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Seção: Vendas por Vendedor ────────────────────────────────────────────────

function SecaoVendasPorVendedor() {
  const [dataInicio, setDataInicio] = useState(primeiroDiaMes)
  const [dataFim, setDataFim] = useState(hoje)

  const { data, isLoading } = useQuery({
    queryKey: ['relatorio-vendas-por-vendedor', dataInicio, dataFim],
    queryFn: () => relatoriosApi.vendasPorVendedor(dataInicio, dataFim),
    enabled: !!dataInicio && !!dataFim,
  })

  const colunas: ColDef[] = [
    { header: 'Vendedor',     key: 'vendedorNome',        widthChars: 30 },
    { header: 'Qtd Vendas',  key: 'totalVendas',          widthChars: 12 },
    { header: 'Faturamento', key: 'totalFaturamento',     widthChars: 16 },
    { header: 'Ticket Médio', key: 'ticketMedio',         widthChars: 16 },
    { header: 'Volume m³',   key: 'totalM3',              widthChars: 14 },
    { header: 'Metro Linear', key: 'totalMetrosLineares', widthChars: 14 },
  ]

  const linhas = data?.linhas ?? []

  function nomeArquivo() { return `vendas_por_vendedor_${dataInicio}_${dataFim}` }
  function subtitulo() {
    return [
      `Período: ${dataInicio} a ${dataFim}`,
      data ? `${data.totalVendas} vendas` : '',
      data ? `Total: ${fmtBrl(data.totalFaturamento)}` : '',
    ].filter(Boolean).join(' · ')
  }

  // Participação percentual de cada vendedor
  const totalFat = parseFloat(data?.totalFaturamento ?? '0') || 1

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Vendas por Vendedor</CardTitle>
          <ExportButtons
            disabled={!data || linhas.length === 0}
            onExcel={() => exportarExcel(nomeArquivo(), 'Vendas por Vendedor', colunas, linhas, subtitulo())}
            onPdf={() => exportarPdf(nomeArquivo(), 'Vendas por Vendedor', subtitulo(), colunas, linhas)}
          />
        </div>
        <PeriodoFilter
          dataInicio={dataInicio}
          dataFim={dataFim}
          onInicioChange={setDataInicio}
          onFimChange={setDataFim}
        />
      </CardHeader>
      <CardContent>
        {data && linhas.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-6 text-sm">
            <span className="text-muted-foreground">
              <span className="font-semibold text-gray-900">{data.totalVendas}</span> vendas
            </span>
            <span className="text-muted-foreground">
              Total: <span className="font-semibold text-gray-900">{fmtBrl(data.totalFaturamento)}</span>
            </span>
            <span className="text-muted-foreground">
              <span className="font-semibold text-gray-900">{linhas.length}</span> vendedores
            </span>
          </div>
        )}
        {isLoading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : !data || linhas.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma venda encontrada no período.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-2 py-2 text-left font-semibold text-muted-foreground">Vendedor</th>
                  <th className="px-2 py-2 text-center font-semibold text-muted-foreground">Qtd Vendas</th>
                  <th className="px-2 py-2 text-right font-semibold text-muted-foreground">Faturamento</th>
                  <th className="px-2 py-2 text-right font-semibold text-muted-foreground">% Participação</th>
                  <th className="px-2 py-2 text-right font-semibold text-muted-foreground">Ticket Médio</th>
                  <th className="px-2 py-2 text-right font-semibold text-muted-foreground">Volume m³</th>
                  <th className="px-2 py-2 text-right font-semibold text-muted-foreground">Metro Linear</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l, i) => {
                  const participacao = ((parseFloat(l.totalFaturamento) / totalFat) * 100).toFixed(1)
                  const barWidth = Math.max(2, parseFloat(participacao))
                  return (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="px-2 py-2">
                        <div className="font-medium text-sm">{l.vendedorNome}</div>
                        <div className="mt-0.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary/60"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center">{l.totalVendas}</td>
                      <td className="px-2 py-2 text-right font-semibold">{fmtBrl(l.totalFaturamento)}</td>
                      <td className="px-2 py-2 text-right">
                        <span className={`font-medium ${parseFloat(participacao) >= 30 ? 'text-green-700' : 'text-gray-600'}`}>
                          {participacao}%
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right">{fmtBrl(l.ticketMedio)}</td>
                      <td className="px-2 py-2 text-right font-mono text-amber-700">
                        {parseFloat(l.totalM3) > 0 ? `${parseFloat(l.totalM3).toFixed(4)} m³` : '—'}
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-amber-700">
                        {parseFloat(l.totalMetrosLineares) > 0 ? `${parseFloat(l.totalMetrosLineares).toFixed(2)} m` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/60 font-semibold">
                  <td className="px-2 py-2 text-xs text-muted-foreground">Total</td>
                  <td className="px-2 py-2 text-center">{data.totalVendas}</td>
                  <td className="px-2 py-2 text-right">{fmtBrl(data.totalFaturamento)}</td>
                  <td className="px-2 py-2 text-right text-muted-foreground">100%</td>
                  <td />
                  <td />
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Seção: Volume m³ Vendido ──────────────────────────────────────────────────

function SecaoVolumeVendido() {
  const [dataInicio, setDataInicio] = useState(primeiroDiaMes)
  const [dataFim, setDataFim] = useState(hoje)

  const { data, isLoading } = useQuery({
    queryKey: ['relatorio-volume-vendido', dataInicio, dataFim],
    queryFn: () => relatoriosApi.volumeVendido(dataInicio, dataFim),
    enabled: !!dataInicio && !!dataFim,
  })

  const colunas: ColDef[] = [
    { header: 'Código',      key: 'produtoCodigo',       widthChars: 18 },
    { header: 'Descrição',   key: 'produtoDescricao',    widthChars: 40 },
    { header: 'Total m³',    key: 'totalM3',             widthChars: 14 },
    { header: 'Total m Lin.', key: 'totalMetrosLineares', widthChars: 16 },
    { header: 'Faturamento', key: 'totalFaturamento',    widthChars: 16 },
    { header: 'Qtd Vendas',  key: 'quantidadeVendas',    widthChars: 12 },
  ]

  const linhas = data?.linhas ?? []

  function nomeArquivo() { return `volume_vendido_${dataInicio}_${dataFim}` }
  function subtitulo() {
    return [
      `Período: ${dataInicio} a ${dataFim}`,
      data ? `Total m³: ${parseFloat(data.totalM3).toFixed(4)} m³` : '',
      data ? `Total m linear: ${parseFloat(data.totalMetrosLineares).toFixed(2)} m` : '',
      data ? `Faturamento: ${fmtBrl(data.totalFaturamento)}` : '',
    ].filter(Boolean).join(' · ')
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Volume de Madeira Vendido (m³)</CardTitle>
          <ExportButtons
            disabled={!data || linhas.length === 0}
            onExcel={() => exportarExcel(nomeArquivo(), 'Volume Vendido', colunas, linhas, subtitulo())}
            onPdf={() => exportarPdf(nomeArquivo(), 'Volume de Madeira Vendido', subtitulo(), colunas, linhas)}
          />
        </div>
        <PeriodoFilter
          dataInicio={dataInicio}
          dataFim={dataFim}
          onInicioChange={setDataInicio}
          onFimChange={setDataFim}
        />
      </CardHeader>
      <CardContent>
        {data && linhas.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-6 text-sm">
            <span className="text-muted-foreground">
              Volume total: <span className="font-semibold text-amber-700">{parseFloat(data.totalM3).toFixed(4)} m³</span>
            </span>
            <span className="text-muted-foreground">
              Metro linear: <span className="font-semibold text-amber-700">{parseFloat(data.totalMetrosLineares).toFixed(2)} m</span>
            </span>
            <span className="text-muted-foreground">
              Faturamento: <span className="font-semibold text-gray-900">{fmtBrl(data.totalFaturamento)}</span>
            </span>
          </div>
        )}
        {isLoading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : !data || linhas.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma venda de madeira encontrada no período.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {colunas.map((c) => (
                    <th key={c.key} className="px-2 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhas.map((l, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-amber-50/20">
                    <td className="px-2 py-1.5 font-mono">{l.produtoCodigo}</td>
                    <td className="px-2 py-1.5 max-w-[220px] truncate">{l.produtoDescricao}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-amber-700">
                      {parseFloat(l.totalM3).toFixed(4)} m³
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono text-amber-700">
                      {parseFloat(l.totalMetrosLineares).toFixed(2)} m
                    </td>
                    <td className="px-2 py-1.5 text-right font-semibold">{fmtBrl(l.totalFaturamento)}</td>
                    <td className="px-2 py-1.5 text-center">{l.quantidadeVendas}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/60 font-semibold">
                  <td colSpan={2} className="px-2 py-2 text-right text-xs text-muted-foreground">Total</td>
                  <td className="px-2 py-2 text-right font-mono text-amber-800">
                    {parseFloat(data.totalM3).toFixed(4)} m³
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-amber-800">
                    {parseFloat(data.totalMetrosLineares).toFixed(2)} m
                  </td>
                  <td className="px-2 py-2 text-right">{fmtBrl(data.totalFaturamento)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

type Aba = 'vendas' | 'estoque' | 'fluxo' | 'margem' | 'volume' | 'vendedores'

export default function RelatoriosExportPage() {
  const [aba, setAba] = useState<Aba>('vendas')

  const abas: { id: Aba; label: string }[] = [
    { id: 'vendas',     label: 'Vendas' },
    { id: 'estoque',    label: 'Estoque' },
    { id: 'fluxo',      label: 'Fluxo de Caixa' },
    { id: 'margem',     label: 'Margem Bruta' },
    { id: 'volume',     label: 'Volume m³' },
    { id: 'vendedores', label: 'Por Vendedor' },
  ]

  return (
    <div>
      <PageHeader
        title="Relatórios"
        subtitle="Visualize e exporte relatórios em Excel ou PDF"
        actions={
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <FileDown className="h-4 w-4" />
            <span>Excel · PDF</span>
          </div>
        }
      />

      {/* Abas */}
      <div className="mb-6 flex gap-1 border-b border-border overflow-x-auto">
        {abas.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              aba === a.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-gray-700'
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {aba === 'vendas'     && <SecaoVendas />}
      {aba === 'estoque'    && <SecaoEstoque />}
      {aba === 'fluxo'      && <SecaoFluxoCaixa />}
      {aba === 'margem'     && <SecaoMargem />}
      {aba === 'volume'     && <SecaoVolumeVendido />}
      {aba === 'vendedores' && <SecaoVendasPorVendedor />}
    </div>
  )
}
