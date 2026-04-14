import React, { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/shared/components/layout/AppLayout'
import { useAuthStore } from '@/shared/store/authStore'
import { useAdminStore } from '@/modules/admin/store/adminStore'

const LoginPage            = React.lazy(() => import('@/modules/auth/pages/LoginPage'))
const EsqueciSenhaPage     = React.lazy(() => import('@/modules/auth/pages/EsqueciSenhaPage'))
const RedefinirSenhaPage   = React.lazy(() => import('@/modules/auth/pages/RedefinirSenhaPage'))
const PrimeiroAcessoPage   = React.lazy(() => import('@/modules/auth/pages/PrimeiroAcessoPage'))
const AdminLoginPage     = React.lazy(() => import('@/modules/admin/pages/AdminLoginPage'))
const TenantsPage        = React.lazy(() => import('@/modules/admin/pages/TenantsPage'))

const ProdutoListPage     = React.lazy(() => import('@/modules/produto/pages/ProdutoListPage'))
const ProdutoFormPage     = React.lazy(() => import('@/modules/produto/pages/ProdutoFormPage'))
const ProdutoDetalhePage  = React.lazy(() => import('@/modules/produto/pages/ProdutoDetalhePage'))
const EstoqueListPage     = React.lazy(() => import('@/modules/estoque/pages/EstoqueListPage'))
const EstoqueDetalhe      = React.lazy(() => import('@/modules/estoque/pages/EstoqueDetalhe'))
const VendaBalcaoPage     = React.lazy(() => import('@/modules/venda/pages/VendaBalcaoPage'))
const VendaHistoricoPage  = React.lazy(() => import('@/modules/venda/pages/VendaHistoricoPage'))
const ClienteListPage     = React.lazy(() => import('@/modules/cliente/pages/ClienteListPage'))
const ClienteFormPage     = React.lazy(() => import('@/modules/cliente/pages/ClienteFormPage'))
const ClienteDetalhePage  = React.lazy(() => import('@/modules/cliente/pages/ClienteDetalhePage'))
const ComprasPage         = React.lazy(() => import('@/modules/compra/pages/ComprasPage'))
const MovimentacoesPage   = React.lazy(() => import('@/modules/estoque/pages/MovimentacoesPage'))
const OrcamentosPage      = React.lazy(() => import('@/modules/venda/pages/OrcamentosPage'))
const DevolucoesPage      = React.lazy(() => import('@/modules/venda/pages/DevolucoesPage'))
const TitulosPage         = React.lazy(() => import('@/modules/financeiro/pages/TitulosPage'))
const ContasPagarPage     = React.lazy(() => import('@/modules/financeiro/pages/ContasPagarPage'))
const ContasReceberPage   = React.lazy(() => import('@/modules/financeiro/pages/ContasReceberPage'))
const CaixaPage           = React.lazy(() => import('@/modules/financeiro/pages/CaixaPage'))
const FluxoCaixaPage      = React.lazy(() => import('@/modules/financeiro/pages/FluxoCaixaPage'))
const DashboardPage       = React.lazy(() => import('@/modules/relatorio/pages/DashboardPage'))
const RelatoriosExportPage = React.lazy(() => import('@/modules/relatorio/pages/RelatoriosExportPage'))
const NfePage             = React.lazy(() => import('@/modules/fiscal/pages/NfePage'))
const DanfePage           = React.lazy(() => import('@/modules/fiscal/pages/DanfePage'))
const SpedPage            = React.lazy(() => import('@/modules/fiscal/pages/SpedPage'))
const FornecedoresPage    = React.lazy(() => import('@/modules/fornecedor/pages/FornecedoresPage'))
const EntregasPage        = React.lazy(() => import('@/modules/entrega/pages/EntregasPage'))
const PrecosPage          = React.lazy(() => import('@/modules/produto/pages/PrecosPage'))
const UsuariosPage        = React.lazy(() => import('@/modules/usuario/pages/UsuariosPage'))
const EmpresaPage         = React.lazy(() => import('@/modules/empresa/pages/EmpresaPage'))
const CobrancaPage        = React.lazy(() => import('@/modules/financeiro/pages/CobrancaPage'))
const PromocaoPage        = React.lazy(() => import('@/modules/promocao/pages/PromocaoPage'))
const DrePage             = React.lazy(() => import('@/modules/relatorio/pages/DrePage'))
const MargemPeriodoPage   = React.lazy(() => import('@/modules/relatorio/pages/MargemPeriodoPage'))
const MetaVendasPage      = React.lazy(() => import('@/modules/meta/pages/MetaVendasPage'))
const MeuPerfilPage       = React.lazy(() => import('@/modules/perfil/pages/MeuPerfilPage'))

function PageFallback() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
}

/** Redireciona para /login se não estiver autenticado. */
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />
}

/** Redireciona para /admin se não tiver a chave de admin. */
function AdminRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAdminStore((s) => s.isAuthenticated)
  return isAuthenticated() ? <>{children}</> : <Navigate to="/admin" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* Rotas públicas */}
          <Route path="/login"            element={<LoginPage />} />
          <Route path="/esqueci-senha"    element={<EsqueciSenhaPage />} />
          <Route path="/redefinir-senha"  element={<RedefinirSenhaPage />} />
          <Route path="/primeiro-acesso"  element={<PrimeiroAcessoPage />} />

          {/* Painel super-admin — autenticação independente */}
          <Route path="/admin" element={<AdminLoginPage />} />
          <Route path="/admin/tenants" element={
            <AdminRoute><TenantsPage /></AdminRoute>
          } />

          {/* DANFE — fullscreen sem AppLayout */}
          <Route
            path="/fiscal/nfe/:id/danfe"
            element={
              <PrivateRoute>
                <DanfePage />
              </PrivateRoute>
            }
          />

          {/* Rotas protegidas — dentro do AppLayout */}
          <Route
            path="/*"
            element={
              <PrivateRoute>
                <AppLayout>
                  <Suspense fallback={<PageFallback />}>
                    <Routes>
                      <Route path="/" element={<Navigate to="/relatorios/dashboard" replace />} />
                      <Route path="/relatorios/dashboard"   element={<DashboardPage />} />
                      <Route path="/relatorios/exportar"    element={<RelatoriosExportPage />} />
                      <Route path="/relatorios/dre"            element={<DrePage />} />
                      <Route path="/relatorios/margem-periodo" element={<MargemPeriodoPage />} />
                      <Route path="/relatorios/metas"          element={<MetaVendasPage />} />
                      <Route path="/produtos"               element={<ProdutoListPage />} />
                      <Route path="/produtos/precos"        element={<PrecosPage />} />
                      <Route path="/produtos/novo"          element={<ProdutoFormPage />} />
                      <Route path="/produtos/:id"           element={<ProdutoDetalhePage />} />
                      <Route path="/estoque"                element={<EstoqueListPage />} />
                      <Route path="/estoque/:produtoId"     element={<EstoqueDetalhe />} />
                      <Route path="/estoque/movimentacoes"  element={<MovimentacoesPage />} />
                      <Route path="/vendas/balcao"          element={<VendaBalcaoPage />} />
                      <Route path="/vendas/historico"       element={<VendaHistoricoPage />} />
                      <Route path="/vendas/orcamentos"      element={<OrcamentosPage />} />
                      <Route path="/vendas/devolucoes"      element={<DevolucoesPage />} />
                      <Route path="/clientes"               element={<ClienteListPage />} />
                      <Route path="/clientes/novo"          element={<ClienteFormPage />} />
                      <Route path="/clientes/:id"           element={<ClienteDetalhePage />} />
                      <Route path="/compras/pedidos"        element={<ComprasPage />} />
                      <Route path="/fiscal/nfe"             element={<NfePage />} />
                      <Route path="/fiscal/sped"            element={<SpedPage />} />
                      <Route path="/fornecedores"           element={<FornecedoresPage />} />
                      <Route path="/entregas"               element={<EntregasPage />} />
                      <Route path="/financeiro/caixa"         element={<CaixaPage />} />
                      <Route path="/financeiro/titulos"       element={<TitulosPage />} />
                      <Route path="/financeiro/contas-pagar"   element={<ContasPagarPage />} />
                      <Route path="/financeiro/contas-receber" element={<ContasReceberPage />} />
                      <Route path="/financeiro/fluxo-caixa"   element={<FluxoCaixaPage />} />
                      <Route path="/financeiro/cobranca"      element={<CobrancaPage />} />
                      <Route path="/vendas/promocoes"         element={<PromocaoPage />} />
                      <Route path="/configuracoes/empresa"  element={<EmpresaPage />} />
                      <Route path="/configuracoes/usuarios" element={<UsuariosPage />} />
                      <Route path="/perfil"                 element={<MeuPerfilPage />} />
                    </Routes>
                  </Suspense>
                </AppLayout>
              </PrivateRoute>
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
