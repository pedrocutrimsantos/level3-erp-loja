/**
 * PRINCÍPIO CENTRAL DO DOMÍNIO:
 * m³ é o lastro físico do estoque de madeira.
 * Metro linear é a interface comercial de venda.
 *
 * REGRA DE OURO: Este arquivo é o ÚNICO lugar no frontend onde a
 * conversão m³ ↔ metro linear é calculada.
 * JAMAIS duplicar esta lógica em componentes individuais.
 *
 * Equivalente ao ConversionEngine.kt no backend.
 * Fórmula: metros_lineares = m³ / (espessura_m × largura_m)
 *
 * CONVENÇÃO: todas as funções recebem dimensões em METROS (não mm).
 * A API retorna espessuraM e larguraM em metros desde a V012.
 */

const ESCALA_M3 = 4;     // casas decimais para m³ (ex: 18.5000)
const ESCALA_LINEAR = 2; // casas decimais para metro linear (ex: 35.50)

/**
 * Arredonda para N casas decimais usando HALF_UP (igual ao backend).
 */
function arredondar(valor: number, casas: number): number {
  const fator = Math.pow(10, casas);
  return Math.round((valor + Number.EPSILON) * fator) / fator;
}

/**
 * Calcula o fator de conversão (espessura_m × largura_m).
 * Resultado: m² por metro linear (ex: 0.0025 para 50mm×200mm = 0.05×0.20).
 *
 * @param espessuraM espessura em metros (ex: 0.05)
 * @param larguraM largura em metros (ex: 0.20)
 */
export function calcularFator(espessuraM: number, larguraM: number): number {
  if (espessuraM <= 0 || larguraM <= 0) {
    throw new Error('Espessura e largura devem ser positivas.');
  }
  return espessuraM * larguraM;
}

/**
 * Converte metros lineares para m³.
 *
 * @param metrosLineares quantidade em metro linear (o que o cliente pede)
 * @param espessuraM espessura em metros (ex: 0.05 para 5cm)
 * @param larguraM largura em metros (ex: 0.20 para 20cm)
 * @returns volume em m³ com 4 casas decimais
 */
export function linearParaM3(
  metrosLineares: number,
  espessuraM: number,
  larguraM: number
): number {
  if (metrosLineares <= 0) {
    throw new Error(`Metros lineares deve ser positivo. Recebido: ${metrosLineares}`);
  }
  if (espessuraM <= 0 || larguraM <= 0) {
    throw new Error(
      `Dimensões inválidas (espessura: ${espessuraM}m, largura: ${larguraM}m). ` +
      'Cadastre as dimensões do produto antes de realizar conversões.'
    );
  }
  const fator = calcularFator(espessuraM, larguraM);
  return arredondar(metrosLineares * fator, ESCALA_M3);
}

/**
 * Converte m³ para metros lineares equivalentes.
 *
 * @param volumeM3 volume em m³ (lastro físico do estoque)
 * @param espessuraM espessura em metros
 * @param larguraM largura em metros
 * @returns metros lineares com 2 casas decimais
 */
export function m3ParaLinear(
  volumeM3: number,
  espessuraM: number,
  larguraM: number
): number {
  if (volumeM3 < 0) {
    throw new Error(`Volume não pode ser negativo. Recebido: ${volumeM3}`);
  }
  if (espessuraM <= 0 || larguraM <= 0) {
    throw new Error(
      `Dimensões inválidas (espessura: ${espessuraM}m, largura: ${larguraM}m).`
    );
  }
  if (volumeM3 === 0) return 0;
  const fator = calcularFator(espessuraM, larguraM);
  return arredondar(volumeM3 / fator, ESCALA_LINEAR);
}

/**
 * Retorna a fórmula formatada para exibição ao operador.
 * Exibe dimensões tanto em metros quanto mm para facilitar a leitura.
 *
 * Exemplo: "35,50 m × (0,05m × 0,20m) = 35,50 × 0,01000000 = 0,3550 m³"
 */
export function formatarFormula(
  metrosLineares: number,
  espessuraM: number,
  larguraM: number
): {
  volumeM3: number;
  formula: string;
  resumo: string;
  saldoAposVenda: (saldoAtualM3: number) => string;
} {
  const volumeM3 = linearParaM3(metrosLineares, espessuraM, larguraM);
  const fator = calcularFator(espessuraM, larguraM);
  const espMm = (espessuraM * 1000).toFixed(0);
  const larMm = (larguraM * 1000).toFixed(0);

  return {
    volumeM3,
    formula:
      `${formatarMetros(metrosLineares)} m × ` +
      `(${espessuraM}m × ${larguraM}m = ${espMm}mm × ${larMm}mm) = ` +
      `${formatarMetros(metrosLineares)} × ${fator.toFixed(8)} = ` +
      `${volumeM3.toFixed(4)} m³`,
    resumo: `${volumeM3.toFixed(4)} m³ serão baixados do estoque`,
    saldoAposVenda: (saldoAtualM3: number) => {
      const saldoApos = arredondar(saldoAtualM3 - volumeM3, ESCALA_M3);
      const linearApos = m3ParaLinear(Math.max(0, saldoApos), espessuraM, larguraM);
      return `Saldo após venda: ${saldoApos.toFixed(4)} m³ (= ${formatarMetros(linearApos)} m lineares)`;
    },
  };
}

/**
 * Valida se as dimensões são suficientes para conversão.
 * Deve ser chamado ANTES de exibir a tela de venda de um item madeira.
 *
 * @param espessuraM espessura em metros
 * @param larguraM largura em metros
 */
export function dimensoesValidas(
  espessuraM: number | null | undefined,
  larguraM: number | null | undefined
): boolean {
  return (
    espessuraM != null &&
    larguraM != null &&
    espessuraM > 0 &&
    larguraM > 0
  );
}

/**
 * Formata número de metros para exibição com vírgula (padrão BR).
 */
export function formatarMetros(metros: number): string {
  return metros.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formata volume em m³ para exibição com 4 casas decimais.
 */
export function formatarM3(volumeM3: number): string {
  return volumeM3.toLocaleString('pt-BR', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}

/**
 * Formata dimensão para exibição: "50mm × 200mm" (converte de metros para mm).
 */
export function formatarDimensao(espessuraM: number, larguraM: number): string {
  return `${(espessuraM * 1000).toFixed(0)}mm × ${(larguraM * 1000).toFixed(0)}mm`;
}
