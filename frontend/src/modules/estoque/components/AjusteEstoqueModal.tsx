import React, { useState } from 'react'
import { Modal } from '@/shared/components/ui/Modal'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { formatarM3 } from '@/shared/utils/conversaoMadeira'
import { useSaldoEstoque, useRegistrarAjuste } from '../hooks/useEstoque'

export interface AjusteEstoqueModalProps {
  produtoId: string
  open: boolean
  onClose: () => void
}

type Sinal = 'ENTRADA' | 'SAIDA'

interface FormErrors {
  quantidade?: string
  observacao?: string
}

export function AjusteEstoqueModal({ produtoId, open, onClose }: AjusteEstoqueModalProps) {
  const { data: saldo } = useSaldoEstoque(produtoId)
  const { mutate: registrar, isPending } = useRegistrarAjuste()

  const [sinal, setSinal] = useState<Sinal>('ENTRADA')
  const [quantidade, setQuantidade] = useState('')
  const [observacao, setObservacao] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})

  // Determine if NORMAL or MADEIRA based on saldo response
  const isNormal = saldo?.unidadeSigla != null
  const unidade = isNormal ? (saldo?.unidadeSigla ?? 'UN') : 'm³'
  const saldoAtual = saldo
    ? isNormal
      ? (saldo.saldoUnidade != null ? parseFloat(saldo.saldoUnidade) : 0)
      : parseFloat(saldo.saldoM3)
    : null

  function formatarSaldo(valor: number): string {
    if (isNormal) {
      return valor.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 4 })
    }
    return `${formatarM3(valor)} m³`
  }

  function calcularPreview(): number | null {
    if (saldoAtual == null) return null
    const qtd = parseFloat(quantidade)
    if (isNaN(qtd) || qtd <= 0) return null
    if (sinal === 'ENTRADA') return saldoAtual + qtd
    return saldoAtual - qtd
  }

  function validar(): boolean {
    const erros: FormErrors = {}

    const qtd = parseFloat(quantidade)
    if (!quantidade || isNaN(qtd) || qtd <= 0) {
      erros.quantidade = 'Informe uma quantidade maior que zero.'
    } else if (!/^\d+(\.\d{1,4})?$/.test(quantidade)) {
      erros.quantidade = 'Use até 4 casas decimais.'
    }

    if (!observacao || observacao.trim().length < 10) {
      erros.observacao = 'A observação deve ter pelo menos 10 caracteres.'
    }

    setErrors(erros)
    return Object.keys(erros).length === 0
  }

  function handleConfirmar() {
    if (!validar()) return

    registrar(
      {
        produtoId,
        quantidade: parseFloat(quantidade).toFixed(4),
        sinal,
        observacao: observacao.trim(),
      },
      {
        onSuccess: () => {
          handleFechar()
        },
      }
    )
  }

  function handleFechar() {
    setSinal('ENTRADA')
    setQuantidade('')
    setObservacao('')
    setErrors({})
    onClose()
  }

  const preview = calcularPreview()

  return (
    <Modal
      open={open}
      onClose={handleFechar}
      title="Ajuste Manual de Estoque"
      footer={
        <>
          <Button variant="outline" onClick={handleFechar} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmar} loading={isPending}>
            Confirmar Ajuste
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Saldo atual */}
        {saldoAtual != null && (
          <div className="rounded-md bg-muted/40 px-4 py-3 text-sm text-gray-700">
            Saldo atual:{' '}
            <span className="font-semibold">{formatarSaldo(saldoAtual)}</span>
          </div>
        )}

        {/* Tipo de movimentação */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Tipo de movimentação
          </label>
          <div className="flex gap-3">
            {(['ENTRADA', 'SAIDA'] as Sinal[]).map((opcao) => (
              <label
                key={opcao}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <input
                  type="radio"
                  name="sinal"
                  value={opcao}
                  checked={sinal === opcao}
                  onChange={() => setSinal(opcao)}
                  className="h-4 w-4 text-primary focus:ring-primary border-border"
                />
                <span
                  className={
                    opcao === 'ENTRADA' ? 'text-green-700 font-medium' : 'text-red-700 font-medium'
                  }
                >
                  {opcao === 'ENTRADA' ? 'Entrada' : 'Saída'}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Quantidade */}
        <Input
          label={`Quantidade (${unidade})`}
          type="number"
          min="0.0001"
          step={isNormal ? '1' : '0.0001'}
          placeholder={isNormal ? '0' : '0.0000'}
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
          error={errors.quantidade}
        />

        {/* Preview do novo saldo */}
        {preview != null && (
          <div
            className={`rounded-md px-4 py-3 text-sm font-medium ${
              preview < 0
                ? 'bg-red-50 text-red-700'
                : 'bg-green-50 text-green-700'
            }`}
          >
            Novo saldo estimado:{' '}
            <span className="font-bold">{formatarSaldo(preview)}</span>
            {preview < 0 && (
              <span className="ml-2 text-xs font-normal">
                (saldo ficaria negativo)
              </span>
            )}
          </div>
        )}

        {/* Observação */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="ajuste-observacao"
            className="text-sm font-medium text-gray-700"
          >
            Observação <span className="text-muted-foreground">(mín. 10 caracteres)</span>
          </label>
          <textarea
            id="ajuste-observacao"
            rows={3}
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Descreva o motivo do ajuste..."
            className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none ${
              errors.observacao ? 'border-destructive focus:ring-destructive' : 'border-border'
            }`}
          />
          {errors.observacao && (
            <p className="text-xs text-destructive">{errors.observacao}</p>
          )}
        </div>
      </div>
    </Modal>
  )
}
