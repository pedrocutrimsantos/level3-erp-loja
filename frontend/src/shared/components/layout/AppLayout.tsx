import React, { useState, useEffect, useRef } from 'react'
import { Toaster } from '@/shared/components/ui/Toaster'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Package, Wallet, Layers, BarChart2, ShoppingCart,
  Sun, Moon, Menu, ChevronDown, LogOut, User, KeyRound, X,
} from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import { useTheme } from '@/shared/theme/ThemeContext'
import { useAuthStore } from '@/shared/store/authStore'
import { AlterarSenhaModal } from '@/modules/auth/components/AlterarSenhaModal'
import { Sidebar, navGroups, filtrarNavGroups } from './Sidebar'
import { NotificacaoBell } from './NotificacaoBell'

const APP_VERSION = '0.1.0'

// ── Persistência de grupos recolhíveis ────────────────────────────────────────

const GROUP_STORAGE_KEY   = 'nav-collapsed'
const SIDEBAR_STORAGE_KEY = 'sidebar-collapsed'

function useCollapsedGroups() {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(GROUP_STORAGE_KEY)
      return saved ? new Set(JSON.parse(saved) as string[]) : new Set()
    } catch { return new Set() }
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

// ── Bottom nav — 4 destinos primários ────────────────────────────────────────
// Papel: navegação principal, acesso imediato ao fluxo mais frequente.
// Regra: cada rota aqui é FILTRADA do drawer para evitar duplicação.

const bottomNavItems = [
  { label: 'Dashboard', to: '/relatorios/dashboard', icon: BarChart2 },
  { label: 'Balcão',    to: '/vendas/balcao',         icon: ShoppingCart },
  { label: 'Estoque',   to: '/estoque',               icon: Package },
  { label: 'Caixa',     to: '/financeiro/caixa',      icon: Wallet },
] as const

// Conjunto de caminhos da bottom nav — usado para filtrar o drawer
const BOTTOM_NAV_PATHS = new Set(bottomNavItems.map((i) => i.to))

// ── Hook: título da página atual ──────────────────────────────────────────────
// Exibido no header mobile para dar contexto sem ocupar espaço com hamburger.

function useCurrentPageTitle(): string | null {
  const { pathname } = useLocation()
  let best: { label: string; score: number } | null = null

  for (const group of navGroups) {
    for (const item of group.items) {
      if (pathname.startsWith(item.to) && item.to.length > (best?.score ?? 0)) {
        best = { label: item.label, score: item.to.length }
      }
    }
  }
  for (const item of bottomNavItems) {
    if (pathname.startsWith(item.to) && item.to.length > (best?.score ?? 0)) {
      best = { label: item.label, score: item.to.length }
    }
  }
  return best?.label ?? null
}

// ── MobileDrawer ──────────────────────────────────────────────────────────────
// Papel: navegação SECUNDÁRIA (itens não cobertos pela bottom nav) + ações do usuário.
// Não duplica o que já está na bottom nav — cada item aparece em um único lugar.

interface MobileDrawerProps {
  open: boolean
  onClose: () => void
  collapsedGroups: Set<string>
  onToggleGroup: (label: string) => void
  nome: string | null
  perfil: string | null
  onMeuPerfil: () => void
  onAlterarSenha: () => void
  onLogout: () => void
}

function MobileDrawer({
  open, onClose, collapsedGroups, onToggleGroup, nome, perfil, onMeuPerfil, onAlterarSenha, onLogout,
}: MobileDrawerProps) {
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Filtra por perfil e remove itens que já estão na bottom nav
  const drawerGroups = filtrarNavGroups(perfil)
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !BOTTOM_NAV_PATHS.has(item.to as string)),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <>
      {/* Overlay */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/55 transition-opacity duration-250 md:hidden',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      />

      {/* Painel — 76vw, máx 260px: largo o suficiente para ler, não tão largo que domine a tela */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[76vw] max-w-[260px] flex-col md:hidden',
          'bg-[#0d1f14] dark:bg-[#0f1923]',
          'shadow-[4px_0_24px_rgba(0,0,0,0.5)]',
          'transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* ── Cabeçalho do drawer: usuário ── */}
        <div
          className="flex items-center gap-3 px-4 pb-4 border-b border-white/8"
          style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
        >
          {/* Avatar */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary/15 ring-1 ring-secondary/20">
            <User className="h-4.5 w-4.5 text-secondary" style={{ width: 18, height: 18 }} />
          </div>
          {/* Nome */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold leading-tight text-white">
              {nome ?? 'Usuário'}
            </p>
            <p className="text-[11px] leading-tight text-white/30 mt-0.5">v{APP_VERSION}</p>
          </div>
          {/* Fechar */}
          <button
            onClick={onClose}
            aria-label="Fechar menu"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/30 active:bg-white/8 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Navegação secundária ── */}
        <nav className="flex-1 overflow-y-auto overscroll-contain py-2 px-2">
          {drawerGroups.map((group) => {
            const isOpen = !collapsedGroups.has(group.label)
            return (
              <div key={group.label} className="mb-0.5">
                {/* Label do grupo */}
                <button
                  onClick={() => onToggleGroup(group.label)}
                  className="flex w-full items-center justify-between px-2 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white/25 active:text-white/40 transition-colors"
                >
                  {group.label}
                  <ChevronDown
                    className={cn(
                      'h-2.5 w-2.5 shrink-0 text-white/20 transition-transform duration-200',
                      isOpen ? 'rotate-0' : '-rotate-90',
                    )}
                  />
                </button>

                {/* Acordeão */}
                <div
                  style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
                  className="grid transition-[grid-template-rows] duration-200 ease-out"
                >
                  <div className="overflow-hidden">
                    <div className="pb-1.5 space-y-px">
                      {group.items.map((item) => (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          end
                          onClick={onClose}
                          className={({ isActive }) =>
                            cn(
                              'relative flex min-h-[42px] items-center gap-2.5 rounded-lg px-2.5',
                              'text-[12px] font-medium transition-colors duration-100',
                              isActive
                                ? 'bg-white/10 text-white'
                                : 'text-white/45 active:bg-white/7 active:text-white/75',
                            )
                          }
                        >
                          {({ isActive }) => (
                            <>
                              {isActive && (
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-r-full bg-secondary" />
                              )}
                              <span className={cn('shrink-0', isActive ? 'text-secondary' : item.iconColor)}>
                                {item.icon}
                              </span>
                              <span className="truncate">{item.label}</span>
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

        {/* ── Ações do usuário no rodapé ── */}
        <div
          className="border-t border-white/8 px-2 py-2 space-y-px"
          style={{ paddingBottom: 'max(0.75rem, calc(env(safe-area-inset-bottom) + 0.5rem))' }}
        >
          <button
            onClick={toggleTheme}
            className="flex min-h-[40px] w-full items-center gap-2.5 rounded-lg px-2.5 text-[12px] font-medium text-white/40 active:bg-white/7 transition-colors"
          >
            {theme === 'dark'
              ? <Sun className="h-4 w-4 text-amber-400 shrink-0" />
              : <Moon className="h-4 w-4 text-blue-400 shrink-0" />}
            {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
          </button>

          <button
            onClick={() => { onClose(); onMeuPerfil() }}
            className="flex min-h-[40px] w-full items-center gap-2.5 rounded-lg px-2.5 text-[12px] font-medium text-white/40 active:bg-white/7 transition-colors"
          >
            <User className="h-4 w-4 text-slate-400 shrink-0" />
            Meu perfil
          </button>

          <button
            onClick={() => { onClose(); onAlterarSenha() }}
            className="flex min-h-[40px] w-full items-center gap-2.5 rounded-lg px-2.5 text-[12px] font-medium text-white/40 active:bg-white/7 transition-colors"
          >
            <KeyRound className="h-4 w-4 text-slate-400 shrink-0" />
            Alterar senha
          </button>

          <button
            onClick={onLogout}
            className="flex min-h-[40px] w-full items-center gap-2.5 rounded-lg px-2.5 text-[12px] font-medium text-rose-400/60 active:bg-rose-500/10 active:text-rose-400 transition-colors"
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

export interface AppLayoutProps { children?: React.ReactNode }

export function AppLayout({ children }: AppLayoutProps) {
  const { theme, toggleTheme } = useTheme()
  const [drawerOpen, setDrawerOpen]             = useState(false)
  const [userMenuOpen, setUserMenuOpen]         = useState(false)
  const [alterarSenhaOpen, setAlterarSenhaOpen] = useState(false)
  const { collapsed: collapsedGroups, toggle: toggleGroup } = useCollapsedGroups()

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true' } catch { return false }
  })
  function toggleSidebar() {
    setSidebarCollapsed((v) => {
      const next = !v; localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next)); return next
    })
  }

  const location    = useLocation()
  const navigate    = useNavigate()
  const { logout, nome, perfil } = useAuthStore()
  const userMenuRef = useRef<HTMLDivElement>(null)
  const pageTitle   = useCurrentPageTitle()

  function handleLogout() { logout(); navigate('/login', { replace: true }) }

  useEffect(() => { setDrawerOpen(false); setUserMenuOpen(false) }, [location.pathname])

  useEffect(() => {
    if (!userMenuOpen) return
    const handle = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node))
        setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [userMenuOpen])

  return (
    <>
    {/*
      h-[100dvh]: dynamic viewport height.
      Resolve o Safari mobile que contava a barra de endereço no 100vh,
      causando overflow e conteúdo escondido atrás da chrome do browser.
    */}
    <div className="flex h-[100dvh] overflow-hidden bg-background dark:bg-[#0d1117]">

      {/* ── Sidebar desktop ─────────────────────────────────────────────────── */}
      <aside className={cn(
        'hidden md:flex shrink-0 flex-col',
        'bg-gradient-to-b from-primary-900 via-primary-900 to-[#0d2b1e]',
        'dark:from-[#111820] dark:via-[#111820] dark:to-[#0a1208]',
        'text-primary-50 transition-[width] duration-200 ease-out overflow-hidden',
        sidebarCollapsed ? 'w-[60px]' : 'w-[240px]',
      )}>
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
        perfil={perfil}
        onMeuPerfil={() => { setDrawerOpen(false); navigate('/perfil') }}
        onAlterarSenha={() => setAlterarSenhaOpen(true)}
        onLogout={handleLogout}
      />

      {/* ── Área principal ──────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">

        {/* ── Topbar desktop ── */}
        <header className="hidden md:flex shrink-0 items-center justify-between border-b border-border/60 bg-card/80 backdrop-blur-sm px-6 py-2.5 dark:bg-[#161d27]/90 dark:border-[#243040]/80">
          <div />
          <div className="flex items-center gap-3">
            <NotificacaoBell />
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
                  <span className="text-xs font-medium text-foreground dark:text-[#e2e8f0] max-w-[120px] truncate">{nome}</span>
                  <ChevronDown className={cn('h-3 w-3 text-muted-foreground transition-transform', userMenuOpen && 'rotate-180')} />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl border border-border bg-card shadow-lg dark:bg-[#161d27] dark:border-[#243040] z-50 overflow-hidden">
                    <button
                      onClick={() => { setUserMenuOpen(false); navigate('/perfil') }}
                      className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-foreground hover:bg-muted dark:hover:bg-[#243040] transition-colors"
                    >
                      <User className="h-4 w-4 text-muted-foreground" /> Meu perfil
                    </button>
                    <button
                      onClick={() => { setUserMenuOpen(false); setAlterarSenhaOpen(true) }}
                      className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-foreground hover:bg-muted dark:hover:bg-[#243040] transition-colors"
                    >
                      <KeyRound className="h-4 w-4 text-muted-foreground" /> Alterar senha
                    </button>
                    <div className="h-px bg-border dark:bg-[#243040]" />
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut className="h-4 w-4" /> Sair
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* ── Topbar mobile ──
            Papel: branding + contexto da página atual.
            SEM hamburger (a bottom nav já tem "Menu").
            O título da página diz ao usuário onde ele está sem precisar de breadcrumb. ── */}
        <header
          className="flex shrink-0 items-center gap-3 border-b border-border/60 bg-card/98 px-4 dark:bg-[#161d27]/98 dark:border-[#243040]/70 md:hidden backdrop-blur-sm"
          style={{
            paddingTop: 'max(0.625rem, env(safe-area-inset-top))',
            paddingBottom: '0.625rem',
          }}
        >
          {/* Logo mark */}
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-secondary shadow-sm">
            <Layers className="h-3.5 w-3.5 text-[#1A1A1A]" />
          </div>

          {/* Título da página atual — contexto sem poluição */}
          <p className="flex-1 truncate text-[14px] font-semibold text-foreground dark:text-[#e2e8f0] tracking-tight">
            {pageTitle ?? 'Madex'}
          </p>
        </header>

        {/* ── Conteúdo principal ──
            pb-[var(--bottom-clear)] no mobile garante scroll até o fim sem conteúdo
            escondido atrás da bottom nav + safe area do dispositivo.
            --bottom-clear não está disponível via Tailwind puro, então usamos
            pb-24 md:pb-8: 96px cobre a bottom nav (~54px) + home indicator iOS (~34px) + 8px extra. ── */}
        <main className="flex-1 overflow-y-auto overscroll-y-contain bg-background dark:bg-[#0d1117]">
          <div className="min-h-full p-4 pb-24 md:px-8 md:py-7 md:pb-8 text-foreground dark:text-[#e2e8f0]">
            <div className="mx-auto w-full max-w-[1560px]">
              {children ?? <Outlet />}
            </div>
          </div>
        </main>
      </div>

      {/* ── Bottom nav mobile ────────────────────────────────────────────────────
          Papel: 4 destinos primários + acesso ao drawer.
          safe-area-inset-bottom: estende o fundo da nav até a home bar do iPhone
          sem empurrar os botões para baixo do espaço útil. ── */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-border/60 bg-card/96 backdrop-blur-md dark:bg-[#161d27]/96 dark:border-[#243040]/70 md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {bottomNavItems.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-[3px] py-2',
                'text-[9.5px] font-semibold tracking-[0.03em] transition-colors duration-100',
                isActive
                  ? 'text-primary dark:text-[#4ade80]'
                  : 'text-muted-foreground/70 dark:text-[#64748b]',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('h-5 w-5', isActive ? 'stroke-[2.5]' : 'stroke-[1.75]')} />
                {label}
              </>
            )}
          </NavLink>
        ))}

        {/* ≡ Menu — abre o drawer com navegação secundária */}
        <button
          onClick={() => setDrawerOpen((v) => !v)}
          className={cn(
            'flex flex-1 flex-col items-center justify-center gap-[3px] py-2',
            'text-[9.5px] font-semibold tracking-[0.03em] transition-colors duration-100',
            drawerOpen
              ? 'text-primary dark:text-[#4ade80]'
              : 'text-muted-foreground/70 dark:text-[#64748b]',
          )}
        >
          <Menu className={cn('h-5 w-5', drawerOpen ? 'stroke-[2.5]' : 'stroke-[1.75]')} />
          Menu
        </button>
      </nav>
    </div>

    <AlterarSenhaModal open={alterarSenhaOpen} onClose={() => setAlterarSenhaOpen(false)} />
    <Toaster />
    </>
  )
}
