import { describe, it, expect } from 'vitest';
import {
  linearParaM3,
  m3ParaLinear,
  calcularFator,
  formatarFormula,
  dimensoesValidas,
} from './conversaoMadeira';

/**
 * Testes unitários para a função central de conversão.
 * REGRA: 100% de cobertura obrigatória — esta é a função mais crítica do frontend.
 */
describe('conversaoMadeira', () => {

  // ── calcularFator ──────────────────────────────────────────────
  describe('calcularFator', () => {
    it('calcula o fator para Pinus 25×100mm corretamente', () => {
      expect(calcularFator(25, 100)).toBeCloseTo(0.0025, 8);
    });

    it('calcula o fator para Eucalipto 50×200mm corretamente', () => {
      expect(calcularFator(50, 200)).toBeCloseTo(0.01, 8);
    });

    it('lança erro para espessura zero', () => {
      expect(() => calcularFator(0, 100)).toThrow('positivas');
    });

    it('lança erro para largura zero', () => {
      expect(() => calcularFator(25, 0)).toThrow('positivas');
    });

    it('lança erro para espessura negativa', () => {
      expect(() => calcularFator(-5, 100)).toThrow('positivas');
    });
  });

  // ── linearParaM3 ───────────────────────────────────────────────
  describe('linearParaM3', () => {
    it('converte 35.5 metros de Pinus 25×100mm corretamente', () => {
      // 35.5 × 0.0025 = 0.08875 → arredondado 4 casas HALF_UP = 0.0888
      expect(linearParaM3(35.5, 25, 100)).toBe(0.0888);
    });

    it('converte 150 metros de Eucalipto 50×200mm corretamente', () => {
      // 150 × 0.01 = 1.5000
      expect(linearParaM3(150, 50, 200)).toBe(1.5);
    });

    it('retorna 4 casas decimais sempre', () => {
      const resultado = linearParaM3(35.5, 25, 100);
      const str = resultado.toFixed(4);
      expect(str).toBe('0.0888');
    });

    it('precisão: 1000 metros deve retornar 2.5000 (não 2.4999)', () => {
      expect(linearParaM3(1000, 25, 100)).toBe(2.5);
    });

    it('lança erro para metros lineares zero', () => {
      expect(() => linearParaM3(0, 25, 100)).toThrow('positivo');
    });

    it('lança erro para metros lineares negativos', () => {
      expect(() => linearParaM3(-1, 25, 100)).toThrow('positivo');
    });

    it('lança erro se espessura não cadastrada (zero)', () => {
      expect(() => linearParaM3(35.5, 0, 100)).toThrow('Dimensões inválidas');
    });

    it('lança erro se largura não cadastrada (zero)', () => {
      expect(() => linearParaM3(35.5, 25, 0)).toThrow('Dimensões inválidas');
    });

    it('mensagem de erro menciona cadastrar dimensões', () => {
      expect(() => linearParaM3(1, 0, 100)).toThrow('Cadastre as dimensões');
    });
  });

  // ── m3ParaLinear ───────────────────────────────────────────────
  describe('m3ParaLinear', () => {
    it('1 m³ de Pinus 25×100mm = 400 metros lineares', () => {
      expect(m3ParaLinear(1, 25, 100)).toBe(400);
    });

    it('18.5 m³ de Pinus 25×100mm = 7400 metros lineares', () => {
      expect(m3ParaLinear(18.5, 25, 100)).toBe(7400);
    });

    it('0 m³ retorna 0 metros lineares (sem erro)', () => {
      expect(m3ParaLinear(0, 25, 100)).toBe(0);
    });

    it('lança erro para volume negativo', () => {
      expect(() => m3ParaLinear(-1, 25, 100)).toThrow('negativo');
    });

    it('retorna 2 casas decimais sempre', () => {
      const resultado = m3ParaLinear(1.5, 25, 100);
      expect(resultado.toFixed(2)).toBe('600.00');
    });
  });

  // ── Simetria (roundtrip) ───────────────────────────────────────
  describe('simetria m³ ↔ metro linear', () => {
    it('converter para m³ e voltar para metro linear deve ser consistente', () => {
      const metros = 35.5;
      const m3 = linearParaM3(metros, 25, 100);
      const metrosRecuperados = m3ParaLinear(m3, 25, 100);
      // Pequena tolerância por arredondamento intermediário
      expect(Math.abs(metrosRecuperados - metros)).toBeLessThan(0.01);
    });

    it('converter 1 m³ para metros e voltar deve ser ≈ 1 m³', () => {
      const metros = m3ParaLinear(1, 30, 150);
      const m3Recuperado = linearParaM3(metros, 30, 150);
      expect(Math.abs(m3Recuperado - 1)).toBeLessThan(0.001);
    });
  });

  // ── formatarFormula ────────────────────────────────────────────
  describe('formatarFormula', () => {
    it('retorna objeto com volumeM3 correto', () => {
      const { volumeM3 } = formatarFormula(35.5, 25, 100);
      expect(volumeM3).toBe(0.0888);
    });

    it('formula contém "m³"', () => {
      const { formula } = formatarFormula(35.5, 25, 100);
      expect(formula).toContain('m³');
    });

    it('formula contém as dimensões em mm', () => {
      const { formula } = formatarFormula(35.5, 25, 100);
      expect(formula).toContain('25mm');
      expect(formula).toContain('100mm');
    });

    it('saldoAposVenda calcula corretamente', () => {
      const { saldoAposVenda } = formatarFormula(35.5, 25, 100);
      const resultado = saldoAposVenda(18.5);
      expect(resultado).toContain('m³');
      expect(resultado).toContain('m lineares');
    });
  });

  // ── dimensoesValidas ───────────────────────────────────────────
  describe('dimensoesValidas', () => {
    it('retorna true para dimensões válidas', () => {
      expect(dimensoesValidas(25, 100)).toBe(true);
    });

    it('retorna false para espessura null', () => {
      expect(dimensoesValidas(null, 100)).toBe(false);
    });

    it('retorna false para largura undefined', () => {
      expect(dimensoesValidas(25, undefined)).toBe(false);
    });

    it('retorna false para espessura zero', () => {
      expect(dimensoesValidas(0, 100)).toBe(false);
    });

    it('retorna false para largura zero', () => {
      expect(dimensoesValidas(25, 0)).toBe(false);
    });

    it('retorna false para valores negativos', () => {
      expect(dimensoesValidas(-5, 100)).toBe(false);
    });

    it('retorna false se ambos null', () => {
      expect(dimensoesValidas(null, null)).toBe(false);
    });
  });

  // ── Casos de borda do domínio madeireira ──────────────────────
  describe('casos de borda específicos da madeireira', () => {
    it('madeira muito fina (6mm) não causa divisão problemática', () => {
      expect(() => m3ParaLinear(1, 6, 100)).not.toThrow();
      expect(m3ParaLinear(1, 6, 100)).toBeGreaterThan(0);
    });

    it('madeira muito larga (400mm) calcula corretamente', () => {
      // 25mm × 400mm: fator = 0.01
      expect(linearParaM3(100, 25, 400)).toBe(1.0);
    });

    it('quantidade fracionada pequena não causa underflow', () => {
      expect(() => linearParaM3(0.01, 25, 100)).not.toThrow();
    });

    it('volume grande (500 m³) não causa overflow', () => {
      expect(() => m3ParaLinear(500, 25, 100)).not.toThrow();
      expect(m3ParaLinear(500, 25, 100)).toBe(200000);
    });
  });
});
