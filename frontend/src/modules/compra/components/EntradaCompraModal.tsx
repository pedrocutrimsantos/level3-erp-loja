import React, { useState } from 'react'
import { Modal } from '@/shared/components/ui/Modal'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import {
  m3ParaLinear,
  linearParaM3,
  formatarM3,
  formatarMetros,
} from '@/shared/utils/conversaoMadeira'
import { useSaldoEstoque } from '@/modules/estoque/hooks/useEstoque'
import { useProduto } from '@/modules/produto/hooks/useProdutos'
import { useFornecedores } from '@/modules/fornecedor/hooks/useFornecedores'
import { useRegistrarEntrada } from '../hooks/useCompra'
import type { EntradaCompraResponse } from '@/shared/api/compras'

export interface EntradaCompraModalProps {
  produtoId: string
  open: boolean
  onClose: () => void
}

interface FormErrors {
  quantidade?: string
  observacao?: string
}

type ModoEntrada = 'm3' | 'pecas'

export function EntradaCompraModal({ produtoId, open, onClose }: EntradaCompraModalProps) {
  const { data: saldo } = useSaldoEstoque(produtoId)
  const { data: produto } = useProduto(produtoId)
  const { mutate: registrar, isPending, reset } = useRegistrarEntrada()

  const { data: fornecedores } = useFornecedores()

  const [modo, setModo] = useState<ModoEntrada>('m3')
  const [quantidade, setQuantidade] = useState('')
  const [custoUnitario, setCustoUnitario] = useState('')
  const [observacao, setObservacao] = useState('')
  const [fornecedorId, setFornecedorId] = useState('')
  const [dataVencimento, setDataVencimento] = useState('')
  const [formaPagamentoPrevisto, setFormaPagamentoPrevisto] = useState('BOLETO')
  const [errors, setErrors] = useState<FormErrors>({})
  const [resultado, setResultado] = useState<EntradaCompraResponse | null>(null)

  const isMadeira = produto?.tipo === 'MADEIRA'
  const espessuraM = produto?.dimensaoVigente?.espessuraM ?? null
  const larguraM = produto?.dimensaoVigente?.larguraM ?? null
  const comprimentoPecaM = produto?.comprimentoPecaM ?? null
  const temPeca = isMadeira && comprimentoPecaM != null && comprimentoPecaM > 0

  // Unidade exibida no label
  const unidade = isMadeira ? (modo === 'pecas' ? 'peças' : 'm³') : (produto?.unidadeVendaSigla ?? 'UN')

  // Saldo atual
  const saldoAtualM3 = saldo ? parseFloat(saldo.saldoM3) : null
  const saldoAtualUnidade = saldo?.saldoUnidade != null ? parseFloat(saldo.saldoUnidade) : null
  const saldoAtualLinear =
    isMadeira && saldoAtualM3 != null && espessuraM && larguraM
      ? m3ParaLinear(saldoAtualM3, espessuraM, larguraM)
      : null

  // Conversões de preview
  const qtdNum = parseFloat(quantidade)
  const qtdValida = !isNaN(qtdNum) && qtdNum > 0

  // Quando modo = 'pecas': converte peças → metros lineares → m³
  const entradaM3: number | null = (() => {
    if (!isMadeira || !qtdValida) return null
    if (modo === 'm3') return qtdNum
    if (modo === 'pecas' && comprimentoPecaM && espessuraM && larguraM) {
      const metros = qtdNum * comprimentoPecaM
      return linearParaM3(metros, espessuraM, larguraM)
    }
    return null
  })()

  const entradaLinear: number | null =
    entradaM3 != null && espessuraM && larguraM
      ? m3ParaLinear(entradaM3, espessuraM, larguraM)
      : null

  const entradaPecas: number | null =
    modo === 'm3' && temPeca && entradaLinear != null && comprimentoPecaM
      ? entradaLinear / comprimentoPecaM
      : null

  const novoSaldoM3 = isMadeira && saldoAtualM3 != null && entradaM3 != null
    ? saldoAtualM3 + entradaM3
    : null

  const novoSaldoLinear =
    novoSaldoM3 != null && espessuraM && larguraM
      ? m3ParaLinear(novoSaldoM3, espessuraM, larguraM)
      : null

  const novoSaldoUnidade =
    !isMadeira && saldoAtualUnidade != null && qtdValida ? saldoAtualUnidade + qtdNum : null

  function validar(): boolean {
    const erros: FormErrors = {}

    if (!quantidade || isNaN(qtdNum) || qtdNum <= 0) {
      erros.quantidade = 'Informe uma quantidade maior que zero.'
    } else if (modo === 'm3' && !/^\d+(\.\d{1,4})?$/.test(quantidade)) {
      erros.quantidade = 'Use até 4 casas decimais para m³.'
    } else if (modo === 'pecas' && !Number.isInteger(qtdNum) && qtdNum % 1 !== 0) {
      // peças aceitam número inteiro ou decimal (ex: 0.5 peça não faz sentido — avisa, mas não bloqueia)
    }

    if (!observacao || observacao.trim().length < 5) {
      erros.observacao = 'A observação deve ter pelo menos 5 caracteres.'
    }

    setErrors(erros)
    return Object.keys(erros).length === 0
  }

  function handleConfirmar() {
    if (!validar()) return

    // API sempre recebe em m³ para produtos MADEIRA
    const quantidadeAPI = isMadeira
      ? (entradaM3 ?? qtdNum).toFixed(4)
      : qtdNum.toFixed(4)

    registrar(
      {
        produtoId,
        quantidade: quantidadeAPI,
        ...(custoUnitario.trim() ? { custoUnitario: parseFloat(custoUnitario).toFixed(2) } : {}),
        observacao: observacao.trim(),
        ...(fornecedorId ? { fornecedorId } : {}),
        ...(fornecedorId && dataVencimento ? { dataVencimento } : {}),
        ...(fornecedorId ? { formaPagamentoPrevisto } : {}),
      },
      { onSuccess: (data) => setResultado(data) },
    )
  }

  function handleFechar() {
    setQuantidade('')
    setCustoUnitario('')
    setObservacao('')
    setFornecedorId('')
    setDataVencimento('')
    setFormaPagamentoPrevisto('BOLETO')
    setErrors({})
    setResultado(null)
    setModo('m3')
    reset()
    onClose()
  }

  function handleModo(novo: ModoEntrada) {
    setModo(novo)
    setQuantidade('')
    setErrors({})
  }

  // ── Painel de sucesso ───────────────────────────────────────────────────────

  if (resultado) {
    const qtdEntrada = parseFloat(resultado.quantidade)
    const novoSaldo = parseFloat(resultado.novoSaldo)

    return (
      <Modal
        open={open}
        onClose={handleFechar}
        title="Entrada registrada"
        footer={<Button onClick={handleFechar}>Fechar</Button>}
      >
        <div className="rounded-lg border border-green-200 bg-green-50 p-5 space-y-3 text-sm">
          <p className="font-semibold text-green-700 text-base">Entrada registrada com sucesso!</p>
          <div className="space-y-1 text-green-800">
            <p>
              Quantidade entrada:{' '}
              <span className="font-bold">
                {resultado.unidadeSigla === 'M3'
                  ? `${formatarM3(qtdEntrada)} m³`
                  : `${qtdEntrada.toLocaleString('pt-BR', { maximumFractionDigits: 4 })} ${resultado.unidadeSigla}`}
              </span>
              {resultado.metrosLineares && (
                <span> ≡ <span className="font-bold">{formatarMetros(parseFloat(resultado.metrosLineares))} m lineares</span></span>
              )}
            </p>
            <p>
              Novo saldo:{' '}
              <span className="font-bold">
                {resultado.unidadeSigla === 'M3'
                  ? `${formatarM3(novoSaldo)} m³`
                  : `${novoSaldo.toLocaleString('pt-BR', { maximumFractionDigits: 4 })} ${resultado.unidadeSigla}`}
              </span>
              {resultado.novoSaldoMetrosLineares && (
                <span> ≡ <span className="font-bold">{formatarMetros(parseFloat(resultado.novoSaldoMetrosLineares))} m lineares</span></span>
              )}
            </p>
            {resultado.tituloPagarNumero && (
              <p className="mt-1 text-blue-700">
                Título a pagar gerado:{' '}
                <span className="font-bold font-mono">{resultado.tituloPagarNumero}</span>
              </p>
            )}
          </div>
        </div>
      </Modal>
    )
  }

  // ── Formulário ─────────────────────────────────────────────────────────────

  return (
    <Modal
      open={open}
      onClose={handleFechar}
      title="Registrar Entrada de Compra"
      footer={
        <>
          <Button variant="outline" onClick={handleFechar} disabled={isPending}>Cancelar</Button>
          <Button onClick={handleConfirmar} loading={isPending}>Confirmar Entrada</Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Info do produto */}
        {produto && (
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-gray-900">{produto.descricao}</span>
            {' · '}
            <span>{produto.codigo}</span>
            {isMadeira && espessuraM && larguraM && (
              <span> · {(espessuraM * 1000).toFixed(0)}mm × {(larguraM * 1000).toFixed(0)}mm</span>
            )}
            {temPeca && (
              <span> · <span className="text-blue-600 font-medium">{comprimentoPecaM}m/peça</span></span>
            )}
          </div>
        )}

        {/* Toggle modo de entrada — só para madeira com comprimento de peça */}
        {temPeca && (
          <div className="flex gap-1 rounded-md border border-border bg-muted/30 p-1">
            <button
              type="button"
              onClick={() => handleModo('m3')}
              className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                modo === 'm3'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-muted-foreground hover:text-gray-700'
              }`}
            >
              Informar em m³
            </button>
            <button
              type="button"
              onClick={() => handleModo('pecas')}
              className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                modo === 'pecas'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-muted-foreground hover:text-gray-700'
              }`}
            >
              Informar em peças
            </button>
          </div>
        )}

        {/* Saldo atual */}
        {isMadeira ? (
          saldoAtualM3 != null && (
            <div className="rounded-md bg-blue-50 p-3 text-sm">
              <span>Saldo atual: </span>
              <span className="font-bold">{formatarM3(saldoAtualM3)} m³</span>
              {saldoAtualLinear != null && (
                <span> ≡ {formatarMetros(saldoAtualLinear)} m lineares</span>
              )}
            </div>
          )
        ) : (
          saldoAtualUnidade != null && (
            <div className="rounded-md bg-blue-50 p-3 text-sm">
              <span>Saldo atual: </span>
              <span className="font-bold">
                {saldoAtualUnidade.toLocaleString('pt-BR', { maximumFractionDigits: 4 })} {unidade}
              </span>
            </div>
          )
        )}

        {/* Campo de quantidade */}
        <Input
          label={
            modo === 'pecas'
              ? `Quantidade (peças) *`
              : `Quantidade (${isMadeira ? 'm³' : unidade}) *`
          }
          type="number"
          min={modo === 'pecas' ? '1' : '0.0001'}
          step={modo === 'pecas' ? '1' : (isMadeira ? '0.0001' : '1')}
          placeholder={modo === 'pecas' ? '0' : (isMadeira ? '0.0000' : '0')}
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
          error={errors.quantidade}
        />

        {/* Preview em tempo real */}
        {qtdValida && isMadeira && entradaM3 != null && (
          <div className="rounded-md bg-green-50 p-3 text-sm text-green-700 space-y-1">
            {modo === 'pecas' && comprimentoPecaM && (
              <p>
                <span className="font-bold">{qtdNum} peças</span>
                {' × '}{comprimentoPecaM} m = {' '}
                <span className="font-bold">{formatarMetros(qtdNum * comprimentoPecaM)} m lineares</span>
              </p>
            )}
            <p>
              Entrada em estoque:{' '}
              <span className="font-bold">{formatarM3(entradaM3)} m³</span>
              {entradaLinear != null && (
                <span> ≡ <span className="font-bold">{formatarMetros(entradaLinear)} m lineares</span></span>
              )}
            </p>
            {modo === 'm3' && entradaPecas != null && (
              <p className="text-xs text-green-600">
                ≈ {entradaPecas.toFixed(2)} peças de {comprimentoPecaM}m
              </p>
            )}
            {novoSaldoM3 != null && (
              <p>
                Após entrada:{' '}
                <span className="font-bold">{formatarM3(novoSaldoM3)} m³</span>
                {novoSaldoLinear != null && (
                  <span> ≡ {formatarMetros(novoSaldoLinear)} m lineares</span>
                )}
              </p>
            )}
          </div>
        )}

        {/* Preview NORMAL */}
        {!isMadeira && qtdValida && novoSaldoUnidade != null && (
          <div className="rounded-md bg-green-50 p-3 text-sm text-green-700 space-y-1">
            <p>Entrada: <span className="font-bold">{qtdNum.toLocaleString('pt-BR', { maximumFractionDigits: 4 })} {unidade}</span></p>
            <p>Após entrada: <span className="font-bold">{novoSaldoUnidade.toLocaleString('pt-BR', { maximumFractionDigits: 4 })} {unidade}</span></p>
          </div>
        )}

        {/* Custo unitário */}
        <Input
          label={`Custo unitário (R$/${modo === 'pecas' ? 'peça' : unidade}) — opcional`}
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={custoUnitario}
          onChange={(e) => setCustoUnitario(e.target.value)}
        />

        {/* Fornecedor + contas a pagar */}
        <div className="rounded-md border border-border p-3 space-y-3">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Contas a Pagar (opcional)
          </p>
          <div>
            <label className="text-sm font-medium text-gray-700">Fornecedor</label>
            <select
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={fornecedorId}
              onChange={(e) => setFornecedorId(e.target.value)}
            >
              <option value="">— Não vincular fornecedor —</option>
              {fornecedores?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.razaoSocial}{f.nomeFantasia ? ` (${f.nomeFantasia})` : ''}
                </option>
              ))}
            </select>
          </div>

          {fornecedorId && (
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700">Vencimento</label>
                <Input
                  className="mt-1"
                  type="date"
                  value={dataVencimento}
                  onChange={(e) => setDataVencimento(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700">Forma de Pagamento</label>
                <select
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={formaPagamentoPrevisto}
                  onChange={(e) => setFormaPagamentoPrevisto(e.target.value)}
                >
                  <option value="BOLETO">Boleto</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="DINHEIRO">Dinheiro</option>
                  <option value="PIX">PIX</option>
                  <option value="CARTAO_DEBITO">Cartão Débito</option>
                  <option value="CARTAO_CREDITO">Cartão Crédito</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Observação */}
        <div className="flex flex-col gap-1">
          <label htmlFor="entrada-observacao" className="text-sm font-medium text-gray-700">
            Observação <span className="text-muted-foreground">(mín. 5 caracteres)</span>
          </label>
          <textarea
            id="entrada-observacao"
            rows={3}
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Ex: Compra NF 12345, fornecedor Madeiras Silva..."
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
