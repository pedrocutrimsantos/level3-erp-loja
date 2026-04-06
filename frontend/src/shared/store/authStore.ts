import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token:      string | null
  userId:     string | null
  nome:       string | null
  perfil:     string | null
  tenantSlug: string | null

  setAuth: (data: {
    token:      string
    userId:     string
    nome:       string
    perfil:     string
    tenantSlug: string
  }) => void

  logout: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token:      null,
      userId:     null,
      nome:       null,
      perfil:     null,
      tenantSlug: null,

      setAuth: (data) => set(data),

      logout: () =>
        set({ token: null, userId: null, nome: null, perfil: null, tenantSlug: null }),

      isAuthenticated: () => get().token !== null,
    }),
    { name: 'auth' }
  )
)
