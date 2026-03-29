import React, { useState, useMemo } from 'react'
import { AlertTriangle } from 'lucide-react'
import {
  dimensoesValidas,
  calcularFator,
  formatarDimensao,
  m3ParaLinear,
  linearParaM3,
  formatarM3,
  formatarMetros,
} from '@/shared/utils/conversaoMadeira'
import { Input } from '@/shared/components/ui/Input'
import { cn } from '@/shared/utils/cn'

export interface ConversaoMadeiraWidgetProps {
  espessuraM?: number | null   // espessura em metros (ex: 0.05 = 5cm)
  larguraM?: number | null     // largura em metros (ex: 0.20 = 20cm)
  className?: string
}

type Direcao = 'm3-para-linear' | 'linear-para-m3'

export function ConversaoMadeiraWidget({
  espessuraM,
  larguraM,
  className,
}: ConversaoMadeiraWidgetProps) {
  const [direcao, setDirecao] = useState<Direcao>('m3-para-linear')
  const [valor, setValor] = useState<string>('')

  const dimensoesOk = dimensoesValidas(espessuraM, larguraM)

  const fator = useMemo(() => {
    if (!dimensoesOk) return null
    return calcularFator(espessuraM!, larguraM!)
  }, [espessuraM, larguraM, dimensoesOk])

  // 1 m³ = ? metros lineares (info estática)
  const linearPor1m3 = useMemo(() => {
    if (fator == null) return null
    return m3ParaLinear(1, espessuraM!, larguraM!)
  }, [fator, espessuraM, larguraM])

  const resultado = useMemo(() => {
    if (fator == null) return null
    const v = parseFloat(valor)
    if (isNaN(v) || v <= 0) return null

    if (direcao === 'm3-para-linear') {
      return {
        entrada: `${formatarM3(v)} m³`,
        saida: `${formatarMetros(m3ParaLinear(v, espessuraM!, larguraM!))} metros lineares`,
      }
    } else {
      return {
        entrada: `${formatarMetros(v)} metros lineares`,
        saida: `${formatarM3(linearParaM3(v, espessuraM!, larguraM!))} m³`,
      }
    }
  }, [valor, direcao, fator, espessuraM, larguraM])

  if (!dimensoesOk) {
    return (
      <div
        className={cn(
          'rounded-md border border-yellow-200 bg-yellow-50 p-4 flex items-start gap-3',
          className
        )}
      >
        <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-500 mt-0.5" />
        <p className="text-sm text-yellow-800">
          Produto sem dimensão cadastrada. Cadastre espessura e largura para habilitar a
          conversão m³ ↔ metro linear.
        </p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-md border border-primary-200 bg-accent p-4 flex flex-col gap-4',
        className
      )}
    >
      {/* Info estática — fator e equivalência */}
      <div>
        <p className="text-sm font-semibold text-primary">Conversão m³ ↔ Metro Linear</p>
        <p className="text-xs text-muted-foreground">
          {formatarDimensao(espessuraM!, larguraM!)} · fator {fator!.toFixed(8)} m²/m
        </p>
        {linearPor1m3 != null && (
          <p className="mt-1 text-xs font-medium text-primary">
            1 m³ = {formatarMetros(linearPor1m3)} metros lineares
          </p>
        )}
      </div>

      {/* Simulador bidirecional */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-1 rounded-md border border-border bg-white p-1">
          <button
            type="button"
            onClick={() => { setDirecao('m3-para-linear'); setValor('') }}
            className={cn(
              'flex-1 rounded px-2 py-1 text-xs font-medium transition-colors',
              direcao === 'm3-para-linear'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted/50'
            )}
          >
            m³ → metro linear
          </button>
          <button
            type="button"
            onClick={() => { setDirecao('linear-para-m3'); setValor('') }}
            className={cn(
              'flex-1 rounded px-2 py-1 text-xs font-medium transition-colors',
              direcao === 'linear-para-m3'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted/50'
            )}
          >
            metro linear → m³
          </button>
        </div>

        <Input
          label={direcao === 'm3-para-linear' ? 'Quantidade (m³)' : 'Quantidade (metros lineares)'}
          type="number"
          min={0.001}
          step={0.01}
          placeholder={direcao === 'm3-para-linear' ? 'Ex: 2,5' : 'Ex: 35,50'}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
        />

        {resultado ? (
          <div className="rounded-md border border-primary-100 bg-white p-3">
            <p className="text-sm font-medium text-primary">
              {resultado.entrada} = <span className="font-bold">{resultado.saida}</span>
            </p>
          </div>
        ) : (
          valor !== '' && (
            <p className="text-xs text-muted-foreground">
              Informe uma quantidade válida (maior que zero).
            </p>
          )
        )}
      </div>
    </div>
  )
}
