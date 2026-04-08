// ===========================================
// STORE DE SUCURSALES
// ===========================================

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Branch } from '@/lib/types'
import { branchesDB } from '@/lib/db/local-storage'

interface BranchState {
  currentBranch: Branch | null
  branches: Branch[]
  isLoading: boolean
  
  // Actions
  loadBranches: () => void
  setCurrentBranch: (branch: Branch) => void
  setCurrentBranchById: (branchId: string) => void
  createBranch: (data: Omit<Branch, 'id' | 'createdAt' | 'updatedAt'>) => Branch
  updateBranch: (id: string, data: Partial<Branch>) => Branch | undefined
  deleteBranch: (id: string) => boolean
}

export const useBranchStore = create<BranchState>()(
  persist(
    (set, get) => ({
      currentBranch: null,
      branches: [],
      isLoading: false,

      loadBranches: () => {
        set({ isLoading: true })
        const branches = branchesDB.getActive()
        set({ branches, isLoading: false })
        
        // If no current branch is set, set the first one
        const { currentBranch } = get()
        if (!currentBranch && branches.length > 0) {
          set({ currentBranch: branches[0] })
        }
      },

      setCurrentBranch: (branch: Branch) => {
        set({ currentBranch: branch })
      },

      setCurrentBranchById: (branchId: string) => {
        const branch = branchesDB.getById(branchId)
        if (branch) {
          set({ currentBranch: branch })
        }
      },

      createBranch: (data) => {
        const newBranch = branchesDB.create(data)
        const branches = branchesDB.getActive()
        set({ branches })
        return newBranch
      },

      updateBranch: (id, data) => {
        const updated = branchesDB.update(id, data)
        if (updated) {
          const branches = branchesDB.getActive()
          set({ branches })
          
          // Update current branch if it was the one updated
          const { currentBranch } = get()
          if (currentBranch?.id === id) {
            set({ currentBranch: updated })
          }
        }
        return updated
      },

      deleteBranch: (id) => {
        const deleted = branchesDB.delete(id)
        if (deleted) {
          const branches = branchesDB.getActive()
          set({ branches })
          
          // Clear current branch if it was the one deleted
          const { currentBranch } = get()
          if (currentBranch?.id === id) {
            set({ currentBranch: branches[0] || null })
          }
        }
        return deleted
      },
    }),
    {
      name: 'ventamx-branch',
      partialize: (state) => ({ currentBranch: state.currentBranch }),
    }
  )
)

export function useCurrentBranch(): Branch | null {
  return useBranchStore((state) => state.currentBranch)
}
