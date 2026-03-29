package br.com.madeireira.core.architecture

import com.tngtech.archunit.core.domain.JavaClasses
import com.tngtech.archunit.core.importer.ClassFileImporter
import com.tngtech.archunit.core.importer.ImportOption
import com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses
import com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes
import com.tngtech.archunit.library.Architectures.layeredArchitecture
import io.kotest.core.spec.style.FunSpec

/**
 * TESTES DE ARQUITETURA
 * Resolve a Pendência 5 do Agente 7.
 *
 * Garante que as regras arquiteturais definidas pelo Agente 6 sejam
 * enforçadas em tempo de build — não apenas por convenção.
 *
 * REGRA DE OURO: ConversionEngine é o único lugar da fórmula m³↔m linear.
 */
class ArchitectureTest : FunSpec({

    val classes: JavaClasses = ClassFileImporter()
        .withImportOption(ImportOption.DoNotIncludeTests())
        .importPackages("br.com.madeireira")

    test("ConversionEngine só pode ser chamado de classes autorizadas") {
        /*
         * A fórmula m³↔metro linear só pode existir em ConversionEngine.
         * Nenhum outro service, controller ou repository pode chamar
         * BigDecimal multiply/divide diretamente em campos de dimensão.
         *
         * Classes autorizadas a chamar ConversionEngine diretamente:
         * - Services do pacote application/
         * - Próprio ConversionEngine
         */
        val regra = noClasses()
            .that().resideInAPackage("..infrastructure..")
            .or().resideInAPackage("..api..")
            .should().dependOnClassesThat()
            .haveFullyQualifiedClassName(
                "br.com.madeireira.core.conversion.ConversionEngine"
            )
            .because(
                "ConversionEngine só pode ser chamado de classes de application/. " +
                "Controllers e repositórios não devem realizar conversão de unidades diretamente."
            )

        regra.check(classes)
    }

    test("Classes de domínio não dependem de infraestrutura") {
        val regra = noClasses()
            .that().resideInAPackage("..domain..")
            .should().dependOnClassesThat()
            .resideInAPackage("..infrastructure..")
            .because(
                "Regra de Clean Architecture: domínio não conhece infraestrutura. " +
                "Use portas (interfaces) para inversão de dependência."
            )

        regra.check(classes)
    }

    test("Módulos não importam classes internas uns dos outros diretamente") {
        val modulosProibidos = listOf("vendas", "estoque", "compras", "fiscal", "financeiro", "entregas")

        modulosProibidos.forEach { moduloA ->
            modulosProibidos.filter { it != moduloA }.forEach { moduloB ->
                val regra = noClasses()
                    .that().resideInAPackage("..${moduloA}.domain..")
                    .or().resideInAPackage("..${moduloA}.application..")
                    .should().dependOnClassesThat()
                    .resideInAPackage("..${moduloB}.domain..")
                    .because(
                        "Módulo '$moduloA' não pode importar classes internas do módulo '$moduloB'. " +
                        "Use DTOs, Value Objects ou ports para comunicação entre módulos."
                    )
                regra.check(classes)
            }
        }
    }

    test("Módulo fiscal não acessa repositórios de estoque diretamente") {
        val regra = noClasses()
            .that().resideInAPackage("..fiscal..")
            .should().dependOnClassesThat()
            .haveSimpleNameEndingWith("EstoqueRepository")
            .orShould().dependOnClassesThat()
            .haveSimpleNameEndingWith("SubloteRepository")
            .because(
                "O módulo fiscal é desacoplado do estoque. " +
                "Comunicação via FiscalPort e eventos de domínio apenas."
            )
        regra.check(classes)
    }

    test("NfEmissaoPort só é implementado na camada de adapters") {
        val regra = classes()
            .that().implement(
                com.tngtech.archunit.core.domain.JavaClass.Predicates.assignableTo(
                    Class.forName("br.com.madeireira.fiscal.ports.NfEmissaoPort")
                )
            )
            .should().resideInAPackage("..fiscal.adapters..")
            .because(
                "Implementações de NfEmissaoPort devem ficar em fiscal/adapters/. " +
                "O core não pode depender de implementações concretas do emissor externo."
            )
        regra.check(classes)
    }

    test("Audit log não é chamado de controllers") {
        val regra = noClasses()
            .that().resideInAPackage("..api..")
            .should().dependOnClassesThat()
            .haveSimpleName("AuditLogger")
            .because(
                "AuditLogger deve ser chamado apenas da camada de application (services). " +
                "Controllers não têm contexto de negócio suficiente para auditar."
            )
        regra.check(classes)
    }

    test("Arquitetura em camadas é respeitada por módulo") {
        layeredArchitecture()
            .consideringAllDependencies()
            .layer("API").definedBy("..api..")
            .layer("Application").definedBy("..application..")
            .layer("Domain").definedBy("..domain..")
            .layer("Infrastructure").definedBy("..infrastructure..")
            .layer("Core").definedBy("br.com.madeireira.core..")
            .whereLayer("API").mayNotBeAccessedByAnyLayer()
            .whereLayer("Application").mayOnlyBeAccessedByLayers("API")
            .whereLayer("Domain").mayOnlyBeAccessedByLayers("Application", "API")
            .whereLayer("Infrastructure").mayOnlyBeAccessedByLayers("Application")
            .check(classes)
    }
})
