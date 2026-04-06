import React, { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/shared/components/layout/AppLayout'
import { useAuthStore } from '@/shared/store/authStore'

const LoginPage = React.lazy(() => import('@/modules/auth/pages/LoginPage'))

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
const TitulosPage         = React.lazy(() => import('@/modules/financeiro/pages/TitulosPage'))
const CaixaPage           = React.lazy(() => import('@/modules/financeiro/pages/CaixaPage'))
const FluxoCaixaPage      = React.lazy(() => import('@/modules/financeiro/pages/FluxoCaixaPage'))
const DashboardPage       = React.lazy(() => import('@/modules/relatorio/pages/DashboardPage'))
const RelatoriosExportPage = React.lazy(() => import('@/modules/relatorio/pages/RelatoriosExportPage'))
const NfePage             = React.lazy(() => import('@/modules/fiscal/pages/NfePage'))
const DanfePage           = React.lazy(() => import('@/modules/fiscal/pages/DanfePage'))
const FornecedoresPage    = React.lazy(() => import('@/modules/fornecedor/pages/FornecedoresPage'))
const EntregasPage        = React.lazy(() => import('@/modules/entrega/pages/EntregasPage'))
const PrecosPage          = React.lazy(() => import('@/modules/produto/pages/PrecosPage'))
const UsuariosPage        = React.lazy(() => import('@/modules/usuario/pages/UsuariosPage'))

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

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* Rota pública */}
          <Route path="/login" element={<LoginPage />} />

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
                      <Route path="/clientes"               element={<ClienteListPage />} />
                      <Route path="/clientes/novo"          element={<ClienteFormPage />} />
                      <Route path="/clientes/:id"           element={<ClienteDetalhePage />} />
                      <Route path="/compras/pedidos"        element={<ComprasPage />} />
                      <Route path="/fiscal/nfe"             element={<NfePage />} />
                      <Route path="/fornecedores"           element={<FornecedoresPage />} />
                      <Route path="/entregas"               element={<EntregasPage />} />
                      <Route path="/financeiro/caixa"       element={<CaixaPage />} />
                      <Route path="/financeiro/titulos"     element={<TitulosPage />} />
                      <Route path="/financeiro/fluxo-caixa" element={<FluxoCaixaPage />} />
                      <Route path="/configuracoes/usuarios" element={<UsuariosPage />} />
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
