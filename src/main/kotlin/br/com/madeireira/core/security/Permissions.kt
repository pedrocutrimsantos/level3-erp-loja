package br.com.madeireira.core.security

/**
 * MATRIZ COMPLETA DE PERMISSÕES POR PERFIL
 * Resolve a Pendência 4 do Agente 7.
 *
 * Formato: "MODULO:ACAO"
 * Esta matriz é a fonte da verdade para semente do banco e para
 * verificação em runtime via SecurityContext.
 */
object Permissions {

    // ── Módulos ────────────────────────────────────────────────────
    const val MOD_CAD = "CAD"
    const val MOD_EST = "EST"
    const val MOD_VEN = "VEN"
    const val MOD_COM = "COM"
    const val MOD_ENT = "ENT"
    const val MOD_FIN = "FIN"
    const val MOD_FIS = "FIS"
    const val MOD_REL = "REL"
    const val MOD_CFG = "CFG"

    // ── Ações ──────────────────────────────────────────────────────
    const val VISUALIZAR = "VISUALIZAR"
    const val CRIAR      = "CRIAR"
    const val EDITAR     = "EDITAR"
    const val EXCLUIR    = "EXCLUIR"
    const val APROVAR    = "APROVAR"
    const val EXPORTAR   = "EXPORTAR"

    // ── Permissões especiais de negócio ────────────────────────────
    const val VEN_DESCONTO_SUPERVISOR = "VEN:DESCONTO_SUPERVISOR"
    const val VEN_CANCELAR_NF         = "VEN:CANCELAR_NF"
    const val VEN_PRECO_ABAIXO_MINIMO = "VEN:PRECO_ABAIXO_MINIMO"
    const val EST_AJUSTE_ESTOQUE      = "EST:AJUSTE_ESTOQUE"
    const val EST_APROVAR_PERDA       = "EST:APROVAR_PERDA"
    const val FIS_CONFIGURAR_REGRAS   = "FIS:CONFIGURAR_REGRAS"
    const val FIS_EMITIR_NF           = "FIS:EMITIR_NF"
    const val CFG_ALTERAR_DIMENSAO    = "CFG:ALTERAR_DIMENSAO"
    const val FIN_RENEGOCIAR          = "FIN:RENEGOCIAR"
    const val CAI_ABRIR_FECHAR        = "CAI:ABRIR_FECHAR"
    const val CAI_SANGRIA_SUPRIMENTO  = "CAI:SANGRIA_SUPRIMENTO"

    /**
     * Permissão composta: "MODULO:ACAO"
     */
    fun of(modulo: String, acao: String) = "$modulo:$acao"

    /**
     * MATRIZ DE PERMISSÕES POR PERFIL
     *
     * Legenda:
     * VENDEDOR    = Operador de balcão (dia a dia de vendas)
     * SUPERVISOR  = Supervisiona o balcão (autoriza exceções)
     * GERENTE     = Acesso gerencial completo
     * ESTOQUE     = Operador de estoque/galpão
     * FISCAL      = Responsável fiscal (NF, parametrização)
     * FINANCEIRO  = Responsável financeiro
     * ADMIN       = Acesso total ao sistema
     */
    private const val CANCELAR_VENDA = "VEN:CANCELAR"

    val matrizPermissoes: Map<String, Set<String>> = mapOf(

        "VENDEDOR" to setOf(
            // Vendas
            of(MOD_VEN, VISUALIZAR), of(MOD_VEN, CRIAR),
            // Não pode: EDITAR venda confirmada, EXCLUIR, APROVAR
            // Cadastros (apenas leitura)
            of(MOD_CAD, VISUALIZAR),
            // Estoque (apenas consulta de saldo)
            of(MOD_EST, VISUALIZAR),
            // Clientes (pode criar/editar para agilidade no balcão)
            "CAD:CLIENTE:CRIAR", "CAD:CLIENTE:EDITAR",
            // Financeiro: apenas ver os seus títulos
            of(MOD_FIN, VISUALIZAR),
            // Caixa: pode ver e receber pagamentos
            CAI_ABRIR_FECHAR,
        ),

        "SUPERVISOR" to setOf(
            // Tudo do VENDEDOR +
            of(MOD_VEN, VISUALIZAR), of(MOD_VEN, CRIAR), of(MOD_VEN, EDITAR),
            CANCELAR_VENDA,
            // Permissões especiais de negócio
            VEN_DESCONTO_SUPERVISOR,
            VEN_PRECO_ABAIXO_MINIMO,
            VEN_CANCELAR_NF,
            // Estoque: pode registrar ajustes e aprovar perdas pequenas
            of(MOD_EST, VISUALIZAR), of(MOD_EST, CRIAR),
            EST_AJUSTE_ESTOQUE,
            EST_APROVAR_PERDA,
            // Cadastros: leitura
            of(MOD_CAD, VISUALIZAR),
            // Financeiro: visualizar
            of(MOD_FIN, VISUALIZAR),
            // Caixa
            CAI_ABRIR_FECHAR, CAI_SANGRIA_SUPRIMENTO,
        ),

        "GERENTE" to setOf(
            // Todos os módulos — leitura e criação
            of(MOD_VEN, VISUALIZAR), of(MOD_VEN, CRIAR), of(MOD_VEN, EDITAR),
            of(MOD_VEN, EXCLUIR), of(MOD_VEN, APROVAR), of(MOD_VEN, EXPORTAR),
            of(MOD_COM, VISUALIZAR), of(MOD_COM, CRIAR), of(MOD_COM, EDITAR), of(MOD_COM, APROVAR),
            of(MOD_EST, VISUALIZAR), of(MOD_EST, CRIAR), of(MOD_EST, EDITAR), of(MOD_EST, EXPORTAR),
            of(MOD_CAD, VISUALIZAR), of(MOD_CAD, CRIAR), of(MOD_CAD, EDITAR),
            of(MOD_ENT, VISUALIZAR), of(MOD_ENT, CRIAR), of(MOD_ENT, EDITAR),
            of(MOD_FIN, VISUALIZAR), of(MOD_FIN, CRIAR), of(MOD_FIN, EDITAR), of(MOD_FIN, EXPORTAR),
            of(MOD_REL, VISUALIZAR), of(MOD_REL, EXPORTAR),
            // Permissões de negócio
            VEN_DESCONTO_SUPERVISOR, VEN_PRECO_ABAIXO_MINIMO, VEN_CANCELAR_NF,
            EST_AJUSTE_ESTOQUE, EST_APROVAR_PERDA,
            FIN_RENEGOCIAR,
            CAI_ABRIR_FECHAR, CAI_SANGRIA_SUPRIMENTO,
            CFG_ALTERAR_DIMENSAO,
        ),

        "ESTOQUE" to setOf(
            of(MOD_EST, VISUALIZAR), of(MOD_EST, CRIAR), of(MOD_EST, EDITAR),
            EST_AJUSTE_ESTOQUE,
            of(MOD_COM, VISUALIZAR), of(MOD_COM, CRIAR), // receber compras
            of(MOD_CAD, VISUALIZAR),
            of(MOD_ENT, VISUALIZAR), of(MOD_ENT, EDITAR), // separação e confirmação
        ),

        "FISCAL" to setOf(
            of(MOD_FIS, VISUALIZAR), of(MOD_FIS, CRIAR), of(MOD_FIS, EDITAR),
            FIS_CONFIGURAR_REGRAS, FIS_EMITIR_NF,
            VEN_CANCELAR_NF,
            of(MOD_VEN, VISUALIZAR),
            of(MOD_COM, VISUALIZAR),
            of(MOD_CAD, VISUALIZAR),
            of(MOD_REL, VISUALIZAR), of(MOD_REL, EXPORTAR),
        ),

        "FINANCEIRO" to setOf(
            of(MOD_FIN, VISUALIZAR), of(MOD_FIN, CRIAR), of(MOD_FIN, EDITAR),
            of(MOD_FIN, EXPORTAR),
            FIN_RENEGOCIAR,
            of(MOD_VEN, VISUALIZAR),
            of(MOD_COM, VISUALIZAR),
            of(MOD_REL, VISUALIZAR), of(MOD_REL, EXPORTAR),
            CAI_ABRIR_FECHAR, CAI_SANGRIA_SUPRIMENTO,
        ),

        "ADMIN" to setOf("*"), // curinga: acesso total
    )

    // ── Constantes para ações específicas não cobertas pelo padrão ─
    // (CANCELAR_VENDA movido para antes de matrizPermissoes para evitar erro de inicialização)

    /**
     * Verifica se um perfil possui uma permissão específica.
     * Admin tem acesso a tudo via curinga "*".
     */
    fun perfilTemPermissao(codigoPerfil: String, permissao: String): Boolean {
        val perms = matrizPermissoes[codigoPerfil] ?: return false
        return perms.contains("*") || perms.contains(permissao)
    }
}
