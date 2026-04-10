import { create } from 'zustand'
import type { AuthUser } from '@/lib/types'
import { apiFetch } from '@/lib/api/client'

interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  isInitialized: boolean
  error: string | null
  isAuthenticated: boolean
  initialize: () => Promise<void>
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  clearError: () => void
  hasPermission: (permission: string) => boolean
  updateCurrentUser: (user: AuthUser) => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  isInitialized: false,
  error: null,
  isAuthenticated: false,

  initialize: async () => {
    if (get().isInitialized) return
    set({ isLoading: true, error: null })
    try {
      await apiFetch<Record<string, unknown>>('/api/bootstrap')
      set((state) => ({ isInitialized: true, isLoading: false, isAuthenticated: !!state.user }))
    } catch (error) {
      set({ isInitialized: true, isLoading: false, error: error instanceof Error ? error.message : 'No se pudo inicializar' })
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const data = await apiFetch<{ user: AuthUser }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      set({ user: data.user, isLoading: false, error: null, isAuthenticated: true })
      return true
    } catch (error) {
      set({ isLoading: false, error: error instanceof Error ? error.message : 'Error de inicio de sesión', isAuthenticated: false })
      return false
    }
  },

  logout: () => set({ user: null, error: null, isAuthenticated: false }),
  updateCurrentUser: (user) => set({ user, isAuthenticated: true }),
  clearError: () => set({ error: null }),
  hasPermission: (permission) => {
    const user = get().user
    if (!user) return false
    return user.role.permissions.includes('*') || user.role.permissions.includes(permission)
  },
}))

export function useCurrentUser(): AuthUser | null {
  return useAuthStore((state) => state.user)
}
export function useIsAuthenticated(): boolean {
  return useAuthStore((state) => state.isAuthenticated)
}
export function useHasPermission(permission: string): boolean {
  return useAuthStore((state) => state.hasPermission(permission))
}
