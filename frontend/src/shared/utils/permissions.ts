/**
 * Matriz de permissões do frontend — espelho fiel de Permissions.kt.
 * O backend é a fonte autoritativa (retorna 403 se negado).
 * Este módulo serve apenas para UX: esconder botões/ações inacessíveis.
 *
 * IMPORTANTE: ao adicionar perfis ou permissões no backend, atualizar aqui também.
 */

export type Perfil =
  | 'VENDEDOR'
  | 'SUPERVISOR'
  | 'GERENTE'
  | 'ESTOQUE'
  | 'FISCAL'
  | 'FINANCEIRO'
  | 'ADMIN'

// ── Permissões compostas (módulo:ação) ───────────────────────────────────────

const p = (modulo: string, acao: string) => `${modulo}:${acao}`

// Módulos
const CAD = 'CAD'
const EST = 'EST'
const VEN = 'VEN'
const COM = 'COM'
const ENT = 'ENT'
const FIN = 'FIN'
const FIS = 'FIS'
const REL = 'REL'
const CFG = 'CFG'

// Ações
const VER     = 'VISUALIZAR'
const CRIAR   = 'CRIAR'
const EDITAR  = 'EDITAR'
const EXCLUIR = 'EXCLUIR'
const APROVAR = 'APROVAR'
const EXPORTAR = 'EXPORTAR'

// Permissões especiais de negócio
export const Perms = {
  // Relatórios
  REL_VER:     p(REL, VER),
  REL_EXPORTAR: p(REL, EXPORTAR),

  // Vendas
  VEN_VER:     p(VEN, VER),
  VEN_CRIAR:   p(VEN, CRIAR),
  VEN_EDITAR:  p(VEN, EDITAR),
  VEN_EXCLUIR: p(VEN, EXCLUIR),
  VEN_APROVAR: p(VEN, APROVAR),
  VEN_CANCELAR:            'VEN:CANCELAR',
  VEN_CANCELAR_NF:         'VEN:CANCELAR_NF',
  VEN_DESCONTO_SUPERVISOR: 'VEN:DESCONTO_SUPERVISOR',
  VEN_PRECO_ABAIXO_MINIMO: 'VEN:PRECO_ABAIXO_MINIMO',

  // Cadastros
  CAD_VER:     p(CAD, VER),
  CAD_CRIAR:   p(CAD, CRIAR),
  CAD_EDITAR:  p(CAD, EDITAR),
  CAD_EXCLUIR: p(CAD, EXCLUIR),
  CAD_CLIENTE_CRIAR: 'CAD:CLIENTE:CRIAR',
  CAD_CLIENTE_EDITAR: 'CAD:CLIENTE:EDITAR',

  // Estoque
  EST_VER:    p(EST, VER),
  EST_CRIAR:  p(EST, CRIAR),
  EST_EDITAR: p(EST, EDITAR),
  EST_AJUSTE: 'EST:AJUSTE_ESTOQUE',
  EST_APROVAR_PERDA: 'EST:APROVAR_PERDA',

  // Compras
  COM_VER:   p(COM, VER),
  COM_CRIAR: p(COM, CRIAR),

  // Entregas
  ENT_VER:    p(ENT, VER),
  ENT_CRIAR:  p(ENT, CRIAR),
  ENT_EDITAR: p(ENT, EDITAR),

  // Financeiro
  FIN_VER:    p(FIN, VER),
  FIN_CRIAR:  p(FIN, CRIAR),
  FIN_EDITAR: p(FIN, EDITAR),
  FIN_RENEGOCIAR: 'FIN:RENEGOCIAR',
  CAI_ABRIR_FECHAR:       'CAI:ABRIR_FECHAR',
  CAI_SANGRIA_SUPRIMENTO: 'CAI:SANGRIA_SUPRIMENTO',

  // Fiscal
  FIS_VER:    p(FIS, VER),
  FIS_CRIAR:  p(FIS, CRIAR),
  FIS_EDITAR: p(FIS, EDITAR),
  FIS_EMITIR_NF:        'FIS:EMITIR_NF',
  FIS_CONFIGURAR_REGRAS: 'FIS:CONFIGURAR_REGRAS',

  // Configurações
  CFG_VER:    p(CFG, VER),
  CFG_CRIAR:  p(CFG, CRIAR),
  CFG_EDITAR: p(CFG, EDITAR),
  CFG_ALTERAR_DIMENSAO: 'CFG:ALTERAR_DIMENSAO',
} as const

export type Permissao = (typeof Perms)[keyof typeof Perms]

// ── Matriz por perfil ────────────────────────────────────────────────────────

const matrizPermissoes: Record<Perfil, Set<string>> = {
  VENDEDOR: new Set([
    Perms.VEN_VER, Perms.VEN_CRIAR,
    Perms.CAD_VER,
    Perms.EST_VER,
    Perms.CAD_CLIENTE_CRIAR, Perms.CAD_CLIENTE_EDITAR,
    Perms.FIN_VER,
    Perms.CAI_ABRIR_FECHAR,
  ]),

  SUPERVISOR: new Set([
    Perms.VEN_VER, Perms.VEN_CRIAR, Perms.VEN_EDITAR,
    Perms.VEN_CANCELAR,
    Perms.VEN_DESCONTO_SUPERVISOR,
    Perms.VEN_PRECO_ABAIXO_MINIMO,
    Perms.VEN_CANCELAR_NF,
    Perms.EST_VER, Perms.EST_CRIAR,
    Perms.EST_AJUSTE, Perms.EST_APROVAR_PERDA,
    Perms.CAD_VER,
    Perms.CAD_CLIENTE_CRIAR, Perms.CAD_CLIENTE_EDITAR,
    Perms.FIN_VER,
    Perms.CAI_ABRIR_FECHAR, Perms.CAI_SANGRIA_SUPRIMENTO,
  ]),

  GERENTE: new Set([
    Perms.VEN_VER, Perms.VEN_CRIAR, Perms.VEN_EDITAR,
    Perms.VEN_EXCLUIR, Perms.VEN_APROVAR,
    Perms.COM_VER, Perms.COM_CRIAR,
    Perms.EST_VER, Perms.EST_CRIAR, Perms.EST_EDITAR,
    Perms.CAD_VER, Perms.CAD_CRIAR, Perms.CAD_EDITAR,
    Perms.CAD_CLIENTE_CRIAR, Perms.CAD_CLIENTE_EDITAR,
    Perms.ENT_VER, Perms.ENT_CRIAR, Perms.ENT_EDITAR,
    Perms.FIN_VER, Perms.FIN_CRIAR, Perms.FIN_EDITAR,
    Perms.REL_VER, Perms.REL_EXPORTAR,
    Perms.VEN_DESCONTO_SUPERVISOR, Perms.VEN_PRECO_ABAIXO_MINIMO, Perms.VEN_CANCELAR_NF,
    Perms.EST_AJUSTE, Perms.EST_APROVAR_PERDA,
    Perms.FIN_RENEGOCIAR,
    Perms.CAI_ABRIR_FECHAR, Perms.CAI_SANGRIA_SUPRIMENTO,
    Perms.CFG_ALTERAR_DIMENSAO,
  ]),

  ESTOQUE: new Set([
    Perms.EST_VER, Perms.EST_CRIAR, Perms.EST_EDITAR,
    Perms.EST_AJUSTE,
    Perms.COM_VER, Perms.COM_CRIAR,
    Perms.CAD_VER,
    Perms.ENT_VER, Perms.ENT_EDITAR,
  ]),

  FISCAL: new Set([
    Perms.FIS_VER, Perms.FIS_CRIAR, Perms.FIS_EDITAR,
    Perms.FIS_CONFIGURAR_REGRAS, Perms.FIS_EMITIR_NF,
    Perms.VEN_CANCELAR_NF,
    Perms.VEN_VER,
    Perms.COM_VER,
    Perms.CAD_VER,
    Perms.REL_VER, Perms.REL_EXPORTAR,
  ]),

  FINANCEIRO: new Set([
    Perms.FIN_VER, Perms.FIN_CRIAR, Perms.FIN_EDITAR,
    Perms.FIN_RENEGOCIAR,
    Perms.VEN_VER,
    Perms.COM_VER,
    Perms.REL_VER, Perms.REL_EXPORTAR,
    Perms.CAI_ABRIR_FECHAR, Perms.CAI_SANGRIA_SUPRIMENTO,
  ]),

  ADMIN: new Set(['*']),
}

/** Verifica se o perfil tem a permissão. ADMIN tem tudo via curinga. */
export function perfilTemPermissao(perfil: string | null, permissao: string): boolean {
  if (!perfil) return false
  const perms = matrizPermissoes[perfil as Perfil]
  if (!perms) return false
  return perms.has('*') || perms.has(permissao)
}
