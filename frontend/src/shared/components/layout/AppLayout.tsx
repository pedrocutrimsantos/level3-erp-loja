import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'
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
} from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import { useTheme } from '@/shared/theme/ThemeContext'

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
      { label: 'Produtos', to: '/produtos', icon: <Package className="h-4 w-4" /> },
      { label: 'Preços de Venda', to: '/produtos/precos', icon: <Tag className="h-4 w-4" /> },
      { label: 'Saldo', to: '/estoque', icon: <Package className="h-4 w-4" /> },
      { label: 'Movimentações', to: '/estoque/movimentacoes', icon: <ArrowLeftRight className="h-4 w-4" /> },
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
      { label: 'Entradas', to: '/compras/pedidos', icon: <Truck className="h-4 w-4" /> },
      { label: 'Fornecedores', to: '/fornecedores', icon: <Building2 className="h-4 w-4" /> },
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
      { label: 'Caixa', to: '/financeiro/caixa', icon: <Wallet className="h-4 w-4" /> },
      { label: 'Títulos', to: '/financeiro/titulos', icon: <CreditCard className="h-4 w-4" /> },
      { label: 'Fluxo de Caixa', to: '/financeiro/fluxo-caixa', icon: <CalendarClock className="h-4 w-4" /> },
    ],
  },
]

export interface AppLayoutProps {
  children?: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="flex h-screen overflow-hidden bg-background dark:bg-[#0d1117]">
      {/* Sidebar */}
      <aside className="flex w-60 shrink-0 flex-col border-r border-primary-800 bg-primary-900 text-primary-50 dark:bg-[#111820] dark:border-[#243040]">
        {/* Logo */}
        <div className="flex items-center gap-2 border-b border-primary-700 px-4 py-5 dark:border-[#243040]">
          <TreePine className="h-6 w-6 text-secondary" />
          <span className="font-semibold text-sm leading-tight">Shopping das Madeiras</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-4 pb-2">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-primary-300 dark:text-[#94a3b8]">
                {group.label}
              </p>
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
          ))}
        </nav>
        {/* Toggle de tema */}
        <div className="border-t border-primary-700 px-2 py-3 dark:border-[#243040]">
          <button
            onClick={toggleTheme}
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-primary-100 transition-colors hover:bg-primary-800 dark:text-[#94a3b8] dark:hover:bg-[#243040] dark:hover:text-[#e2e8f0]"
          >
            {theme === 'dark'
              ? <Sun  className="h-4 w-4 shrink-0" />
              : <Moon className="h-4 w-4 shrink-0" />}
            {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-background dark:bg-[#0d1117]">
        <div className="min-h-full p-6 text-foreground dark:text-[#e2e8f0]">
          {children ?? <Outlet />}
        </div>
      </main>
    </div>
  )
}
