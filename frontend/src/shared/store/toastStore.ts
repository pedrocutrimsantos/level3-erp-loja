import { create } from 'zustand'

export type ToastTipo = 'erro' | 'sucesso' | 'info'

export interface ToastItem {
  id: string
  tipo: ToastTipo
  mensagem: string
}

interface ToastState {
  toasts: ToastItem[]
  add: (tipo: ToastTipo, mensagem: string) => void
  remove: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  add: (tipo, mensagem) => {
    const id = Math.random().toString(36).slice(2)
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, tipo, mensagem }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 5000)
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export function useToast() {
  const add = useToastStore((s) => s.add)
  return {
    erro:    (msg: string) => add('erro', msg),
    sucesso: (msg: string) => add('sucesso', msg),
    info:    (msg: string) => add('info', msg),
  }
}
