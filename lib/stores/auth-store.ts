// ===========================================
// STORE DE AUTENTICACIÓN
// ===========================================

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser, User, Role, Branch } from '@/lib/types'
import { usersDB, rolesDB, branchesDB, initializeDatabase } from '@/lib/db/local-storage'

interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  isInitialized: boolean
  error: string | null
  
  // Actions
  initialize: () => void
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  clearError: () => void
  hasPermission: (permission: string) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      isInitialized: false,
      error: null,

      initialize: () => {
        initializeDatabase()
        set({ isInitialized: true })
      },

      login: async (email: string, password: string): Promise<boolean> => {
        set({ isLoading: true, error: null })
        
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 500))
        
        const user = usersDB.getByEmail(email)
        
        if (!user) {
          set({ isLoading: false, error: 'Usuario no encontrado' })
          return false
        }
        
        if (!user.isActive) {
          set({ isLoading: false, error: 'Usuario inactivo' })
          return false
        }
        
        // In production, this would be bcrypt.compare
        if (user.passwordHash !== password) {
          set({ isLoading: false, error: 'Contraseña incorrecta' })
          return false
        }
        
        const role = rolesDB.getById(user.roleId)
        if (!role) {
          set({ isLoading: false, error: 'Rol no encontrado' })
          return false
        }
        
        let branch: Branch | null = null
        if (user.branchId) {
          branch = branchesDB.getById(user.branchId) || null
        }
        
        const authUser: AuthUser = {
          id: user.id,
          email: user.email,
          name: user.name,
          role,
          branch,
          isGlobalAccess: user.isGlobalAccess,
        }
        
        set({ user: authUser, isLoading: false, error: null })
        return true
      },

      logout: () => {
        set({ user: null, error: null })
      },

      clearError: () => {
        set({ error: null })
      },

      hasPermission: (permission: string): boolean => {
        const { user } = get()
        if (!user) return false
        
        // Admin has all permissions
        if (user.role.permissions.includes('*')) return true
        
        // Check specific permission
        return user.role.permissions.includes(permission)
      },
    }),
    {
      name: 'ventamx-auth',
      partialize: (state) => ({ user: state.user }),
    }
  )
)

// Hook para obtener el usuario con su rol expandido
export function useCurrentUser(): AuthUser | null {
  return useAuthStore((state) => state.user)
}

// Hook para verificar si el usuario está autenticado
export function useIsAuthenticated(): boolean {
  return useAuthStore((state) => state.user !== null)
}

// Hook para verificar permisos
export function useHasPermission(permission: string): boolean {
  return useAuthStore((state) => state.hasPermission(permission))
}
