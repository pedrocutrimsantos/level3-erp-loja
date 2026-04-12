package br.com.madeireira.modules.fiscal.infrastructure.sefaz

import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

/**
 * Gerador da chave de acesso de 44 dígitos da NF-e 4.0.
 *
 * Formato: cUF(2) + AAMM(4) + CNPJ(14) + mod(2) + série(3) + nNF(9) + tpEmis(1) + cNF(8) + cDV(1)
 *
 * Referência: NT 2021.001 — Manual de Orientação ao Contribuinte NF-e 4.00, seção 5.1.
 *
 * cDV = módulo 11 com pesos 2..9 da direita para a esquerda, resto 0 ou 1 → cDV = 0.
 */
object NFeChaveAcessoBuilder {

    private val AAMM_FMT = DateTimeFormatter.ofPattern("yyMM")

    /**
     * @param uf           sigla da UF emitente ("SP", "MG" etc.)
     * @param cnpj         CNPJ do emitente — somente dígitos (14)
     * @param serie        série da NF-e — somente dígitos (pad left 3)
     * @param numero       número sequencial da NF-e (1..999999999)
     * @param tpEmis       tipo de emissão (1 = normal, default)
     * @param dataEmissao  data/hora de emissão (timezone do emitente)
     * @param cNF          código aleatório de 8 dígitos — gerado automaticamente se omitido
     * @return chave de acesso com 44 caracteres
     */
    fun build(
        uf: String,
        cnpj: String,
        serie: String,
        numero: Int,
        tpEmis: Int = 1,
        dataEmissao: ZonedDateTime,
        cNF: String = gerarCNF(),
    ): String {
        val cuf      = requireNotNull(SefazUrlRouter.UF_CODIGO[uf.uppercase()]) { "UF inválida: $uf" }
        val aamm     = dataEmissao.format(AAMM_FMT)
        val cnpjPad  = cnpj.filter { it.isDigit() }.padStart(14, '0')
        val mod      = "55"
        val seriePad = serie.filter { it.isDigit() }.padStart(3, '0')
        val nNFPad   = numero.toString().padStart(9, '0')
        val tpEmisCh = tpEmis.toString()
        val cNFPad   = cNF.filter { it.isDigit() }.padStart(8, '0')

        val chave43 = cuf + aamm + cnpjPad + mod + seriePad + nNFPad + tpEmisCh + cNFPad
        require(chave43.length == 43) { "Chave sem cDV deveria ter 43 dígitos — obtido ${chave43.length}" }

        val cDV = calcularCDV(chave43)
        return chave43 + cDV
    }

    /** Gera código numérico aleatório de 8 dígitos (cNF). */
    fun gerarCNF(): String = (10_000_000..99_999_999).random().toString()

    /**
     * Módulo 11 — pesos 2..9 da direita para a esquerda, ciclo.
     * Resto 0 ou 1 → dígito verificador = 0.
     */
    fun calcularCDV(chave43: String): Int {
        var soma = 0
        var peso = 2
        for (i in chave43.indices.reversed()) {
            soma += chave43[i].digitToInt() * peso
            peso = if (peso == 9) 2 else peso + 1
        }
        val resto = soma % 11
        return if (resto < 2) 0 else 11 - resto
    }
}
