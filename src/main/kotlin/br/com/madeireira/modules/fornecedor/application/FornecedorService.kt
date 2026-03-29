package br.com.madeireira.modules.fornecedor.application

import br.com.madeireira.modules.fornecedor.api.dto.CriarFornecedorRequest
import br.com.madeireira.modules.fornecedor.api.dto.FornecedorResponse
import br.com.madeireira.modules.fornecedor.domain.model.Fornecedor
import br.com.madeireira.modules.fornecedor.infrastructure.FornecedorRepository
import java.util.UUID

class FornecedorService(private val repo: FornecedorRepository) {

    suspend fun listar(ativo: Boolean? = true): List<FornecedorResponse> =
        repo.findAll(ativo).map { toResponse(it) }

    suspend fun buscarPorId(id: UUID): FornecedorResponse =
        repo.findById(id)?.let { toResponse(it) }
            ?: throw NoSuchElementException("Fornecedor não encontrado: $id")

    suspend fun criar(req: CriarFornecedorRequest): FornecedorResponse {
        require(req.cnpjCpf.isNotBlank()) { "CNPJ/CPF obrigatório" }
        require(req.razaoSocial.isNotBlank()) { "Razão social obrigatória" }
        require(req.tipoPessoa in listOf("PF", "PJ")) { "tipoPessoa deve ser PF ou PJ" }

        val fornecedor = Fornecedor(
            id                = UUID.randomUUID(),
            tipoPessoa        = req.tipoPessoa,
            cnpjCpf           = req.cnpjCpf.trim(),
            razaoSocial       = req.razaoSocial.trim(),
            nomeFantasia      = req.nomeFantasia?.trim(),
            inscricaoEstadual = req.inscricaoEstadual?.trim(),
            email             = req.email?.trim(),
            telefone          = req.telefone?.trim(),
            uf                = req.uf?.trim()?.uppercase() ?: "",
            cep               = req.cep?.trim() ?: "",
            logradouro        = req.logradouro?.trim() ?: "",
            numero            = req.numero?.trim() ?: "",
            bairro            = req.bairro?.trim() ?: "",
            cidade            = req.cidade?.trim() ?: "",
            ativo             = true,
        )
        return toResponse(repo.create(fornecedor))
    }

    private fun toResponse(f: Fornecedor) = FornecedorResponse(
        id           = f.id.toString(),
        tipoPessoa   = f.tipoPessoa,
        cnpjCpf      = f.cnpjCpf,
        razaoSocial  = f.razaoSocial,
        nomeFantasia = f.nomeFantasia,
        email        = f.email,
        telefone     = f.telefone,
        uf           = f.uf.ifBlank { null },
        cidade       = f.cidade.ifBlank { null },
        ativo        = f.ativo,
    )
}
