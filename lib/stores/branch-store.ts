import { create } from 'zustand'
import type { Branch } from '@/lib/types'
import { apiFetch } from '@/lib/api/client'
import { hydrateDatabaseCache } from '@/lib/db/local-storage'

interface BranchState {
  currentBranch: Branch | null
  branches: Branch[]
  isLoading: boolean
  loadBranches: () => Promise<void>
  setCurrentBranch: (branch: Branch) => void
  setCurrentBranchById: (branchId: string) => void
  createBranch: (data: Omit<Branch, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Branch>
  updateBranch: (id: string, data: Partial<Branch>) => Promise<Branch | undefined>
  deleteBranch: (id: string) => Promise<boolean>
}

export const useBranchStore = create<BranchState>((set, get) => ({
  currentBranch: null,
  branches: [],
  isLoading: false,
  loadBranches: async () => {
    set({ isLoading: true })
    const data = await apiFetch<{ branches: Branch[] }>('/api/branches')
    hydrateDatabaseCache({ branches: data.branches })
    set({ branches: data.branches, isLoading: false })
    if (!get().currentBranch && data.branches.length > 0) set({ currentBranch: data.branches[0] })
  },
  setCurrentBranch: (branch) => set({ currentBranch: branch }),
  setCurrentBranchById: (branchId) => {
    const branch = get().branches.find((b) => b.id === branchId)
    if (branch) set({ currentBranch: branch })
  },
  createBranch: async (data) => {
    const res = await apiFetch<{ branch: Branch }>('/api/branches', { method: 'POST', body: JSON.stringify(data) })
    const branches = [...get().branches, res.branch]
    hydrateDatabaseCache({ branches })
    set({ branches })
    return res.branch
  },
  updateBranch: async (id, data) => {
    const res = await apiFetch<{ branch: Branch }>(`/api/branches/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
    const branches = get().branches.map((b) => (b.id === id ? res.branch : b))
    hydrateDatabaseCache({ branches })
    set({ branches, currentBranch: get().currentBranch?.id === id ? res.branch : get().currentBranch })
    return res.branch
  },
  deleteBranch: async (id) => {
    await apiFetch(`/api/branches/${id}`, { method: 'DELETE' })
    const branches = get().branches.filter((b) => b.id !== id)
    hydrateDatabaseCache({ branches })
    set({ branches, currentBranch: get().currentBranch?.id === id ? branches[0] || null : get().currentBranch })
    return true
  },
}))

export function useCurrentBranch(): Branch | null { return useBranchStore((state) => state.currentBranch) }
