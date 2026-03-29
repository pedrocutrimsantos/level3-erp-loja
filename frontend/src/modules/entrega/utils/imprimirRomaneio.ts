import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { EntregaResponse } from '@/shared/api/entregas'

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatarReais(v: string): string {
  return parseFloat(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function qtdLabel(item: EntregaResponse['itens'][number]): string {
  if (item.tipoProduto === 'MADEIRA') {
    const m = parseFloat(item.quantidadeMetroLinear ?? '0')
    return `${m.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} m`
  }
  const u = parseFloat(item.quantidadeUnidade ?? '0')
  return `${u.toLocaleString('pt-BR', { maximumFractionDigits: 4 })} ${item.unidadeSigla ?? 'un'}`
}

export function imprimirRomaneio(entrega: EntregaResponse, clienteNome?: string | null): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const marginLeft  = 15
  const marginRight = 195
  const pageWidth   = 210

  // ── Cabeçalho ──────────────────────────────────────────────────────────────
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('ROMANEIO DE ENTREGA', marginLeft, 20)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(entrega.numero, marginRight, 20, { align: 'right' })

  // Linha separadora
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
    // Wrap long values
    const maxWidth = pageWidth - marginLeft - 50
    const lines = doc.splitTextToSize(value, maxWidth)
    doc.text(lines, marginLeft + 28, y)
    y += 5.5 * lines.length
  }

  addRow('Venda', entrega.vendaNumero)
  addRow('Emissão', formatarData(entrega.createdAt))
  addRow('Cliente', clienteNome ?? 'Consumidor final')

  if (entrega.enderecoEntrega) {
    addRow('Endereço', entrega.enderecoEntrega)
  }
  if (entrega.observacao) {
    addRow('Observação', entrega.observacao)
  }

  y += 3

  // ── Tabela de itens ─────────────────────────────────────────────────────────
  const rows = entrega.itens.map((item) => [
    item.produtoDescricao,
    item.tipoProduto === 'MADEIRA' ? 'Madeira' : 'Normal',
    qtdLabel(item),
    formatarReais(item.valorTotalItem),
    item.statusEntrega === 'ENTREGUE' ? 'Entregue'
      : item.statusEntrega === 'DEVOLVIDO' ? 'Devolvido'
      : 'Pendente',
  ])

  autoTable(doc, {
    startY: y,
    head: [['Produto', 'Tipo', 'Quantidade', 'Valor', 'Status']],
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
      0: { cellWidth: 75 },
      1: { cellWidth: 22, halign: 'center' },
      2: { cellWidth: 32, halign: 'right' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 26, halign: 'center' },
    },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    didDrawPage: (_data) => {
      // rodapé de página com número
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

  // ── Rodapé de assinatura ────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable?.finalY ?? 200
  const assinaturaY = Math.min(finalY + 18, 255)

  doc.setDrawColor(180)
  doc.setLineWidth(0.3)

  // Total valor
  const totalValor = entrega.itens.reduce((acc, i) => acc + parseFloat(i.valorTotalItem), 0)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(
    `Total: ${totalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
    marginRight,
    assinaturaY - 4,
    { align: 'right' },
  )

  // Linha e campos de assinatura
  const lineY = assinaturaY + 12
  const col1 = marginLeft
  const col2 = marginLeft + 70
  const col3 = marginLeft + 130

  doc.line(col1, lineY, col1 + 55, lineY)
  doc.line(col2, lineY, col2 + 40, lineY)
  doc.line(col3, lineY, col3 + 50, lineY)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Recebido por', col1, lineY + 4)
  doc.text('Data', col2, lineY + 4)
  doc.text('Assinatura', col3, lineY + 4)

  doc.save(`${entrega.numero}.pdf`)
}
