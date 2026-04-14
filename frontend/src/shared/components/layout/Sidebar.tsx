import React, { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { NavLink } from 'react-router-dom'
import { useAuthStore } from '@/shared/store/authStore'
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
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  MessageSquare,
  Percent,
  Target,
} from 'lucide-react'
import { cn } from '@/shared/utils/cn'

// ── Estrutura de navegação ────────────────────────────────────────────────────

// Perfis disponíveis no sistema
type Perfil = 'VENDEDOR' | 'SUPERVISOR' | 'GERENTE' | 'ESTOQUE' | 'FISCAL' | 'FINANCEIRO' | 'ADMIN'

export interface NavItem {
  label: string
  to: string
  icon: React.ReactNode
  iconColor: string
  /** Perfis que enxergam este item. Omitir = visível para todos. */
  perfis?: Perfil[]
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

const TODOS: Perfil[] = ['VENDEDOR', 'SUPERVISOR', 'GERENTE', 'ESTOQUE', 'FISCAL', 'FINANCEIRO', 'ADMIN']

export const navGroups: NavGroup[] = [
  {
    label: 'Relatórios',
    items: [
      { label: 'Dashboard',      to: '/relatorios/dashboard',      iconColor: 'text-blue-400',    icon: <BarChart2 className="h-4 w-4" />, perfis: TODOS },
      { label: 'Metas de Vendas', to: '/relatorios/metas',         iconColor: 'text-rose-400',    icon: <Target    className="h-4 w-4" />, perfis: ['GERENTE', 'SUPERVISOR', 'ADMIN'] },
      { label: 'DRE',            to: '/relatorios/dre',            iconColor: 'text-violet-400',  icon: <FileText  className="h-4 w-4" />, perfis: ['GERENTE', 'FINANCEIRO', 'ADMIN'] },
      { label: 'Margem Período', to: '/relatorios/margem-periodo', iconColor: 'text-emerald-400', icon: <BarChart2 className="h-4 w-4" />, perfis: ['GERENTE', 'FISCAL', 'FINANCEIRO', 'ADMIN'] },
      { label: 'Exportar',       to: '/relatorios/exportar',       iconColor: 'text-cyan-400',    icon: <FileDown  className="h-4 w-4" />, perfis: ['GERENTE', 'FISCAL', 'FINANCEIRO', 'ADMIN'] },
    ],
  },
  {
    label: 'Vendas',
    items: [
      { label: 'Balcão',     to: '/vendas/balcao',     iconColor: 'text-emerald-400', icon: <ShoppingCart   className="h-4 w-4" />, perfis: ['VENDEDOR', 'SUPERVISOR', 'GERENTE', 'ADMIN'] },
      { label: 'Histórico',  to: '/vendas/historico',  iconColor: 'text-green-400',   icon: <History        className="h-4 w-4" />, perfis: ['VENDEDOR', 'SUPERVISOR', 'GERENTE', 'FISCAL', 'FINANCEIRO', 'ADMIN'] },
      { label: 'Orçamentos', to: '/vendas/orcamentos', iconColor: 'text-teal-400',    icon: <FileText       className="h-4 w-4" />, perfis: ['VENDEDOR', 'SUPERVISOR', 'GERENTE', 'ADMIN'] },
      { label: 'Devoluções', to: '/vendas/devolucoes', iconColor: 'text-rose-400',    icon: <ArrowLeftRight className="h-4 w-4" />, perfis: ['SUPERVISOR', 'GERENTE', 'FISCAL', 'ADMIN'] },
      { label: 'Entregas',   to: '/entregas',          iconColor: 'text-sky-400',     icon: <Truck          className="h-4 w-4" />, perfis: ['SUPERVISOR', 'GERENTE', 'ESTOQUE', 'ADMIN'] },
      { label: 'Promoções',  to: '/vendas/promocoes',  iconColor: 'text-yellow-400',  icon: <Percent        className="h-4 w-4" />, perfis: ['VENDEDOR', 'SUPERVISOR', 'GERENTE', 'ADMIN'] },
    ],
  },
  {
    label: 'Estoque',
    items: [
      { label: 'Produtos',        to: '/produtos',              iconColor: 'text-orange-400', icon: <Package        className="h-4 w-4" />, perfis: ['VENDEDOR', 'SUPERVISOR', 'GERENTE', 'ESTOQUE', 'FISCAL', 'ADMIN'] },
      { label: 'Preços de Venda', to: '/produtos/precos',       iconColor: 'text-amber-400',  icon: <Tag            className="h-4 w-4" />, perfis: ['GERENTE', 'ADMIN'] },
      { label: 'Saldo',           to: '/estoque',               iconColor: 'text-yellow-400', icon: <Package        className="h-4 w-4" />, perfis: ['VENDEDOR', 'SUPERVISOR', 'GERENTE', 'ESTOQUE', 'ADMIN'] },
      { label: 'Movimentações',   to: '/estoque/movimentacoes', iconColor: 'text-lime-400',   icon: <ArrowLeftRight className="h-4 w-4" />, perfis: ['SUPERVISOR', 'GERENTE', 'ESTOQUE', 'ADMIN'] },
    ],
  },
  {
    label: 'Clientes',
    items: [
      { label: 'Clientes', to: '/clientes', iconColor: 'text-purple-400', icon: <Users className="h-4 w-4" />, perfis: ['VENDEDOR', 'SUPERVISOR', 'GERENTE', 'FINANCEIRO', 'ADMIN'] },
    ],
  },
  {
    label: 'Compras',
    items: [
      { label: 'Entradas',     to: '/compras/pedidos', iconColor: 'text-indigo-400', icon: <Truck     className="h-4 w-4" />, perfis: ['GERENTE', 'ESTOQUE', 'FISCAL', 'ADMIN'] },
      { label: 'Fornecedores', to: '/fornecedores',    iconColor: 'text-violet-400', icon: <Building2 className="h-4 w-4" />, perfis: ['GERENTE', 'ESTOQUE', 'ADMIN'] },
    ],
  },
  {
    label: 'Fiscal',
    items: [
      { label: 'NF-e',     to: '/fiscal/nfe',  iconColor: 'text-red-400',    icon: <FileCheck className="h-4 w-4" />, perfis: ['FISCAL', 'GERENTE', 'ADMIN'] },
      { label: 'SPED EFD', to: '/fiscal/sped', iconColor: 'text-orange-400', icon: <FileDown  className="h-4 w-4" />, perfis: ['FISCAL', 'GERENTE', 'ADMIN'] },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { label: 'Caixa',            to: '/financeiro/caixa',          iconColor: 'text-emerald-400', icon: <Wallet        className="h-4 w-4" />, perfis: ['VENDEDOR', 'SUPERVISOR', 'GERENTE', 'FINANCEIRO', 'ADMIN'] },
      { label: 'Contas a Receber', to: '/financeiro/contas-receber', iconColor: 'text-green-400',   icon: <CreditCard    className="h-4 w-4" />, perfis: ['SUPERVISOR', 'GERENTE', 'FINANCEIRO', 'ADMIN'] },
      { label: 'Contas a Pagar',   to: '/financeiro/contas-pagar',   iconColor: 'text-red-400',     icon: <CreditCard    className="h-4 w-4" />, perfis: ['GERENTE', 'FINANCEIRO', 'ADMIN'] },
      { label: 'Títulos',          to: '/financeiro/titulos',        iconColor: 'text-blue-400',    icon: <CreditCard    className="h-4 w-4" />, perfis: ['SUPERVISOR', 'GERENTE', 'FINANCEIRO', 'ADMIN'] },
      { label: 'Fluxo de Caixa',   to: '/financeiro/fluxo-caixa',   iconColor: 'text-cyan-400',    icon: <CalendarClock className="h-4 w-4" />, perfis: ['GERENTE', 'FINANCEIRO', 'ADMIN'] },
      { label: 'Cobrança',         to: '/financeiro/cobranca',       iconColor: 'text-violet-400',  icon: <MessageSquare className="h-4 w-4" />, perfis: ['GERENTE', 'FINANCEIRO', 'ADMIN'] },
    ],
  },
  {
    label: 'Configurações',
    items: [
      { label: 'Empresa',  to: '/configuracoes/empresa',  iconColor: 'text-slate-400', icon: <Building2 className="h-4 w-4" />, perfis: ['ADMIN'] },
      { label: 'Usuários', to: '/configuracoes/usuarios', iconColor: 'text-zinc-400',  icon: <Users2    className="h-4 w-4" />, perfis: ['ADMIN'] },
    ],
  },
]

/**
 * Filtra navGroups pelo perfil do usuário logado.
 * Remove itens que o perfil não pode ver e grupos que ficam vazios.
 */
export function filtrarNavGroups(perfil: string | null): NavGroup[] {
  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.perfis || item.perfis.includes(perfil as Perfil),
      ),
    }))
    .filter((group) => group.items.length > 0)
}

// ── Tooltip portal (modo compacto) ────────────────────────────────────────────

function NavTooltip({
  label,
  top,
  left,
}: {
  label: string
  top: number
  left: number
}) {
  return createPortal(
    <div
      style={{ top, left, transform: 'translateY(-50%)' }}
      className="fixed z-[9999] pointer-events-none"
    >
      {/* seta esquerda */}
      <span className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-[#243040]" />
      <div className="rounded-lg bg-[#243040] px-2.5 py-1.5 text-xs font-medium text-white shadow-xl whitespace-nowrap">
        {label}
      </div>
    </div>,
    document.body,
  )
}

// ── Item de navegação ─────────────────────────────────────────────────────────

function SidebarNavItem({
  item,
  sidebarCollapsed,
}: {
  item: NavItem
  sidebarCollapsed: boolean
}) {
  const [tooltip, setTooltip] = useState<{ top: number; left: number } | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  function handleMouseEnter() {
    if (!sidebarCollapsed || !wrapperRef.current) return
    const rect = wrapperRef.current.getBoundingClientRect()
    setTooltip({ top: rect.top + rect.height / 2, left: rect.right + 10 })
  }

  return (
    <div ref={wrapperRef} onMouseEnter={handleMouseEnter} onMouseLeave={() => setTooltip(null)}>
      <NavLink
        to={item.to}
        end
        className={({ isActive }) =>
          cn(
            'group relative flex items-center rounded-lg transition-all duration-150 text-sm font-medium',
            sidebarCollapsed
              ? 'justify-center px-2 py-2 mx-1'
              : 'gap-2.5 px-3 py-2',
            isActive
              ? 'bg-white/12 text-white shadow-sm shadow-black/10'
              : 'text-white/60 hover:bg-white/6 hover:text-white/90',
          )
        }
      >
        {({ isActive }) => (
          <>
            {/* Barra de ativo */}
            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-secondary shadow-sm shadow-secondary/50" />
            )}
            {/* Ícone */}
            <span className={cn('shrink-0 transition-colors', isActive ? 'text-white' : item.iconColor)}>
              {item.icon}
            </span>
            {/* Label — oculto no modo compacto */}
            {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
          </>
        )}
      </NavLink>

      {/* Tooltip portal */}
      {sidebarCollapsed && tooltip && (
        <NavTooltip label={item.label} top={tooltip.top} left={tooltip.left} />
      )}
    </div>
  )
}

// ── Grupo com acordeão CSS ────────────────────────────────────────────────────

function SidebarGroup({
  group,
  isOpen,
  onToggle,
  sidebarCollapsed,
}: {
  group: NavGroup
  isOpen: boolean
  onToggle: () => void
  sidebarCollapsed: boolean
}) {
  // Em modo compacto: todos os grupos ficam "abertos" (apenas ícones visíveis)
  const expanded = sidebarCollapsed || isOpen

  return (
    <div className="mb-0.5">
      {/* Cabeçalho do grupo — oculto no modo compacto */}
      {!sidebarCollapsed && (
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-between px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-primary-400/70 hover:text-primary-200 transition-colors"
        >
          {group.label}
          <ChevronDown
            className={cn(
              'h-3 w-3 shrink-0 transition-transform duration-200',
              isOpen ? 'rotate-0' : '-rotate-90',
            )}
          />
        </button>
      )}

      {/* Separador fino no modo compacto */}
      {sidebarCollapsed && <div className="mx-2 my-1 h-px bg-white/8" />}

      {/* Acordeão via grid-template-rows */}
      <div
        style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
        className="grid transition-[grid-template-rows] duration-200 ease-out"
      >
        <div className="overflow-hidden">
          <div className="space-y-0.5 pt-0.5 pb-0.5">
            {group.items.map((item) => (
              <SidebarNavItem key={item.to} item={item} sidebarCollapsed={sidebarCollapsed} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sidebar principal ─────────────────────────────────────────────────────────

export interface SidebarProps {
  isCollapsed: boolean
  onToggleCollapsed: () => void
  collapsedGroups: Set<string>
  onToggleGroup: (label: string) => void
  version: string
  /** Exibe botão de fechar (mobile drawer) */
  showCloseButton?: boolean
  onClose?: () => void
}

export function Sidebar({
  isCollapsed,
  onToggleCollapsed,
  collapsedGroups,
  onToggleGroup,
  version,
  showCloseButton,
  onClose,
}: SidebarProps) {
  const perfil = useAuthStore((s) => s.perfil)
  const gruposFiltrados = filtrarNavGroups(perfil)

  return (
    <div className="flex flex-col h-full">
      {/* ── Logo / header ── */}
      <div
        className={cn(
          'flex items-center py-5 transition-all duration-200',
          isCollapsed ? 'justify-center px-2' : 'justify-between px-4',
        )}
      >
        {isCollapsed ? (
          /* Modo compacto: apenas o ícone clicável para expandir */
          <button
            onClick={onToggleCollapsed}
            title="Expandir menu"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary shadow-md shadow-black/20 hover:opacity-90 transition-opacity"
          >
            <Layers className="h-4 w-4 text-[#1A1A1A]" />
          </button>
        ) : (
          /* Modo expandido: logo + botões */
          <>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary shadow-md shadow-black/20">
                <Layers className="h-4 w-4 text-[#1A1A1A]" />
              </div>
              <div className="leading-none">
                <span className="block text-sm font-bold text-white tracking-tight">Madex</span>
                <span className="block text-[10px] text-white/40 font-normal tracking-wide">by Level3</span>
              </div>
            </div>

            <div className="flex items-center gap-0.5">
              {/* Botão recolher — visível apenas desktop */}
              <button
                onClick={onToggleCollapsed}
                title="Recolher menu"
                className="hidden md:flex rounded-lg p-1.5 text-white/35 hover:bg-white/10 hover:text-white/70 transition-colors"
              >
                <PanelLeftClose className="h-3.5 w-3.5" />
              </button>
              {/* Botão fechar — visível apenas mobile drawer */}
              {showCloseButton && (
                <button
                  className="rounded-lg p-1.5 text-white/35 hover:bg-white/10 hover:text-white/70 transition-colors"
                  onClick={onClose}
                  aria-label="Fechar menu"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-white/10" />

      {/* ── Navegação ── */}
      <nav
        className={cn(
          'flex-1 overflow-y-auto py-3 space-y-0',
          isCollapsed ? 'px-0' : 'px-2',
        )}
      >
        {gruposFiltrados.map((group) => (
          <SidebarGroup
            key={group.label}
            group={group}
            isOpen={!collapsedGroups.has(group.label)}
            onToggle={() => onToggleGroup(group.label)}
            sidebarCollapsed={isCollapsed}
          />
        ))}
      </nav>

      {/* Divider */}
      <div className="mx-4 h-px bg-white/10" />

      {/* ── Rodapé ── */}
      <div className={cn('py-3', isCollapsed ? 'flex justify-center' : 'px-3')}>
        {isCollapsed ? (
          /* Botão expandir no rodapé */
          <button
            onClick={onToggleCollapsed}
            title="Expandir menu"
            className="rounded-lg p-1.5 text-white/30 hover:bg-white/10 hover:text-white/60 transition-colors"
          >
            <PanelLeftOpen className="h-3.5 w-3.5" />
          </button>
        ) : (
          <p className="px-3 text-[10px] text-primary-400/50 select-none">v{version}</p>
        )}
      </div>
    </div>
  )
}
