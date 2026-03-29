package br.com.madeireira.core.conversion

import java.math.BigDecimal
import java.math.MathContext
import java.math.RoundingMode

/**
 * PRINCÍPIO CENTRAL DO DOMÍNIO:
 * m³ é o lastro físico do estoque de madeira.
 * Metro linear é a interface comercial de venda.
 *
 * REGRA DE OURO: Este é o ÚNICO lugar no sistema onde a conversão
 * m³ ↔ metro linear é calculada.
 * Nenhum outro service, controller ou repositório pode fazer
 * este cálculo diretamente. ArchitectureTest.kt enforce isso.
 *
 * Fórmula: metros_lineares = m³ / (espessura_m × largura_m)
 */
object ConversionEngine {

    private val ESCALA_M3 = 4           // 4 casas decimais para m³ (ex: 18.5000)
    private val ESCALA_LINEAR = 2       // 2 casas decimais para metro linear (ex: 35.50)
    private val ESCALA_FATOR = 8        // 8 casas decimais para fator interno
    private val MC = MathContext.DECIMAL64

    /**
     * Converte metros lineares para m³.
     *
     * @param metrosLineares quantidade em metro linear (interface comercial — o que o cliente pede)
     * @param fatorConversao espessura_m × largura_m — obtido de DimensaoMadeira.fatorConversao
     * @return volume em m³ com [ESCALA_M3] casas decimais
     * @throws IllegalArgumentException se metros ou fator forem inválidos
     */
    fun linearParaM3(metrosLineares: BigDecimal, fatorConversao: BigDecimal): BigDecimal {
        require(metrosLineares > BigDecimal.ZERO) {
            "Metros lineares deve ser positivo. Recebido: $metrosLineares"
        }
        require(fatorConversao > BigDecimal.ZERO) {
            "Fator de conversão inválido (dimensão não cadastrada ou zero). Recebido: $fatorConversao"
        }
        return (metrosLineares.multiply(fatorConversao, MC))
            .setScale(ESCALA_M3, RoundingMode.HALF_UP)
    }

    /**
     * Converte m³ para metros lineares equivalentes.
     *
     * @param volumeM3 volume em m³ (lastro físico do estoque)
     * @param fatorConversao espessura_m × largura_m
     * @return metros lineares com [ESCALA_LINEAR] casas decimais
     */
    fun m3ParaLinear(volumeM3: BigDecimal, fatorConversao: BigDecimal): BigDecimal {
        require(volumeM3 >= BigDecimal.ZERO) {
            "Volume não pode ser negativo. Recebido: $volumeM3"
        }
        require(fatorConversao > BigDecimal.ZERO) {
            "Fator de conversão inválido. Recebido: $fatorConversao"
        }
        if (volumeM3 == BigDecimal.ZERO) return BigDecimal.ZERO.setScale(ESCALA_LINEAR)
        return (volumeM3.divide(fatorConversao, ESCALA_LINEAR + 2, RoundingMode.HALF_DOWN))
            .setScale(ESCALA_LINEAR, RoundingMode.HALF_DOWN)
    }

    /**
     * Calcula o fator de conversão a partir das dimensões em milímetros.
     * Resultado: espessura_m × largura_m (m² por metro linear).
     *
     * Este valor deve ser PERSISTIDO em DimensaoMadeira.fatorConversao
     * para evitar recálculo e garantir imutabilidade por versão.
     *
     * @param espessuraMm espessura em milímetros (ex: 25.0)
     * @param larguraMm largura em milímetros (ex: 100.0)
     */
    fun calcularFator(espessuraMm: BigDecimal, larguraMm: BigDecimal): BigDecimal {
        require(espessuraMm > BigDecimal.ZERO) { "Espessura deve ser positiva. Recebido: $espessuraMm" }
        require(larguraMm > BigDecimal.ZERO) { "Largura deve ser positiva. Recebido: $larguraMm" }
        val milPorMetro = BigDecimal("1000")
        val espessuraM = espessuraMm.divide(milPorMetro, ESCALA_FATOR, RoundingMode.HALF_UP)
        val larguraM   = larguraMm.divide(milPorMetro, ESCALA_FATOR, RoundingMode.HALF_UP)
        return espessuraM.multiply(larguraM, MC).setScale(ESCALA_FATOR, RoundingMode.HALF_UP)
    }

    /**
     * Retorna a fórmula formatada para exibição ao operador.
     * Usado na tela de venda (SaldoTransparenciaPanel) e cadastro de produto.
     *
     * Exemplo: "35,50 m × 0,00250000 m²/m = 0,0888 m³"
     */
    fun formatarFormula(
        metrosLineares: BigDecimal,
        fatorConversao: BigDecimal,
        espessuraMm: BigDecimal? = null,
        larguraMm: BigDecimal? = null
    ): String {
        val volumeM3 = linearParaM3(metrosLineares, fatorConversao)
        val dimensoes = if (espessuraMm != null && larguraMm != null) {
            " (${espessuraMm.toPlainString()}mm × ${larguraMm.toPlainString()}mm)"
        } else ""
        return "${metrosLineares.toPlainString()} m × ${fatorConversao.toPlainString()} m²/m$dimensoes = ${volumeM3.toPlainString()} m³"
    }

    /**
     * Valida se as dimensões são suficientes para conversão.
     * Usado antes de iniciar qualquer movimentação de madeira.
     */
    fun dimensoesValidas(espessuraMm: BigDecimal?, larguraMm: BigDecimal?): Boolean {
        return espessuraMm != null && larguraMm != null &&
               espessuraMm > BigDecimal.ZERO &&
               larguraMm > BigDecimal.ZERO
    }
}
