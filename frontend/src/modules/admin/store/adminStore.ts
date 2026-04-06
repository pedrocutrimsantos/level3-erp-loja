import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AdminStore {
  adminKey: string | null
  setAdminKey: (key: string) => void
  clearAdminKey: () => void
  isAuthenticated: () => boolean
}

export const useAdminStore = create<AdminStore>()(
  persist(
    (set, get) => ({
      adminKey: null,
      setAdminKey: (key) => set({ adminKey: key }),
      clearAdminKey: () => set({ adminKey: null }),
      isAuthenticated: () => !!get().adminKey,
    }),
    { name: 'madex-admin' },
  ),
)
