import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { VendaDetalheResponse } from '@/shared/api/vendas'

const FORMA_LABEL: Record<string, string> = {
  DINHEIRO:       'Dinheiro',
  CARTAO_DEBITO:  'Cartão Débito',
  CARTAO_CREDITO: 'Cartão Crédito',
  PIX:            'PIX',
  BOLETO:         'Boleto',
  CHEQUE:         'Cheque',
  FIADO:          'Fiado',
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatarReais(v: string): string {
  return parseFloat(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function qtdLabel(item: VendaDetalheResponse['itens'][number]): string {
  if (item.tipoProduto === 'MADEIRA') {
    const m = parseFloat(item.quantidadeMetroLinear ?? '0')
    return `${m.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} m`
  }
  const u = parseFloat(item.quantidadeUnidade ?? '0')
  return `${u.toLocaleString('pt-BR', { maximumFractionDigits: 4 })} ${item.unidadeSigla ?? 'un'}`
}

function precoLabel(item: VendaDetalheResponse['itens'][number]): string {
  const p = parseFloat(item.precoUnitario)
  const fmt = p.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  return item.tipoProduto === 'MADEIRA' ? `${fmt}/m` : `${fmt}/un`
}

export function imprimirRecibo(venda: VendaDetalheResponse): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const marginLeft  = 15
  const marginRight = 195
  const pageWidth   = 210

  // ── Cabeçalho ──────────────────────────────────────────────────────────────
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('COMPROVANTE DE VENDA', marginLeft, 20)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(venda.numero, marginRight, 20, { align: 'right' })

  doc.setDrawColor(180)
  doc.setLineWidth(0.4)
  doc.line(marginLeft, 24, marginRight, 24)

  // ── Bloco de informações ────────────────────────────────────────────────────
  let y = 31

  const addRow = (label: string, value: string) => {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(`${label}:`, marginLeft, y)
    doc.setFont('helvetica', 'normal')
    const maxWidth = pageWidth - marginLeft - 50
    const lines = doc.splitTextToSize(value, maxWidth)
    doc.text(lines, marginLeft + 32, y)
    y += 5.5 * lines.length
  }

  addRow('Data / Hora', formatarData(venda.createdAt))
  addRow('Cliente', venda.clienteNome ?? 'Consumidor final')
  if (venda.formaPagamento) {
    addRow('Forma de pagto.', FORMA_LABEL[venda.formaPagamento] ?? venda.formaPagamento)
  }
  if (venda.observacao) {
    addRow('Observação', venda.observacao)
  }

  y += 3

  // ── Tabela de itens ─────────────────────────────────────────────────────────
  const rows = venda.itens.map((item) => [
    item.produtoDescricao,
    qtdLabel(item),
    precoLabel(item),
    formatarReais(item.valorTotalItem),
  ])

  autoTable(doc, {
    startY: y,
    head: [['Produto', 'Quantidade', 'Preço unit.', 'Total item']],
    body: rows,
    margin: { left: marginLeft, right: 15 },
    headStyles: {
      fillColor: [40, 40, 40],
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold',
    },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 85 },
      1: { cellWidth: 32, halign: 'right' },
      2: { cellWidth: 32, halign: 'right' },
      3: { cellWidth: 31, halign: 'right' },
    },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    didDrawPage: () => {
      const pageCount = doc.getNumberOfPages()
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(150)
      doc.text(
        `Página ${doc.getCurrentPageInfo().pageNumber} de ${pageCount}`,
        pageWidth / 2,
        290,
        { align: 'center' },
      )
      doc.setTextColor(0)
    },
  })

  // ── Total ────────────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable?.finalY ?? 200
  const totalY = Math.min(finalY + 10, 268)

  doc.setDrawColor(180)
  doc.setLineWidth(0.3)
  doc.line(marginLeft, totalY - 2, marginRight, totalY - 2)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL', marginLeft, totalY + 5)
  doc.text(formatarReais(venda.valorTotal), marginRight, totalY + 5, { align: 'right' })

  // ── Assinatura ────────────────────────────────────────────────────────────────
  const assinaturaY = Math.min(totalY + 25, 278)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  doc.text('Obrigado pela preferência!', pageWidth / 2, assinaturaY, { align: 'center' })
  doc.setTextColor(0)

  doc.save(`${venda.numero}.pdf`)
}
