import React, { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  ShoppingCart,
  FileText,
  Package,
  ArrowLeftRight,
  Truck,
  FileCheck,
  Wallet,
  CreditCard,
  CalendarClock,
  Tag,
  TreePine,
  History,
  Users,
  BarChart2,
  FileDown,
  Building2,
  Sun,
  Moon,
  Menu,
  X,
  ChevronDown,
  MoreHorizontal,
} from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import { useTheme } from '@/shared/theme/ThemeContext'

const APP_VERSION = '0.1.0'

// ── Estrutura de navegação ────────────────────────────────────────────────────

interface NavItem {
  label: string
  to: string
  icon: React.ReactNode
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: 'Relatórios',
    items: [
      { label: 'Dashboard',  to: '/relatorios/dashboard', icon: <BarChart2 className="h-4 w-4" /> },
      { label: 'Exportar',   to: '/relatorios/exportar',  icon: <FileDown  className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Vendas',
    items: [
      { label: 'Balcão',     to: '/vendas/balcao',     icon: <ShoppingCart className="h-4 w-4" /> },
      { label: 'Histórico',  to: '/vendas/historico',  icon: <History      className="h-4 w-4" /> },
      { label: 'Orçamentos', to: '/vendas/orcamentos', icon: <FileText     className="h-4 w-4" /> },
      { label: 'Entregas',   to: '/entregas',          icon: <Truck        className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Estoque',
    items: [
      { label: 'Produtos',        to: '/produtos',                icon: <Package        className="h-4 w-4" /> },
      { label: 'Preços de Venda', to: '/produtos/precos',         icon: <Tag            className="h-4 w-4" /> },
      { label: 'Saldo',           to: '/estoque',                 icon: <Package        className="h-4 w-4" /> },
      { label: 'Movimentações',   to: '/estoque/movimentacoes',   icon: <ArrowLeftRight className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Clientes',
    items: [
      { label: 'Clientes', to: '/clientes', icon: <Users className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Compras',
    items: [
      { label: 'Entradas',     to: '/compras/pedidos', icon: <Truck     className="h-4 w-4" /> },
      { label: 'Fornecedores', to: '/fornecedores',    icon: <Building2 className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Fiscal',
    items: [
      { label: 'NF-e', to: '/fiscal/nfe', icon: <FileCheck className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { label: 'Caixa',          to: '/financeiro/caixa',        icon: <Wallet        className="h-4 w-4" /> },
      { label: 'Títulos',        to: '/financeiro/titulos',      icon: <CreditCard    className="h-4 w-4" /> },
      { label: 'Fluxo de Caixa', to: '/financeiro/fluxo-caixa', icon: <CalendarClock className="h-4 w-4" /> },
    ],
  },
]

// Itens fixados na barra inferior mobile
const bottomNavItems = [
  { label: 'Dashboard', to: '/relatorios/dashboard', icon: BarChart2 },
  { label: 'Balcão',    to: '/vendas/balcao',         icon: ShoppingCart },
  { label: 'Estoque',   to: '/estoque',               icon: Package },
  { label: 'Caixa',     to: '/financeiro/caixa',      icon: Wallet },
]

// ── Hook: grupos recolhíveis ──────────────────────────────────────────────────

const STORAGE_KEY = 'nav-collapsed'

function useCollapsedGroups() {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? new Set(JSON.parse(saved) as string[]) : new Set()
    } catch {
      return new Set()
    }
  })

  function toggle(label: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
      return next
    })
  }

  return { collapsed, toggle }
}

// ── Layout ────────────────────────────────────────────────────────────────────

export interface AppLayoutProps {
  children?: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { theme, toggleTheme } = useTheme()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { collapsed, toggle } = useCollapsedGroups()
  const location = useLocation()

  // Fecha o drawer ao navegar
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  // Bloqueia scroll do body quando drawer está aberto
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between border-b border-primary-700 px-4 py-5 dark:border-[#243040]">
        <div className="flex items-center gap-2">
          <TreePine className="h-6 w-6 text-secondary" />
          <span className="font-semibold text-sm leading-tight">Shopping das Madeiras</span>
        </div>
        <button
          className="md:hidden rounded-md p-1 text-primary-200 hover:bg-primary-800"
          onClick={() => setDrawerOpen(false)}
          aria-label="Fechar menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 pb-2">
        {navGroups.map((group) => {
          const isCollapsed = collapsed.has(group.label)
          return (
            <div key={group.label} className="mb-1">
              <button
                onClick={() => toggle(group.label)}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary-300 hover:bg-primary-800/50 dark:text-[#94a3b8] dark:hover:bg-[#1c2636] transition-colors"
              >
                {group.label}
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 shrink-0 transition-transform duration-200',
                    isCollapsed ? '-rotate-90' : 'rotate-0'
                  )}
                />
              </button>

              {!isCollapsed && (
                <div className="mt-0.5 mb-2">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors',
                          isActive
                            ? 'bg-primary-700 text-white font-medium dark:bg-[#243040] dark:text-[#e2e8f0]'
                            : 'text-primary-100 hover:bg-primary-800 hover:text-white dark:text-[#94a3b8] dark:hover:bg-[#243040] dark:hover:text-[#e2e8f0]'
                        )
                      }
                    >
                      {item.icon}
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Rodapé: tema + versão */}
      <div className="border-t border-primary-700 px-2 py-3 space-y-1 dark:border-[#243040]">
        <button
          onClick={toggleTheme}
          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-primary-100 transition-colors hover:bg-primary-800 dark:text-[#94a3b8] dark:hover:bg-[#243040] dark:hover:text-[#e2e8f0]"
        >
          {theme === 'dark'
            ? <Sun  className="h-4 w-4 shrink-0" />
            : <Moon className="h-4 w-4 shrink-0" />}
          {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
        </button>
        <p className="px-2 text-[10px] text-primary-400 dark:text-[#4a5568] select-none">
          v{APP_VERSION}
        </p>
      </div>
    </>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-background dark:bg-[#0d1117]">

      {/* ── Sidebar desktop (md+) ────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-primary-800 bg-primary-900 text-primary-50 dark:bg-[#111820] dark:border-[#243040]">
        {sidebarContent}
      </aside>

      {/* ── Drawer mobile ────────────────────────────────────────────────────── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-primary-900 text-primary-50 dark:bg-[#111820] transition-transform duration-300 md:hidden',
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </aside>

      {/* ── Área principal ───────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Topbar mobile */}
        <header className="flex items-center justify-between border-b border-border bg-background px-4 py-3 dark:bg-[#0d1117] dark:border-[#243040] md:hidden">
          <div className="flex items-center gap-2">
            <TreePine className="h-5 w-5 text-secondary" />
            <span className="font-semibold text-sm text-foreground">Shopping das Madeiras</span>
          </div>
          <span className="text-[10px] text-muted-foreground select-none">v{APP_VERSION}</span>
        </header>

        {/* Conteúdo — pb-16 no mobile para não ficar atrás da barra inferior */}
        <main className="flex-1 overflow-y-auto bg-background dark:bg-[#0d1117]">
          <div className="min-h-full p-4 pb-20 md:p-6 md:pb-6 text-foreground dark:text-[#e2e8f0]">
            {children ?? <Outlet />}
          </div>
        </main>
      </div>

      {/* ── Barra de navegação inferior (mobile only) ────────────────────────── */}
      <nav className="fixed bottom-0 inset-x-0 z-30 flex items-stretch border-t border-border bg-background dark:bg-[#111820] dark:border-[#243040] md:hidden">
        {bottomNavItems.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                isActive
                  ? 'text-primary dark:text-[#4ade80]'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('h-5 w-5', isActive && 'stroke-[2.5]')} />
                {label}
              </>
            )}
          </NavLink>
        ))}

        {/* Botão "Mais" — abre o drawer com todos os itens */}
        <button
          onClick={() => setDrawerOpen(true)}
          className={cn(
            'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
            drawerOpen
              ? 'text-primary dark:text-[#4ade80]'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <MoreHorizontal className="h-5 w-5" />
          Mais
        </button>
      </nav>
    </div>
  )
}
