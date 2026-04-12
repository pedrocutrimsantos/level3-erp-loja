import React, { useState, useEffect, useRef } from 'react'
import { Toaster } from '@/shared/components/ui/Toaster'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Package,
  Wallet,
  Layers,
  BarChart2,
  ShoppingCart,
  Sun,
  Moon,
  Menu,
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
import { Sidebar, navGroups } from './Sidebar'

const APP_VERSION = '0.1.0'

// ── Hook: grupos recolhíveis ──────────────────────────────────────────────────

const GROUP_STORAGE_KEY  = 'nav-collapsed'
const SIDEBAR_STORAGE_KEY = 'sidebar-collapsed'

function useCollapsedGroups() {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(GROUP_STORAGE_KEY)
      return saved ? new Set(JSON.parse(saved) as string[]) : new Set()
    } catch {
      return new Set()
    }
  })

  function toggle(label: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      localStorage.setItem(GROUP_STORAGE_KEY, JSON.stringify([...next]))
      return next
    })
  }

  return { collapsed, toggle }
}

// ── Bottom nav items (mobile) ─────────────────────────────────────────────────

const bottomNavItems = [
  { label: 'Dashboard', to: '/relatorios/dashboard', icon: BarChart2 },
  { label: 'Balcão',    to: '/vendas/balcao',         icon: ShoppingCart },
  { label: 'Estoque',   to: '/estoque',               icon: Package },
  { label: 'Caixa',     to: '/financeiro/caixa',      icon: Wallet },
]

// ── Layout ────────────────────────────────────────────────────────────────────

export interface AppLayoutProps {
  children?: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { theme, toggleTheme } = useTheme()
  const [drawerOpen, setDrawerOpen]       = useState(false)
  const [moreSheetOpen, setMoreSheetOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen]   = useState(false)
  const [alterarSenhaOpen, setAlterarSenhaOpen] = useState(false)
  const { collapsed: collapsedGroups, toggle: toggleGroup } = useCollapsedGroups()

  // Sidebar collapse state — persiste em localStorage
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  function toggleSidebar() {
    setSidebarCollapsed((v) => {
      const next = !v
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next))
      return next
    })
  }

  const location  = useLocation()
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

  return (
    <>
    <div className="flex h-screen overflow-hidden bg-background dark:bg-[#0d1117]">

      {/* ── Sidebar desktop ──────────────────────────────────────────────────── */}
      <aside
        className={cn(
          'hidden md:flex shrink-0 flex-col',
          'bg-gradient-to-b from-primary-900 via-primary-900 to-[#0d2b1e]',
          'dark:from-[#111820] dark:via-[#111820] dark:to-[#0a1208]',
          'text-primary-50 transition-[width] duration-200 ease-out overflow-hidden',
          sidebarCollapsed ? 'w-[60px]' : 'w-[240px]',
        )}
      >
        <Sidebar
          isCollapsed={sidebarCollapsed}
          onToggleCollapsed={toggleSidebar}
          collapsedGroups={collapsedGroups}
          onToggleGroup={toggleGroup}
          version={APP_VERSION}
        />
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
          'fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 flex-col',
          'bg-gradient-to-b from-primary-900 to-[#0d2b1e] text-primary-50',
          'dark:from-[#111820] dark:to-[#0a1208]',
          'transition-transform duration-300 ease-in-out md:hidden',
          drawerOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <Sidebar
          isCollapsed={false}
          onToggleCollapsed={() => {}}
          collapsedGroups={collapsedGroups}
          onToggleGroup={toggleGroup}
          version={APP_VERSION}
          showCloseButton
          onClose={() => setDrawerOpen(false)}
        />
      </aside>

      {/* ── Área principal ───────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Topbar desktop */}
        <header className="hidden md:flex items-center justify-between border-b border-border/60 bg-card/80 backdrop-blur-sm px-6 py-2.5 dark:bg-[#161d27]/90 dark:border-[#243040]/80">
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
          <div className="min-h-full p-4 pb-20 md:px-8 md:py-7 md:pb-8 text-foreground dark:text-[#e2e8f0]">
            <div className="mx-auto w-full max-w-[1560px]">
              {children ?? <Outlet />}
            </div>
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
          moreSheetOpen ? 'translate-y-0' : 'translate-y-full',
        )}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/20" />
        </div>

        <div className="px-4 pb-6 pt-2">
          {navGroups.map((group) => {
            const isCollapsed = collapsedGroups.has(group.label)
            return (
              <div key={group.label} className="mb-1">
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="flex w-full items-center justify-between px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                >
                  {group.label}
                  <ChevronDown
                    className={cn(
                      'h-3 w-3 shrink-0 transition-transform duration-200',
                      isCollapsed ? '-rotate-90' : 'rotate-0',
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
                              : 'text-foreground hover:bg-muted dark:text-[#94a3b8] dark:hover:bg-[#243040]',
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
                  : 'text-muted-foreground hover:text-foreground',
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
              : 'text-muted-foreground hover:text-foreground',
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
