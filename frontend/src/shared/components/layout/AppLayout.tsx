import React, { useState, useEffect, useRef } from 'react'
import { Toaster } from '@/shared/components/ui/Toaster'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
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
  Layers,
  History,
  Users,
  Users2,
  BarChart2,
  FileDown,
  Building2,
  Sun,
  Moon,
  Menu,
  X,
  ChevronDown,
  MoreHorizontal,
  LogOut,
  User,
  KeyRound,
} from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import { useTheme } from '@/shared/theme/ThemeContext'
import { useAuthStore } from '@/shared/store/authStore'
import { AlterarSenhaModal } from '@/modules/auth/components/AlterarSenhaModal'

const APP_VERSION = '0.1.0'

// ── Estrutura de navegação ────────────────────────────────────────────────────

interface NavItem {
  label: string
  to: string
  icon: React.ReactNode
  iconColor: string   // cor do ícone quando inativo
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: 'Relatórios',
    items: [
      { label: 'Dashboard',  to: '/relatorios/dashboard', iconColor: 'text-blue-400',   icon: <BarChart2 className="h-4 w-4" /> },
      { label: 'Exportar',   to: '/relatorios/exportar',  iconColor: 'text-cyan-400',   icon: <FileDown  className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Vendas',
    items: [
      { label: 'Balcão',     to: '/vendas/balcao',     iconColor: 'text-emerald-400', icon: <ShoppingCart className="h-4 w-4" /> },
      { label: 'Histórico',  to: '/vendas/historico',  iconColor: 'text-green-400',   icon: <History      className="h-4 w-4" /> },
      { label: 'Orçamentos', to: '/vendas/orcamentos',  iconColor: 'text-teal-400',    icon: <FileText     className="h-4 w-4" /> },
      { label: 'Devoluções', to: '/vendas/devolucoes', iconColor: 'text-rose-400',    icon: <ArrowLeftRight className="h-4 w-4" /> },
      { label: 'Entregas',   to: '/entregas',          iconColor: 'text-sky-400',     icon: <Truck        className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Estoque',
    items: [
      { label: 'Produtos',        to: '/produtos',              iconColor: 'text-orange-400',  icon: <Package        className="h-4 w-4" /> },
      { label: 'Preços de Venda', to: '/produtos/precos',       iconColor: 'text-amber-400',   icon: <Tag            className="h-4 w-4" /> },
      { label: 'Saldo',           to: '/estoque',               iconColor: 'text-yellow-400',  icon: <Package        className="h-4 w-4" /> },
      { label: 'Movimentações',   to: '/estoque/movimentacoes', iconColor: 'text-lime-400',    icon: <ArrowLeftRight className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Clientes',
    items: [
      { label: 'Clientes', to: '/clientes', iconColor: 'text-purple-400', icon: <Users className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Compras',
    items: [
      { label: 'Entradas',     to: '/compras/pedidos', iconColor: 'text-indigo-400', icon: <Truck     className="h-4 w-4" /> },
      { label: 'Fornecedores', to: '/fornecedores',    iconColor: 'text-violet-400', icon: <Building2 className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Fiscal',
    items: [
      { label: 'NF-e', to: '/fiscal/nfe', iconColor: 'text-red-400', icon: <FileCheck className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { label: 'Caixa',          to: '/financeiro/caixa',       iconColor: 'text-emerald-400', icon: <Wallet        className="h-4 w-4" /> },
      { label: 'Títulos',        to: '/financeiro/titulos',     iconColor: 'text-blue-400',    icon: <CreditCard    className="h-4 w-4" /> },
      { label: 'Fluxo de Caixa', to: '/financeiro/fluxo-caixa',iconColor: 'text-cyan-400',    icon: <CalendarClock className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Configurações',
    items: [
      { label: 'Empresa',  to: '/configuracoes/empresa',  iconColor: 'text-slate-400',  icon: <Building2 className="h-4 w-4" /> },
      { label: 'Usuários', to: '/configuracoes/usuarios', iconColor: 'text-zinc-400',   icon: <Users2    className="h-4 w-4" /> },
    ],
  },
]

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

// ── Sidebar nav item ──────────────────────────────────────────────────────────

function SidebarNavItem({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
          isActive
            ? 'bg-white/15 text-white'
            : 'text-primary-200/70 hover:bg-white/8 hover:text-white'
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-secondary" />
          )}
          <span className={cn('shrink-0', isActive ? 'text-white' : item.iconColor)}>
            {item.icon}
          </span>
          {item.label}
        </>
      )}
    </NavLink>
  )
}

// ── Layout ────────────────────────────────────────────────────────────────────

export interface AppLayoutProps {
  children?: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { theme, toggleTheme } = useTheme()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [moreSheetOpen, setMoreSheetOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [alterarSenhaOpen, setAlterarSenhaOpen] = useState(false)
  const { collapsed, toggle } = useCollapsedGroups()
  const location = useLocation()
  const navigate  = useNavigate()
  const { logout, nome } = useAuthStore()
  const userMenuRef = useRef<HTMLDivElement>(null)

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  useEffect(() => {
    setDrawerOpen(false)
    setMoreSheetOpen(false)
    setUserMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!userMenuOpen) return
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [userMenuOpen])

  useEffect(() => {
    document.body.style.overflow = (drawerOpen || moreSheetOpen) ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen, moreSheetOpen])

  // ── Conteúdo da sidebar ───────────────────────────────────────────────────

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/20">
            <Layers className="h-4.5 w-4.5 text-secondary" />
          </div>
          <div className="leading-none">
            <span className="block text-sm font-bold text-white tracking-tight">Madex</span>
            <span className="block text-[10px] text-primary-300/70 font-normal">by Level3</span>
          </div>
        </div>
        <button
          className="md:hidden rounded-lg p-1 text-primary-300 hover:bg-white/10 transition-colors"
          onClick={() => setDrawerOpen(false)}
          aria-label="Fechar menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-white/10" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navGroups.map((group) => {
          const isCollapsed = collapsed.has(group.label)
          return (
            <div key={group.label} className="mb-1">
              <button
                onClick={() => toggle(group.label)}
                className="flex w-full items-center justify-between px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-primary-400/70 hover:text-primary-200 transition-colors"
              >
                {group.label}
                <ChevronDown
                  className={cn(
                    'h-3 w-3 shrink-0 transition-transform duration-200',
                    isCollapsed ? '-rotate-90' : 'rotate-0'
                  )}
                />
              </button>

              {!isCollapsed && (
                <div className="mt-0.5 space-y-0.5">
                  {group.items.map((item) => (
                    <SidebarNavItem key={item.to} item={item} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Divider */}
      <div className="mx-4 h-px bg-white/10" />

      {/* Rodapé: versão */}
      <div className="px-3 py-3">
        <p className="px-3 text-[10px] text-primary-400/50 select-none">v{APP_VERSION}</p>
      </div>
    </div>
  )

  return (
    <>
    <div className="flex h-screen overflow-hidden bg-background dark:bg-[#0d1117]">

      {/* ── Sidebar desktop ──────────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-[240px] shrink-0 flex-col bg-primary-900 text-primary-50 dark:bg-[#111820]">
        {sidebarContent}
      </aside>

      {/* ── Overlay drawer mobile ─────────────────────────────────────────────── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-primary-900 text-primary-50 dark:bg-[#111820]',
          'transition-transform duration-300 ease-in-out md:hidden',
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </aside>

      {/* ── Área principal ───────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Topbar desktop */}
        <header className="hidden md:flex items-center justify-between border-b border-border bg-card px-6 py-3 dark:bg-[#161d27] dark:border-[#243040]">
          <div /> {/* placeholder para breadcrumb futuro */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {nome && (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 dark:bg-[#1c2636] hover:bg-muted/80 transition-colors"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 dark:bg-primary-800">
                    <User className="h-3.5 w-3.5 text-primary dark:text-primary-300" />
                  </div>
                  <span className="text-xs font-medium text-foreground dark:text-[#e2e8f0] max-w-[120px] truncate">
                    {nome}
                  </span>
                  <ChevronDown className={cn('h-3 w-3 text-muted-foreground transition-transform', userMenuOpen && 'rotate-180')} />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl border border-border bg-card shadow-lg dark:bg-[#161d27] dark:border-[#243040] z-50 overflow-hidden">
                    <button
                      onClick={() => { setUserMenuOpen(false); setAlterarSenhaOpen(true) }}
                      className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-foreground hover:bg-muted dark:hover:bg-[#243040] transition-colors"
                    >
                      <KeyRound className="h-4 w-4 text-muted-foreground" />
                      Alterar senha
                    </button>
                    <div className="h-px bg-border dark:bg-[#243040]" />
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sair
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Topbar mobile */}
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 dark:bg-[#161d27] dark:border-[#243040] md:hidden">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-secondary" />
            <span className="font-semibold text-sm text-foreground dark:text-[#e2e8f0]">
              Madex <span className="font-normal opacity-50 text-xs">by Level3</span>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground select-none mr-1">v{APP_VERSION}</span>
            <button
              onClick={toggleTheme}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={handleLogout}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDrawerOpen(true)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Conteúdo */}
        <main className="flex-1 overflow-y-auto bg-background dark:bg-[#0d1117]">
          <div className="min-h-full p-5 pb-20 md:p-6 md:pb-6 text-foreground dark:text-[#e2e8f0]">
            {children ?? <Outlet />}
          </div>
        </main>
      </div>

      {/* ── Bottom sheet "Mais" (mobile) ─────────────────────────────────────── */}
      {moreSheetOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMoreSheetOpen(false)}
          aria-hidden="true"
        />
      )}
      <div
        className={cn(
          'fixed inset-x-0 bottom-16 z-50 flex flex-col rounded-t-2xl bg-card dark:bg-[#161d27]',
          'border-t border-border dark:border-[#243040] shadow-xl',
          'max-h-[70vh] overflow-y-auto transition-transform duration-300 md:hidden',
          moreSheetOpen ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/20" />
        </div>

        <div className="px-4 pb-6 pt-2">
          {navGroups.map((group) => {
            const isCollapsed = collapsed.has(group.label)
            return (
              <div key={group.label} className="mb-1">
                <button
                  onClick={() => toggle(group.label)}
                  className="flex w-full items-center justify-between px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                >
                  {group.label}
                  <ChevronDown
                    className={cn(
                      'h-3 w-3 shrink-0 transition-transform duration-200',
                      isCollapsed ? '-rotate-90' : 'rotate-0'
                    )}
                  />
                </button>
                {!isCollapsed && (
                  <div className="mt-0.5 mb-2 space-y-0.5">
                    {group.items.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                            isActive
                              ? 'bg-primary/10 text-primary dark:bg-[#243040] dark:text-[#4ade80]'
                              : 'text-foreground hover:bg-muted dark:text-[#94a3b8] dark:hover:bg-[#243040]'
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <span className={cn('shrink-0', isActive ? 'text-primary dark:text-[#4ade80]' : item.iconColor)}>
                              {item.icon}
                            </span>
                            {item.label}
                          </>
                        )}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

        </div>
      </div>

      {/* ── Bottom nav (mobile) ──────────────────────────────────────────────── */}
      <nav className="fixed bottom-0 inset-x-0 z-30 flex items-stretch border-t border-border bg-card dark:bg-[#161d27] dark:border-[#243040] md:hidden">
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
        <button
          onClick={() => setMoreSheetOpen((v) => !v)}
          className={cn(
            'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
            moreSheetOpen
              ? 'text-primary dark:text-[#4ade80]'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <MoreHorizontal className="h-5 w-5" />
          Mais
        </button>
      </nav>
    </div>
    <AlterarSenhaModal open={alterarSenhaOpen} onClose={() => setAlterarSenhaOpen(false)} />
    <Toaster />
    </>
  )
}
