# Shopping das Madeiras — ERP

Sistema de gestão completo para madeireiras e lojas de materiais de construção. Desenvolvido em Kotlin/Ktor no backend e React/TypeScript no frontend, com foco em controle de estoque de madeira (m³/metro linear), vendas no balcão, entregas, fiscal e financeiro.

---

## Sumário

- [Visão Geral](#visão-geral)
- [Stack Tecnológica](#stack-tecnológica)
- [Módulos do Sistema](#módulos-do-sistema)
- [API — Endpoints](#api--endpoints)
- [Banco de Dados](#banco-de-dados)
- [Rodando Localmente](#rodando-localmente)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Deploy no Railway](#deploy-no-railway)
- [Arquitetura](#arquitetura)

---

## Visão Geral

O sistema cobre todo o ciclo operacional de uma madeireira:

- **PDV (Ponto de Venda)** com suporte a venda por metro linear, m³ ou peça
- **Controle de estoque** com rastreamento de lotes, espécies e dimensões
- **Entregas agendadas** com romaneio em PDF
- **Financeiro** com contas a receber/pagar, caixa por turno e fluxo de caixa
- **NF-e** com stub de emissão (pronto para integração com Focus/SEFAZ)
- **Relatórios exportáveis** em Excel e PDF
- **Dashboard** com KPIs do dia/mês e gráfico de vendas dos últimos 30 dias

---

## Stack Tecnológica

### Backend

| Tecnologia | Versão | Uso |
|---|---|---|
| Kotlin | 1.9.25 | Linguagem principal |
| Ktor | 2.3.12 | Framework HTTP |
| Exposed | 0.44.1 | ORM (Kotlin DSL) |
| PostgreSQL | 42.7.3 (driver) | Banco de dados |
| HikariCP | 5.1.0 | Connection pool |
| Flyway | 10.10.0 | Migrations |
| kotlinx-serialization | 1.6.3 | JSON |
| kotlinx-datetime | 0.5.0 | Datas/horários |
| Kotest | 5.8.1 | Testes |
| ArchUnit | 1.2.1 | Testes de arquitetura |
| JVM target | 17 | Runtime |

### Frontend

| Tecnologia | Versão | Uso |
|---|---|---|
| React | 18.2.0 | UI |
| TypeScript | 5.3.3 | Tipagem |
| Vite | 5.0.11 | Build/Dev server |
| React Router | 6.21.3 | Roteamento SPA |
| TanStack Query | 5.17.0 | Cache e fetching |
| Axios | 1.6.5 | Cliente HTTP |
| Tailwind CSS | 3.4.1 | Estilização |
| Radix UI | — | Componentes acessíveis |
| Recharts | 2.10.3 | Gráficos |
| jsPDF + autotable | 4.2.1 | Exportação PDF |
| SheetJS (XLSX) | 0.18.5 | Exportação Excel |
| Lucide React | 0.312.0 | Ícones |
| Vitest | — | Testes |

### Infraestrutura

| Tecnologia | Uso |
|---|---|
| Docker (multi-stage) | Containerização do backend |
| nginx (Alpine) | Servir o frontend em produção |
| Railway | PaaS para deploy |
| PostgreSQL (Railway plugin) | Banco em produção |

---

## Módulos do Sistema

### 1. Produto
Catálogo de produtos com dois tipos: **MADEIRA** (com dimensões em metros e controle de conversão m³ ↔ metro linear) e **NORMAL** (com unidade de venda livre).

**Funcionalidades:**
- Cadastro com espécie, dimensões (espessura × largura em metros), comprimento de peça
- Precificação com custo, margem e preço de venda
- Flag `controlarConversaoMadeira` para habilitar/desabilitar conversão automática
- Unidades separadas para compra, estoque e fiscal

### 2. Estoque
Controle de saldo por produto e depósito, com rastreamento de lotes de madeira.

**Funcionalidades:**
- Saldo em m³ (físico) e metro linear (calculado em runtime)
- Rastreamento por sublote (espécie + dimensão + lote)
- Ajuste manual com motivo
- Histórico completo de movimentações com 13 tipos: `ENTRADA_COMPRA`, `SAIDA_VENDA`, `AJUSTE_POSITIVO`, `AJUSTE_NEGATIVO`, `DEVOLUCAO_CLIENTE`, etc.

### 3. Venda
PDV completo para venda no balcão, orçamentos e histórico.

**Funcionalidades:**
- Venda por metro linear, m³ ou peça (com conversão automática)
- Formas de pagamento: Dinheiro, PIX, Cartão Débito/Crédito, Boleto, Cheque, FIADO
- FIADO com data de vencimento (gera título a receber automaticamente)
- Orçamentos: criação, confirmação (debita estoque) e cancelamento
- Status de venda: `RASCUNHO → ORCAMENTO → CONFIRMADO → EM_ENTREGA → CONCLUIDO`

### 4. Entregas
Agendamento e controle de romaneios de entrega gerados a partir de vendas confirmadas.

**Funcionalidades:**
- Geração de romaneio a partir de venda com status `CONFIRMADO` ou `ENTREGUE_PARCIAL`
- Agendamento com data prevista e turno (Manhã / Tarde / Dia todo)
- Campo de motorista responsável
- Confirmação parcial de itens entregues
- Cancelamento com reversão automática do status da venda
- Impressão de romaneio em PDF (com tabela de itens, totais e campo de assinatura)
- Filtros por status: Todas / Pendentes / Concluídas / Canceladas

### 5. Compras
Registro de entradas de mercadoria com atualização automática de estoque.

**Funcionalidades:**
- Entrada com seleção de fornecedor, depósito e itens
- Toggle "Informar em m³" / "Informar em peças" para madeira
- Cálculo em tempo real de m³ e metros lineares
- Geração de título a pagar automaticamente

### 6. Clientes
CRUD completo de clientes com suporte a pessoa física e jurídica.

**Funcionalidades:**
- Tipos: PF, PJ, Anônimo (consumidor final)
- Múltiplos endereços por cliente
- Limite de crédito e saldo devedor
- Status de inadimplência: `REGULAR`, `ALERTA`, `BLOQUEADO`

### 7. Fornecedores
Cadastro de fornecedores com dados de contato.

### 8. Financeiro
Gestão de caixa por turno, contas a receber/pagar e fluxo de caixa.

**Funcionalidades:**
- Abertura/fechamento de turno de caixa com resumo por forma de pagamento
- Sangria (retirada de caixa)
- Títulos a receber (gerados por vendas FIADO) e a pagar (gerados por compras)
- Baixa de título com registro de pagamento
- Projeção de fluxo de caixa (7 a 30 dias)

### 9. Fiscal (NF-e)
Emissão e controle de notas fiscais eletrônicas.

**Funcionalidades:**
- Listagem de vendas pendentes de NF-e
- Emissão com stub (simula SEFAZ — gera chave de acesso real de 44 dígitos)
- Cancelamento de NF-e emitida
- Statuses: `PENDENTE`, `AUTORIZADA`, `REJEITADA`, `CANCELADA`
- Arquitetura Port/Adapter: `NfEmissaoStub` → substituível por `FocusNFeAdapter`

### 10. Relatórios
Dashboard executivo e exportação de relatórios.

**Funcionalidades:**
- Dashboard com KPIs: faturamento dia/mês, qtd vendas, títulos a receber, estoque crítico
- Gráfico de barras — vendas dos últimos 30 dias (Recharts + tema adaptativo)
- Top 5 produtos por valor vendido
- Top 5 produtos com estoque crítico
- Exportação: Vendas (período), Estoque (snapshot) e Fluxo de Caixa — Excel e PDF

---

## API — Endpoints

Base URL: `http://localhost:8080/api/v1`

### Produtos
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/produtos` | Listar produtos (query: `ativo`) |
| `GET` | `/produtos/{id}` | Detalhe do produto |
| `POST` | `/produtos` | Criar produto |
| `PUT` | `/produtos/{id}` | Atualizar produto |
| `DELETE` | `/produtos/{id}` | Desativar produto |
| `GET` | `/produtos/unidades` | Listar unidades de medida |
| `PATCH` | `/produtos/{id}/preco` | Atualizar preço |
| `PUT` | `/produtos/{id}/dimensao` | Atualizar dimensões da madeira |
| `GET` | `/produtos/{id}/precificacao` | Buscar estratégia de preço |
| `PUT` | `/produtos/{id}/precificacao` | Salvar estratégia de preço |

### Estoque
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/estoque/saldo/{produtoId}` | Saldo atual |
| `GET` | `/estoque/movimentacoes` | Histórico de movimentações |
| `POST` | `/estoque/ajuste` | Ajuste manual |

### Vendas
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/vendas` | Listar vendas |
| `GET` | `/vendas/{id}` | Detalhe da venda |
| `POST` | `/vendas/balcao` | Registrar venda balcão |
| `GET` | `/vendas/orcamentos` | Listar orçamentos |
| `POST` | `/vendas/orcamentos` | Criar orçamento |
| `POST` | `/vendas/orcamentos/{id}/confirmar` | Confirmar orçamento |
| `DELETE` | `/vendas/orcamentos/{id}` | Cancelar orçamento |
| `GET` | `/vendas/{id}/itens` | Itens retornáveis |
| `POST` | `/vendas/{id}/devolver` | Registrar devolução |
| `POST` | `/vendas/{id}/entrega` | Gerar romaneio de entrega |

### Entregas
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/entregas` | Listar entregas |
| `GET` | `/entregas/{id}` | Detalhe da entrega |
| `POST` | `/entregas/{id}/confirmar` | Confirmar itens entregues |
| `POST` | `/entregas/{id}/cancelar` | Cancelar entrega |

### Compras
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/compras/entradas` | Listar entradas |
| `POST` | `/compras/entrada` | Registrar entrada |

### Clientes
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/clientes` | Listar clientes |
| `GET` | `/clientes/{id}` | Detalhe do cliente |
| `POST` | `/clientes` | Criar cliente |
| `PUT` | `/clientes/{id}` | Atualizar cliente |
| `DELETE` | `/clientes/{id}` | Desativar cliente |

### Fornecedores
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/fornecedores` | Listar fornecedores |
| `GET` | `/fornecedores/{id}` | Detalhe |
| `POST` | `/fornecedores` | Criar fornecedor |

### Financeiro
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/titulos` | Listar títulos (query: `tipo`, `status`) |
| `POST` | `/titulos` | Criar título manual |
| `POST` | `/titulos/{id}/baixa` | Registrar pagamento |
| `GET` | `/financeiro/caixa` | Resumo do caixa do dia |
| `GET` | `/financeiro/turno` | Turno atual |
| `POST` | `/financeiro/turno/abrir` | Abrir turno |
| `POST` | `/financeiro/turno/fechar` | Fechar turno |
| `POST` | `/financeiro/turno/sangria` | Sangria |

### Fiscal
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/fiscal/nfe` | Listar NF-e |
| `GET` | `/fiscal/nfe/pendentes` | Vendas sem NF-e |
| `POST` | `/fiscal/nfe/emitir` | Emitir NF-e |
| `POST` | `/fiscal/nfe/{id}/cancelar` | Cancelar NF-e |

### Relatórios
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/relatorios/dashboard` | KPIs e gráfico |
| `GET` | `/relatorios/vendas` | Relatório de vendas (query: `dataInicio`, `dataFim`) |
| `GET` | `/relatorios/estoque` | Snapshot de estoque |
| `GET` | `/relatorios/fluxo-caixa` | Fluxo de caixa (query: `dataInicio`, `dataFim`) |

---

## Banco de Dados

PostgreSQL com 20 migrations Flyway aplicadas em ordem.

### Principais tabelas

| Tabela | Descrição |
|---|---|
| `produto` | Catálogo base de produtos |
| `produto_madeira` | Extensão com espécie, dimensões, comprimento de peça |
| `produto_normal` | Extensão com unidade de venda |
| `dimensao_madeira` | Dimensões versionadas (espessura × largura em metros) |
| `deposito` | Depósitos/almoxarifados |
| `estoque_saldo` | Saldo atual por produto/depósito |
| `movimentacao_estoque` | Log imutável de todas as movimentações |
| `lote_madeira` / `sublote_madeira` | Rastreamento de lotes por espécie/dimensão |
| `venda` / `item_venda` | Vendas e itens com status de entrega por item |
| `compra` / `item_compra` | Entradas de mercadoria |
| `entrega` | Romaneios de entrega agendados |
| `devolucao` / `item_devolucao` | Devoluções de clientes |
| `cliente` / `cliente_endereco` | Cadastro de clientes |
| `fornecedor` | Cadastro de fornecedores |
| `titulo` / `parcela` | Contas a receber e a pagar |
| `turno_caixa` / `movimentacao_caixa` | Controle de caixa por turno |
| `nf_emitida` | Notas fiscais eletrônicas |
| `preco_produto` | Histórico de preços |

### Enums relevantes

```sql
-- Status da venda
RASCUNHO | ORCAMENTO | CONFIRMADO | EM_ENTREGA | ENTREGUE_PARCIAL | CONCLUIDO | CANCELADO | DEVOLVIDO_PARCIAL | DEVOLVIDO

-- Status da entrega
PENDENTE | CONCLUIDA | CANCELADA

-- Turno de entrega
MANHA | TARDE | DIA_TODO

-- Status por item
PENDENTE | ENTREGUE | DEVOLVIDO

-- Forma de pagamento
DINHEIRO | CARTAO_DEBITO | CARTAO_CREDITO | PIX | BOLETO | CHEQUE | FIADO

-- Status NF-e
PENDENTE | AGUARDANDO | AUTORIZADA | REJEITADA | CANCELADA
```

---

## Rodando Localmente

### Pré-requisitos

- JDK 17+
- PostgreSQL 12+
- Node.js 20+
- Gradle (ou usar o wrapper `./gradlew`)

### 1. Banco de dados

```bash
createdb madeireira
```

### 2. Backend

Crie um arquivo `.env` na raiz do projeto:

```env
DB_URL=jdbc:postgresql://localhost:5432/madeireira
DB_USER=postgres
DB_PASSWORD=admin
```

Execute o backend:

```bash
./gradlew run
# Disponível em http://localhost:8080
# Flyway aplica as migrations automaticamente na primeira execução
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
# Disponível em http://localhost:5173
# /api é automaticamente redirecionado para http://localhost:8080
```

### Outros comandos úteis

```bash
# Testes do backend
./gradlew test

# Build de produção do backend
./gradlew installDist
./build/install/level3-loja-madeira/bin/level3-loja-madeira

# Build de produção do frontend
cd frontend && npm run build   # gera frontend/dist/
npm run lint                   # verificação de código
npm run test                   # testes com Vitest
```

---

## Variáveis de Ambiente

### Backend

| Variável | Padrão | Descrição |
|---|---|---|
| `DB_URL` | `jdbc:postgresql://localhost:5432/madeireira` | JDBC connection string |
| `DB_USER` | `postgres` | Usuário do banco |
| `DB_PASSWORD` | `admin` | Senha do banco |
| `PORT` | `8080` | Porta do servidor HTTP |

### Frontend (build-time)

| Variável | Descrição |
|---|---|
| `VITE_API_URL` | URL base do backend em produção (ex: `https://backend.railway.app`). Omitir em desenvolvimento — o proxy do Vite cuida disso. |

---

## Deploy no Railway

A aplicação está configurada para deploy em dois serviços separados no Railway + um plugin PostgreSQL.

### Arquitetura no Railway

```
┌─────────────────────────────────────────┐
│            Railway Project               │
│                                         │
│  ┌─────────────┐   ┌─────────────────┐  │
│  │  Frontend   │   │    Backend      │  │
│  │  (nginx)    │──▶│  (Kotlin/Ktor)  │  │
│  │  porta 80   │   │   porta $PORT   │  │
│  └─────────────┘   └────────┬────────┘  │
│                             │           │
│                   ┌─────────▼────────┐  │
│                   │   PostgreSQL     │  │
│                   │  (plugin nativo) │  │
│                   └──────────────────┘  │
└─────────────────────────────────────────┘
```

### Passo a passo

**1. Suba o código para o GitHub**
```bash
git add .
git commit -m "feat: ready for Railway deploy"
git push origin main
```

**2. Crie o projeto no Railway**

Acesse [railway.app](https://railway.app) → New Project → Deploy from GitHub repo.

**3. Adicione o PostgreSQL**

No projeto: **+ New → Database → PostgreSQL**

**4. Configure o serviço de Backend**

Railway detecta o `Dockerfile` na raiz automaticamente. Adicione as variáveis de ambiente:

| Variável | Valor no Railway |
|---|---|
| `DB_URL` | `jdbc:postgresql://${{Postgres.PGHOST}}:${{Postgres.PGPORT}}/${{Postgres.PGDATABASE}}` |
| `DB_USER` | `${{Postgres.PGUSER}}` |
| `DB_PASSWORD` | `${{Postgres.PGPASSWORD}}` |

**5. Adicione o serviço de Frontend**

**+ New → GitHub Repo → mesmo repositório → Root Directory: `frontend`**

Adicione a variável:

| Variável | Valor |
|---|---|
| `VITE_API_URL` | URL pública do serviço de backend (ex: `https://backend-xxx.railway.app`) |

**6. Resultado**

- Frontend: `https://frontend-xxx.railway.app` → enviar ao cliente
- Backend: `https://backend-xxx.railway.app` → apenas interno
- Migrations aplicadas automaticamente no primeiro start

---

## Arquitetura

### Backend — Camadas por módulo

```
modules/
└── {modulo}/
    ├── api/
    │   ├── {Modulo}Routes.kt      # Rotas HTTP (Ktor DSL)
    │   └── dto/
    │       └── {Modulo}Dtos.kt    # Request/Response DTOs
    ├── application/
    │   └── {Modulo}Service.kt     # Regras de negócio
    ├── domain/
    │   └── model/
    │       └── {Entidade}.kt      # Entidades e enums
    └── infrastructure/
        ├── {Entidade}Table.kt     # Definição da tabela (Exposed)
        ├── {Entidade}Repository.kt         # Interface
        └── {Entidade}RepositoryImpl.kt     # Implementação
```

### Frontend — Estrutura de módulo

```
modules/
└── {modulo}/
    ├── pages/       # Componentes de rota (React.lazy)
    ├── components/  # Componentes específicos do módulo
    ├── hooks/       # Custom hooks (React Query)
    └── utils/       # Utilitários (ex: geração de PDF)

shared/
├── api/             # Clientes HTTP por módulo (Axios)
├── components/
│   ├── layout/      # AppLayout, PageHeader, Sidebar
│   └── ui/          # Design system: Button, Card, Table, Badge, Modal, Input...
├── theme/           # ThemeContext (dark/light mode)
└── utils/           # cn(), formatação
```

### Conversão m³ ↔ Metro Linear

Regra central do domínio para produtos MADEIRA:

```
metro_linear = volume_m3 / (espessura_m × largura_m)
volume_m3    = metro_linear × espessura_m × largura_m
```

- Armazenamento: sempre em **m³** no banco
- Exibição: **metro linear** calculado em runtime na camada de serviço
- Frontend: biblioteca `conversaoMadeira.ts` com as mesmas fórmulas
- Entrada de compra: toggle "em m³" ou "em peças"
- Venda balcão: toggle "por metros" ou "por peças"

---

## Licença

Projeto proprietário — Shopping das Madeiras.
