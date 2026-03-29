package br.com.madeireira.core.conversion

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.booleans.shouldBeFalse
import io.kotest.matchers.booleans.shouldBeTrue
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldContain
import java.math.BigDecimal

class ConversionEngineTest : FunSpec({

    // Helper: calcula o fator para 25mm x 100mm = 0.00250000
    fun fator(espessuraMm: Double, larguraMm: Double): BigDecimal =
        ConversionEngine.calcularFator(BigDecimal(espessuraMm.toString()), BigDecimal(larguraMm.toString()))

    // -------------------------------------------------------------------------
    // calcularFator
    // -------------------------------------------------------------------------

    test("calcularFator(25, 100) deve retornar 0.00250000") {
        val resultado = fator(25.0, 100.0)
        resultado shouldBe BigDecimal("0.00250000")
    }

    test("calcularFator com espessura zero deve lançar IllegalArgumentException") {
        shouldThrow<IllegalArgumentException> {
            ConversionEngine.calcularFator(BigDecimal.ZERO, BigDecimal("100"))
        }
    }

    test("calcularFator com largura zero deve lançar IllegalArgumentException") {
        shouldThrow<IllegalArgumentException> {
            ConversionEngine.calcularFator(BigDecimal("25"), BigDecimal.ZERO)
        }
    }

    // -------------------------------------------------------------------------
    // linearParaM3
    // -------------------------------------------------------------------------

    test("linearParaM3(35.5, fator(25,100)) deve retornar 0.0888") {
        // 35.5 * 0.00250000 = 0.08875 → scale 4 HALF_UP → 0.0888
        val resultado = ConversionEngine.linearParaM3(BigDecimal("35.5"), fator(25.0, 100.0))
        resultado shouldBe BigDecimal("0.0888")
    }

    test("linearParaM3(1000, fator(25,100)) deve retornar 2.5000 (precisão)") {
        val resultado = ConversionEngine.linearParaM3(BigDecimal("1000"), fator(25.0, 100.0))
        resultado shouldBe BigDecimal("2.5000")
    }

    test("linearParaM3 com metrosLineares zero deve lançar IllegalArgumentException") {
        shouldThrow<IllegalArgumentException> {
            ConversionEngine.linearParaM3(BigDecimal.ZERO, fator(25.0, 100.0))
        }
    }

    test("linearParaM3 com metrosLineares negativo deve lançar IllegalArgumentException") {
        shouldThrow<IllegalArgumentException> {
            ConversionEngine.linearParaM3(BigDecimal("-1"), fator(25.0, 100.0))
        }
    }

    test("linearParaM3 com fatorConversao zero deve lançar IllegalArgumentException") {
        shouldThrow<IllegalArgumentException> {
            ConversionEngine.linearParaM3(BigDecimal("10"), BigDecimal.ZERO)
        }
    }

    // -------------------------------------------------------------------------
    // m3ParaLinear
    // -------------------------------------------------------------------------

    test("m3ParaLinear(1.0, fator(25,100)) deve retornar 400.00") {
        // 1.0 / 0.00250000 = 400.00
        val resultado = ConversionEngine.m3ParaLinear(BigDecimal("1.0"), fator(25.0, 100.0))
        resultado shouldBe BigDecimal("400.00")
    }

    test("m3ParaLinear(18.5, fator(25,100)) deve retornar 7400.00") {
        // 18.5 / 0.00250000 = 7400.00
        val resultado = ConversionEngine.m3ParaLinear(BigDecimal("18.5"), fator(25.0, 100.0))
        resultado shouldBe BigDecimal("7400.00")
    }

    test("m3ParaLinear com volume zero deve retornar 0.00") {
        val resultado = ConversionEngine.m3ParaLinear(BigDecimal.ZERO, fator(25.0, 100.0))
        resultado shouldBe BigDecimal("0.00")
    }

    test("m3ParaLinear com volume negativo deve lançar IllegalArgumentException") {
        shouldThrow<IllegalArgumentException> {
            ConversionEngine.m3ParaLinear(BigDecimal("-0.5"), fator(25.0, 100.0))
        }
    }

    test("m3ParaLinear com fatorConversao zero deve lançar IllegalArgumentException") {
        shouldThrow<IllegalArgumentException> {
            ConversionEngine.m3ParaLinear(BigDecimal("1.0"), BigDecimal.ZERO)
        }
    }

    // -------------------------------------------------------------------------
    // formatarFormula
    // -------------------------------------------------------------------------

    test("formatarFormula deve conter 'm³' no resultado") {
        val resultado = ConversionEngine.formatarFormula(
            metrosLineares = BigDecimal("35.5"),
            fatorConversao = fator(25.0, 100.0)
        )
        resultado shouldContain "m³"
    }

    test("formatarFormula com dimensoes deve conter 'mm' no resultado") {
        val resultado = ConversionEngine.formatarFormula(
            metrosLineares = BigDecimal("10"),
            fatorConversao = fator(25.0, 100.0),
            espessuraMm = BigDecimal("25"),
            larguraMm = BigDecimal("100")
        )
        resultado shouldContain "mm"
        resultado shouldContain "m³"
    }

    // -------------------------------------------------------------------------
    // dimensoesValidas
    // -------------------------------------------------------------------------

    test("dimensoesValidas(25, 100) deve retornar true") {
        ConversionEngine.dimensoesValidas(BigDecimal("25"), BigDecimal("100")).shouldBeTrue()
    }

    test("dimensoesValidas(null, 100) deve retornar false") {
        ConversionEngine.dimensoesValidas(null, BigDecimal("100")).shouldBeFalse()
    }

    test("dimensoesValidas(25, null) deve retornar false") {
        ConversionEngine.dimensoesValidas(BigDecimal("25"), null).shouldBeFalse()
    }

    test("dimensoesValidas(0, 100) deve retornar false") {
        ConversionEngine.dimensoesValidas(BigDecimal.ZERO, BigDecimal("100")).shouldBeFalse()
    }

    test("dimensoesValidas(null, null) deve retornar false") {
        ConversionEngine.dimensoesValidas(null, null).shouldBeFalse()
    }
})
