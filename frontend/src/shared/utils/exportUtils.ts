import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'

export interface ColDef {
  header: string
  key: string
  widthChars?: number  // Excel column width in characters
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

export function exportarExcel(
  nomeArquivo: string,
  titulo: string,
  colunas: ColDef[],
  linhas: Row[],
  rodape?: string,
) {
  const wb = XLSX.utils.book_new()

  const wsData: (string | number | null)[][] = [
    colunas.map((c) => c.header),
    ...linhas.map((l) => colunas.map((c) => l[c.key] ?? '')),
  ]

  if (rodape) {
    wsData.push([])
    wsData.push([rodape])
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData)
  ws['!cols'] = colunas.map((c) => ({ wch: c.widthChars ?? 16 }))

  XLSX.utils.book_append_sheet(wb, ws, titulo.slice(0, 31))
  XLSX.writeFile(wb, `${nomeArquivo}.xlsx`)
}

export function exportarPdf(
  nomeArquivo: string,
  titulo: string,
  subtitulo: string,
  colunas: ColDef[],
  linhas: Row[],
  rodape?: string,
) {
  const doc = new jsPDF({ orientation: 'landscape' })

  doc.setFontSize(16)
  doc.setTextColor(30, 60, 30)
  doc.text(titulo, 14, 16)

  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text(subtitulo, 14, 22)

  autoTable(doc, {
    startY: 27,
    head: [colunas.map((c) => c.header)],
    body: linhas.map((l) => colunas.map((c) => String(l[c.key] ?? ''))),
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [34, 85, 34], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 250, 245] },
    margin: { left: 14, right: 14 },
  })

  if (rodape) {
    const finalY = (doc as any).lastAutoTable?.finalY ?? 200
    doc.setFontSize(8)
    doc.setTextColor(100)
    doc.text(rodape, 14, finalY + 8)
  }

  doc.save(`${nomeArquivo}.pdf`)
}
