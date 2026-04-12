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
  ChevronRight,
  LogOut,
  User,
  KeyRound,
  X,
} from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import { useTheme } from '@/shared/theme/ThemeContext'
import { useAuthStore } from '@/shared/store/authStore'
import { AlterarSenhaModal } from '@/modules/auth/components/AlterarSenhaModal'
import { Sidebar, navGroups } from './Sidebar'

const APP_VERSION = '0.1.0'

// ── Hook: grupos recolhíveis ──────────────────────────────────────────────────

const GROUP_STORAGE_KEY   = 'nav-collapsed'
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

// ── Mobile Drawer ─────────────────────────────────────────────────────────────
// Componente dedicado ao mobile: targets de 48px, user info, ações no rodapé.
// Não reutiliza o Sidebar desktop para ter controle total sobre UX mobile.

interface MobileDrawerProps {
  open: boolean
  onClose: () => void
  collapsedGroups: Set<string>
  onToggleGroup: (label: string) => void
  nome: string | null
  onAlterarSenha: () => void
  onLogout: () => void
}

function MobileDrawer({
  open,
  onClose,
  collapsedGroups,
  onToggleGroup,
  nome,
  onAlterarSenha,
  onLogout,
}: MobileDrawerProps) {
  const { theme, toggleTheme } = useTheme()

  // Bloqueia scroll do body quando aberto
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Overlay com blur */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] transition-opacity duration-300 md:hidden',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      />

      {/* Painel do drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navegação"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[82vw] max-w-[300px] flex-col md:hidden',
          'bg-gradient-to-b from-[#0f2318] via-[#0c1d14] to-[#09160e]',
          'dark:from-[#111820] dark:via-[#0e141d] dark:to-[#0a1208]',
          'shadow-2xl transition-transform duration-300 ease-out will-change-transform',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* ── User info ── */}
        <div
          className="flex items-center justify-between px-4"
          style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}
        >
          <div className="flex items-center gap-3 py-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/15 ring-2 ring-secondary/25">
              <User className="h-5 w-5 text-secondary" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-white leading-tight">
                {nome ?? 'Usuário'}
              </p>
              <p className="text-[11px] text-white/35 leading-tight mt-0.5 tracking-wide">
                Madex · v{APP_VERSION}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar menu"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white/35 transition-colors active:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Divider */}
        <div className="mx-4 mt-3 mb-1 h-px bg-white/8" />

        {/* ── Navegação ── */}
        <nav className="flex-1 overflow-y-auto overscroll-contain px-2 py-2">
          {navGroups.map((group) => {
            const isOpen = !collapsedGroups.has(group.label)
            return (
              <div key={group.label} className="mb-0.5">
                {/* Cabeçalho do grupo */}
                <button
                  onClick={() => onToggleGroup(group.label)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-[0.13em] text-white/30 transition-colors active:bg-white/5"
                >
                  {group.label}
                  <ChevronDown
                    className={cn(
                      'h-3 w-3 shrink-0 text-white/25 transition-transform duration-200',
                      isOpen ? 'rotate-0' : '-rotate-90',
                    )}
                  />
                </button>

                {/* Itens com acordeão */}
                <div
                  style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
                  className="grid transition-[grid-template-rows] duration-200 ease-out"
                >
                  <div className="overflow-hidden">
                    <div className="space-y-px pb-1">
                      {group.items.map((item) => (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          end
                          onClick={onClose}
                          className={({ isActive }) =>
                            cn(
                              'relative flex min-h-[46px] items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition-colors duration-150',
                              isActive
                                ? 'bg-white/10 text-white'
                                : 'text-white/50 active:bg-white/8 active:text-white/80',
                            )
                          }
                        >
                          {({ isActive }) => (
                            <>
                              {/* Barra ativa */}
                              {isActive && (
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-secondary shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
                              )}
                              {/* Ícone */}
                              <span className={cn('shrink-0', isActive ? 'text-white' : item.iconColor)}>
                                {item.icon}
                              </span>
                              {/* Label */}
                              <span className="flex-1 truncate">{item.label}</span>
                              {/* Seta ativo */}
                              {isActive && (
                                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/30" />
                              )}
                            </>
                          )}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </nav>

        {/* Divider */}
        <div className="mx-4 mb-1 h-px bg-white/8" />

        {/* ── Rodapé com ações do usuário ── */}
        <div
          className="flex flex-col gap-px px-2 py-2"
          style={{ paddingBottom: 'max(0.75rem, calc(env(safe-area-inset-bottom) + 0.5rem))' }}
        >
          <button
            onClick={toggleTheme}
            className="flex min-h-[46px] items-center gap-3 rounded-xl px-3 text-[13px] font-medium text-white/50 transition-colors active:bg-white/8 active:text-white/80"
          >
            {theme === 'dark'
              ? <Sun className="h-4 w-4 text-amber-400 shrink-0" />
              : <Moon className="h-4 w-4 text-blue-400 shrink-0" />}
            {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
          </button>

          <button
            onClick={() => { onClose(); onAlterarSenha() }}
            className="flex min-h-[46px] items-center gap-3 rounded-xl px-3 text-[13px] font-medium text-white/50 transition-colors active:bg-white/8 active:text-white/80"
          >
            <KeyRound className="h-4 w-4 text-slate-400 shrink-0" />
            Alterar senha
          </button>

          <button
            onClick={onLogout}
            className="flex min-h-[46px] items-center gap-3 rounded-xl px-3 text-[13px] font-medium text-rose-400/65 transition-colors active:bg-rose-500/10 active:text-rose-400"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sair
          </button>
        </div>
      </div>
    </>
  )
}

// ── Layout principal ──────────────────────────────────────────────────────────

export interface AppLayoutProps {
  children?: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { theme, toggleTheme } = useTheme()
  const [drawerOpen, setDrawerOpen]               = useState(false)
  const [userMenuOpen, setUserMenuOpen]           = useState(false)
  const [alterarSenhaOpen, setAlterarSenhaOpen]   = useState(false)
  const { collapsed: collapsedGroups, toggle: toggleGroup } = useCollapsedGroups()

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true' } catch { return false }
  })

  function toggleSidebar() {
    setSidebarCollapsed((v) => {
      const next = !v
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next))
      return next
    })
  }

  const location    = useLocation()
  const navigate    = useNavigate()
  const { logout, nome } = useAuthStore()
  const userMenuRef = useRef<HTMLDivElement>(null)

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  // Fecha tudo na troca de rota
  useEffect(() => {
    setDrawerOpen(false)
    setUserMenuOpen(false)
  }, [location.pathname])

  // Fecha user menu ao clicar fora
  useEffect(() => {
    if (!userMenuOpen) return
    function handle(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [userMenuOpen])

  return (
    <>
    {/*
      h-[100dvh]: usa dynamic viewport height — corrige o problema clássico
      do Safari mobile onde 100vh inclui a barra de endereço e causa overflow.
    */}
    <div className="flex h-[100dvh] overflow-hidden bg-background dark:bg-[#0d1117]">

      {/* ── Sidebar desktop ─────────────────────────────────────────────────── */}
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

      {/* ── Mobile Drawer ───────────────────────────────────────────────────── */}
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        collapsedGroups={collapsedGroups}
        onToggleGroup={toggleGroup}
        nome={nome}
        onAlterarSenha={() => setAlterarSenhaOpen(true)}
        onLogout={handleLogout}
      />

      {/* ── Área principal ──────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">

        {/* Topbar desktop */}
        <header className="hidden md:flex items-center justify-between border-b border-border/60 bg-card/80 backdrop-blur-sm px-6 py-2.5 dark:bg-[#161d27]/90 dark:border-[#243040]/80 shrink-0">
          <div />
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

        {/* Topbar mobile — limpo: logo + hamburger */}
        <header
          className="flex shrink-0 items-center justify-between border-b border-border/70 bg-card px-4 dark:bg-[#161d27] dark:border-[#243040]/80 md:hidden"
          style={{
            paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
            paddingBottom: '0.75rem',
          }}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary shadow-sm shadow-black/20">
              <Layers className="h-4 w-4 text-[#1A1A1A]" />
            </div>
            <span className="font-bold text-[15px] text-foreground dark:text-[#e2e8f0] tracking-tight">
              Madex
            </span>
          </div>

          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menu"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors active:bg-muted"
          >
            <Menu className="h-[22px] w-[22px]" />
          </button>
        </header>

        {/* ── Conteúdo ─────────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto overscroll-y-contain bg-background dark:bg-[#0d1117]">
          {/*
            pb-28 mobile (112px): cobre bottom nav (~56px) + home indicator do iOS (~34px)
            md:pb-8: valor padrão no desktop (sem bottom nav).
          */}
          <div className="min-h-full p-4 pb-28 md:px-8 md:py-7 md:pb-8 text-foreground dark:text-[#e2e8f0]">
            <div className="mx-auto w-full max-w-[1560px]">
              {children ?? <Outlet />}
            </div>
          </div>
        </main>
      </div>

      {/* ── Bottom nav (mobile) ─────────────────────────────────────────────── */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex shrink-0 items-stretch border-t border-border/70 bg-card/95 backdrop-blur-md dark:bg-[#161d27]/95 dark:border-[#243040]/80 md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {bottomNavItems.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-[3px] py-2.5',
                'text-[10px] font-semibold tracking-wide transition-colors duration-150',
                isActive
                  ? 'text-primary dark:text-[#4ade80]'
                  : 'text-muted-foreground',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('h-[22px] w-[22px]', isActive && 'stroke-[2.5]')} />
                {label}
              </>
            )}
          </NavLink>
        ))}

        {/* Botão "Menu" — abre o drawer */}
        <button
          onClick={() => setDrawerOpen(true)}
          className={cn(
            'flex flex-1 flex-col items-center justify-center gap-[3px] py-2.5',
            'text-[10px] font-semibold tracking-wide transition-colors duration-150',
            drawerOpen ? 'text-primary dark:text-[#4ade80]' : 'text-muted-foreground',
          )}
        >
          <Menu className={cn('h-[22px] w-[22px]', drawerOpen && 'stroke-[2.5]')} />
          Menu
        </button>
      </nav>
    </div>

    <AlterarSenhaModal open={alterarSenhaOpen} onClose={() => setAlterarSenhaOpen(false)} />
    <Toaster />
    </>
  )
}
