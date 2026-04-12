package br.com.madeireira.modules.fiscal.application

import br.com.madeireira.modules.fiscal.domain.model.StatusNf
import java.time.LocalDate
import java.time.format.DateTimeFormatter

/**
 * Implementação stub do emissor de NF-e.
 * Simula a autorização sem enviar para a SEFAZ.
  Substituir por SefazDirectAdapter em produção.
 */
class NfEmissaoStub : NfEmissaoPort {

    override suspend fun emitir(request: NfEmissaoRequest): NfEmissaoResult {
        val chave = gerarChave(request.serie, request.numero)
        val protocolo = "135${System.currentTimeMillis()}"
        return NfEmissaoResult(
            chaveAcesso    = chave,
            protocolo      = protocolo,
            status         = StatusNf.AUTORIZADA,
            xml            = null,
            motivoRejeicao = null,
        )
    }

    override suspend fun cancelar(vendaId: java.util.UUID, chaveAcesso: String, justificativa: String): NfCancelamentoResult {
        return NfCancelamentoResult(
            protocolo = "135${System.currentTimeMillis()}",
            status    = StatusNf.CANCELADA,
            xml       = null,
        )
    }

    /**
     * Gera uma chave de acesso de 44 caracteres no formato NF-e.
     * cUF(2) AAMM(4) CNPJ(14) mod(2) serie(3) nNF(9) tpEmis(1) cNF(8) cDV(1)
     */
    private fun gerarChave(serie: String, numero: Int): String {
        val aamm    = LocalDate.now().format(DateTimeFormatter.ofPattern("yyMM"))
        val cnpj    = "00000000000000"                         // placeholder
        val mod     = "55"                                     // NF-e modelo 55
        val serieP  = serie.padStart(3, '0')
        val nNF     = numero.toString().padStart(9, '0')
        val tpEmis  = "1"                                      // emissão normal
        val cNF     = (10000000..99999999).random().toString() // código numérico
        val semDv   = "35$aamm$cnpj$mod$serieP$nNF$tpEmis$cNF"
        val cDv     = calcularDigitoVerificador(semDv)
        return "$semDv$cDv"
    }

    private fun calcularDigitoVerificador(chave: String): Int {
        val pesos = generateSequence(2) { if (it == 9) 2 else it + 1 }.iterator()
        var soma = 0
        for (c in chave.reversed()) {
            soma += c.digitToInt() * pesos.next()
        }
        val resto = soma % 11
        return if (resto < 2) 0 else 11 - resto
    }
}
