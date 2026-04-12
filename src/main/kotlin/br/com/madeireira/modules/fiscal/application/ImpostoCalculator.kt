package br.com.madeireira.modules.fiscal.application

import java.math.BigDecimal
import java.math.RoundingMode

/**
 * Calculadora fiscal com BigDecimal — nunca usa Double/Float em valores monetários.
 *
 * Problema mitigado (Risco 10):
 *   Cálculos com Double acumulam erros de ponto flutuante. Ex: 0.1 + 0.2 ≠ 0.3 em Double.
 *   Em NF-e, diferença de 1 centavo entre valor total calculado e soma dos itens
 *   gera rejeição SEFAZ código 539 ("Valor do item difere do produto Qtd x Preço Unit.").
 *
 * Regras de arredondamento:
 *   - Valores unitários: 4 casas decimais (HALF_UP)
 *   - Valores totais por item: 2 casas decimais (HALF_UP)
 *   - Valor total da NF: soma dos itens (não recalcula — evita diferença de centavo)
 *   - Alíquotas de imposto: 2 casas decimais (HALF_UP)
 *
 * Referência: NT 2021.001 v1.40 — Manual de Orientação ao Contribuinte NF-e 4.00
 */
object ImpostoCalculator {

    private val ZERO      = BigDecimal.ZERO
    private val HUNDRED   = BigDecimal("100")
    private val SCALE_QTD = 4   // quantidade: até 4 decimais
    private val SCALE_VAL = 2   // valor: 2 decimais (centavos)
    private val SCALE_UNT = 4   // unitário: 4 decimais

    /**
     * Calcula valor bruto do item: quantidade × valor unitário, arredondado para 2 decimais.
     * Usa BigDecimal em toda a cadeia para eliminar erro de ponto flutuante.
     */
    fun valorBrutoItem(quantidade: String, valorUnitario: String): BigDecimal {
        val qtd  = parseBD(quantidade, SCALE_QTD)
        val unit = parseBD(valorUnitario, SCALE_UNT)
        return (qtd * unit).setScale(SCALE_VAL, RoundingMode.HALF_UP)
    }

    /**
     * Soma os valores brutos dos itens.
     * O total da NF deve ser a SOMA dos itens — nunca recalcular a partir de médias.
     */
    fun valorTotalItens(valoresBrutos: List<BigDecimal>): BigDecimal =
        valoresBrutos.fold(ZERO) { acc, v -> acc + v }.setScale(SCALE_VAL, RoundingMode.HALF_UP)

    /**
     * Calcula alíquota efetiva de imposto: valor / base * 100, arredondado para 2 decimais.
     * Usado para ICMS, PIS, COFINS quando o cálculo é por within-price.
     */
    fun aliquotaEfetiva(valorImposto: BigDecimal, baseCalculo: BigDecimal): BigDecimal {
        if (baseCalculo.compareTo(ZERO) == 0) return ZERO
        return (valorImposto.divide(baseCalculo, 6, RoundingMode.HALF_UP) * HUNDRED)
            .setScale(SCALE_VAL, RoundingMode.HALF_UP)
    }

    /**
     * Aplica desconto proporcional aos itens sem perder centavos.
     * Distribui o desconto total pelos itens proporcionalmente ao valor bruto.
     * O último item absorve o resíduo de arredondamento.
     *
     * @param valoresBrutos valores brutos de cada item (sem desconto)
     * @param descontoTotal desconto total da NF
     * @return lista de descontos por item (mesma ordem)
     */
    fun distribuirDesconto(valoresBrutos: List<BigDecimal>, descontoTotal: BigDecimal): List<BigDecimal> {
        if (descontoTotal.compareTo(ZERO) == 0 || valoresBrutos.isEmpty()) {
            return valoresBrutos.map { ZERO }
        }
        val totalBruto = valorTotalItens(valoresBrutos)
        if (totalBruto.compareTo(ZERO) == 0) return valoresBrutos.map { ZERO }

        val descontos = valoresBrutos.dropLast(1).map { vb ->
            (descontoTotal * vb).divide(totalBruto, SCALE_VAL, RoundingMode.HALF_UP)
        }

        // Último item absorve o resíduo para garantir que a soma seja exata
        val somaDistribuida = descontos.fold(ZERO) { a, d -> a + d }
        val residuo = descontoTotal.setScale(SCALE_VAL, RoundingMode.HALF_UP) - somaDistribuida
        return descontos + (residuo)
    }

    /**
     * Converte string para BigDecimal com tratamento seguro.
     * Aceita vírgula como separador decimal (padrão brasileiro).
     */
    fun parseBD(value: String, scale: Int = SCALE_VAL): BigDecimal =
        value.trim().replace(',', '.').toBigDecimalOrNull()
            ?.setScale(scale, RoundingMode.HALF_UP)
            ?: ZERO

    /** Converte Double para BigDecimal com 2 casas decimais — usar só em fronteiras de entrada. */
    fun fromDouble(value: Double, scale: Int = SCALE_VAL): BigDecimal =
        BigDecimal(value.toString()).setScale(scale, RoundingMode.HALF_UP)
}
