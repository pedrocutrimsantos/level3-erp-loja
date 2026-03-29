package br.com.madeireira.modules.cliente.application

import br.com.madeireira.modules.cliente.api.dto.AtualizarClienteRequest
import br.com.madeireira.modules.cliente.api.dto.ClienteResponse
import br.com.madeireira.modules.cliente.api.dto.CriarClienteRequest
import br.com.madeireira.modules.cliente.domain.model.Cliente
import br.com.madeireira.modules.cliente.domain.model.StatusInadimplencia
import br.com.madeireira.modules.cliente.domain.model.TipoPessoa
import br.com.madeireira.modules.cliente.infrastructure.ClienteRepository
import java.math.BigDecimal
import java.util.UUID

class ClienteService(private val repo: ClienteRepository) {

    suspend fun listar(apenasAtivos: Boolean = true): List<ClienteResponse> {
        val ativo = if (apenasAtivos) true else null
        return repo.findAll(ativo).map { toResponse(it) }
    }

    suspend fun buscarPorId(id: UUID): ClienteResponse {
        val cliente = repo.findById(id)
            ?: throw NoSuchElementException("Cliente não encontrado: $id")
        return toResponse(cliente)
    }

    suspend fun criar(req: CriarClienteRequest): ClienteResponse {
        require(req.razaoSocial.isNotBlank()) { "Nome/Razão social é obrigatório" }

        val tipo = try {
            TipoPessoa.valueOf(req.tipoPessoa.uppercase())
        } catch (e: IllegalArgumentException) {
            throw IllegalArgumentException("Tipo de pessoa inválido: '${req.tipoPessoa}'. Use PF ou PJ")
        }

        val cnpjCpf = req.cnpjCpf?.replace(Regex("\\D"), "")?.takeIf { it.isNotEmpty() }

        if (cnpjCpf != null && tipo == TipoPessoa.PF) {
            require(cnpjCpf.length == 11) { "CPF deve ter 11 dígitos" }
        }
        if (cnpjCpf != null && tipo == TipoPessoa.PJ) {
            require(cnpjCpf.length == 14) { "CNPJ deve ter 14 dígitos" }
        }

        if (cnpjCpf != null) {
            val existente = repo.findByCnpjCpf(cnpjCpf)
            require(existente == null) {
                "Já existe um cliente cadastrado com este ${if (tipo == TipoPessoa.PF) "CPF" else "CNPJ"}"
            }
        }

        val cliente = Cliente(
            id           = UUID.randomUUID(),
            tipoPessoa   = tipo,
            cnpjCpf      = cnpjCpf?.let { formatarDocumento(it, tipo) },
            razaoSocial  = req.razaoSocial.trim(),
            nomeFantasia = req.nomeFantasia?.trim()?.takeIf { it.isNotEmpty() },
            email        = req.email?.trim()?.takeIf { it.isNotEmpty() },
            telefone     = req.telefone?.trim()?.takeIf { it.isNotEmpty() },
            limiteCred   = BigDecimal.ZERO,
            saldoDevedor = BigDecimal.ZERO,
            statusInad   = StatusInadimplencia.REGULAR,
            ativo        = true,
        )

        return toResponse(repo.create(cliente))
    }

    suspend fun atualizar(id: UUID, req: AtualizarClienteRequest): ClienteResponse {
        require(req.razaoSocial.isNotBlank()) { "Nome/Razão social é obrigatório" }

        val cliente = repo.findById(id)
            ?: throw NoSuchElementException("Cliente não encontrado: $id")

        val atualizado = cliente.copy(
            razaoSocial  = req.razaoSocial.trim(),
            nomeFantasia = req.nomeFantasia?.trim()?.takeIf { it.isNotEmpty() },
            email        = req.email?.trim()?.takeIf { it.isNotEmpty() },
            telefone     = req.telefone?.trim()?.takeIf { it.isNotEmpty() },
        )

        return toResponse(repo.update(atualizado))
    }

    suspend fun inativar(id: UUID): ClienteResponse {
        val cliente = repo.findById(id)
            ?: throw NoSuchElementException("Cliente não encontrado: $id")
        return toResponse(repo.update(cliente.copy(ativo = false)))
    }

    private fun toResponse(c: Cliente) = ClienteResponse(
        id           = c.id.toString(),
        tipoPessoa   = c.tipoPessoa.name,
        cnpjCpf      = c.cnpjCpf,
        razaoSocial  = c.razaoSocial,
        nomeFantasia = c.nomeFantasia,
        email        = c.email,
        telefone     = c.telefone,
        limiteCred   = c.limiteCred.toPlainString(),
        saldoDevedor = c.saldoDevedor.toPlainString(),
        statusInad   = c.statusInad.name,
        ativo        = c.ativo,
    )

    private fun formatarDocumento(digits: String, tipo: TipoPessoa): String = when (tipo) {
        TipoPessoa.PF -> digits.replace(Regex("(\\d{3})(\\d{3})(\\d{3})(\\d{2})"), "$1.$2.$3-$4")
        TipoPessoa.PJ -> digits.replace(Regex("(\\d{2})(\\d{3})(\\d{3})(\\d{4})(\\d{2})"), "$1.$2.$3/$4-$5")
        else -> digits
    }
}
