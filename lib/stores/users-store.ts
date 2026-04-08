import { create } from 'zustand'
import type { Role, User } from '@/lib/types'
import { rolesDB, usersDB } from '@/lib/db/local-storage'

interface UsersState {
  users: User[]
  roles: Role[]
  isLoading: boolean
  loadUsers: () => void
  loadRoles: () => void
  createUser: (data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => User
  updateUser: (id: string, data: Partial<User>) => User | undefined
  toggleUserStatus: (id: string) => User | undefined
}

export const useUsersStore = create<UsersState>((set) => ({
  users: [],
  roles: [],
  isLoading: false,

  loadUsers: () => {
    set({ isLoading: true })
    set({ users: usersDB.getAll(), isLoading: false })
  },

  loadRoles: () => {
    set({ roles: rolesDB.getAll() })
  },

  createUser: (data) => {
    const user = usersDB.create(data)
    set({ users: usersDB.getAll() })
    return user
  },

  updateUser: (id, data) => {
    const updated = usersDB.update(id, data)
    set({ users: usersDB.getAll() })
    return updated
  },

  toggleUserStatus: (id) => {
    const current = usersDB.getById(id)
    if (!current) return undefined
    const updated = usersDB.update(id, { isActive: !current.isActive })
    set({ users: usersDB.getAll() })
    return updated
  },
}))
