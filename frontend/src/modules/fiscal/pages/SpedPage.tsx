import React, { useState } from 'react'
import { Download, FileText, Info } from 'lucide-react'
import { PageHeader } from '@/shared/components/layout/PageHeader'
import { Button } from '@/shared/components/ui/Button'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { downloadEfdIcmsIpi } from '@/shared/api/sped'

const ANO_ATUAL = new Date().getFullYear()
const MESES = [
  { v: 1,  l: 'Janeiro'   }, { v: 2,  l: 'Fevereiro' },
  { v: 3,  l: 'Março'     }, { v: 4,  l: 'Abril'     },
  { v: 5,  l: 'Maio'      }, { v: 6,  l: 'Junho'     },
  { v: 7,  l: 'Julho'     }, { v: 8,  l: 'Agosto'    },
  { v: 9,  l: 'Setembro'  }, { v: 10, l: 'Outubro'   },
  { v: 11, l: 'Novembro'  }, { v: 12, l: 'Dezembro'  },
]
const ANOS = Array.from({ length: 5 }, (_, i) => ANO_ATUAL - i)

const selectClass =
  'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-[#0d1117] dark:border-[#243040]'

export default function SpedPage() {
  const mesAtual = new Date().getMonth() + 1
  const [ano, setAno]       = useState(ANO_ATUAL)
  const [mes, setMes]       = useState(mesAtual === 1 ? 12 : mesAtual - 1)
  const [anoSel, setAnoSel] = useState(mesAtual === 1 ? ANO_ATUAL - 1 : ANO_ATUAL)
  const [loading, setLoading] = useState(false)
  const [erro, setErro]       = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)

  async function handleGerar() {
    setErro(null)
    setSucesso(false)
    setLoading(true)
    try {
      await downloadEfdIcmsIpi(anoSel, mes)
      setSucesso(true)
    } catch (e: any) {
      const msg = e?.response?.data?.detalhes ?? e?.response?.data?.erro ?? 'Erro ao gerar o arquivo.'
      setErro(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="SPED EFD ICMS/IPI"
        subtitle="Escrituração Fiscal Digital — geração do arquivo para entrega à SEFAZ"
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">

        {/* ── Formulário ── */}
        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Período de apuração
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                  Mês
                </label>
                <select
                  value={mes}
                  onChange={(e) => setMes(Number(e.target.value))}
                  className={selectClass}
                >
                  {MESES.map((m) => (
                    <option key={m.v} value={m.v}>{m.l}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                  Ano
                </label>
                <select
                  value={anoSel}
                  onChange={(e) => setAnoSel(Number(e.target.value))}
                  className={selectClass}
                >
                  {ANOS.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>

            {erro && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                {erro}
              </div>
            )}

            {sucesso && (
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                Arquivo gerado e salvo com sucesso.
              </div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <Button onClick={handleGerar} loading={loading} disabled={loading}>
                <Download className="h-4 w-4" />
                {loading ? 'Gerando…' : 'Gerar e Baixar EFD'}
              </Button>
              <span className="text-xs text-muted-foreground">
                {MESES.find((m) => m.v === mes)?.l} / {anoSel}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ── Instruções ── */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Info className="h-4 w-4 text-muted-foreground" />
              Sobre o arquivo
            </div>

            <div className="space-y-3 text-xs text-muted-foreground">
              <p>
                O arquivo gerado segue o leiaute <strong className="text-foreground">EFD ICMS/IPI versão 013</strong>,
                conforme Ato COTEPE/ICMS nº 44/2018 e atualizações.
              </p>

              <div className="space-y-1">
                <p className="font-medium text-foreground">Blocos incluídos:</p>
                <ul className="ml-3 space-y-0.5 list-disc">
                  <li><strong className="text-foreground">Bloco 0</strong> — Identificação, participantes, produtos e unidades</li>
                  <li><strong className="text-foreground">Bloco C</strong> — NF-e emitidas no período (saídas autorizadas e canceladas)</li>
                  <li><strong className="text-foreground">Bloco H</strong> — Inventário físico do estoque</li>
                  <li><strong className="text-foreground">Bloco 9</strong> — Encerramento e contagem de registros</li>
                </ul>
              </div>

              <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2 text-amber-700 dark:text-amber-300">
                <p className="font-medium mb-0.5">Antes de transmitir:</p>
                <p>Valide o arquivo no <span className="font-mono">PVA SPED</span> (Programa Validador e Assinador da Receita Federal) e confira os dados com seu contador.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
