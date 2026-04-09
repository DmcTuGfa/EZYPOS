import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CashMovement, CashRegister, CashSession, PaymentMethod } from '@/lib/types'
import { apiFetch } from '@/lib/api/client'
import { cashMovementsDB, cashRegistersDB, cashSessionsDB, hydrateDatabaseCache, salePaymentsDB, salesDB } from '@/lib/db/local-storage'

interface SessionSummary {
  totalSales: number
  salesCount: number
  byPaymentMethod: Record<PaymentMethod, number>
  withdrawals: number
  deposits: number
  returns: number
  expectedCash: number
}
interface CashState {
  currentSession: CashSession | null
  registers: CashRegister[]
  isLoading: boolean
  loadRegisters: (branchId: string) => Promise<void>
  openSession: (registerId: string, userId: string, branchId: string, openingAmount: number) => Promise<CashSession | null>
  closeSession: (closingAmount: number, notes: string) => Promise<CashSession | null>
  loadCurrentSession: (userId?: string) => Promise<void>
  addMovement: (type: CashMovement['type'], amount: number, description: string, userId: string, referenceId?: string) => Promise<CashMovement | null>
  getSessionSummary: () => SessionSummary | null
}

export const useCashStore = create<CashState>()(
  persist(
    (set, get) => ({
      currentSession: null,
      registers: [],
      isLoading: false,
      loadRegisters: async (branchId) => {
        set({ isLoading: true })
        const data = await apiFetch<{ registers: CashRegister[] }>(`/api/cash/registers?branchId=${branchId}`)
        hydrateDatabaseCache({ cashRegisters: data.registers })
        set({ registers: data.registers, isLoading: false })
      },
      openSession: async (registerId, userId, branchId, openingAmount) => {
        const res = await apiFetch<{ session: CashSession }>('/api/cash/sessions', { method: 'POST', body: JSON.stringify({ cashRegisterId: registerId, userId, branchId, openingAmount }) })
        const sessions = [res.session, ...cashSessionsDB.getAll()]
        hydrateDatabaseCache({ cashSessions: sessions })
        set({ currentSession: res.session })
        return res.session
      },
      closeSession: async (closingAmount, notes) => {
        const currentSession = get().currentSession
        const summary = get().getSessionSummary()
        if (!currentSession || !summary) return null
        const res = await apiFetch<{ session: CashSession }>(`/api/cash/sessions/${currentSession.id}/close`, { method: 'POST', body: JSON.stringify({ closingAmount, expectedAmount: summary.expectedCash, notes }) })
        const sessions = cashSessionsDB.getAll().map((s) => s.id === currentSession.id ? res.session : s)
        hydrateDatabaseCache({ cashSessions: sessions })
        set({ currentSession: null })
        return res.session
      },
      loadCurrentSession: async (userId) => {
        if (!userId) { set({ currentSession: null }); return }
        const data = await apiFetch<{ session: CashSession | null }>(`/api/cash/sessions?userId=${userId}`)
        if (data.session) hydrateDatabaseCache({ cashSessions: [data.session, ...cashSessionsDB.getAll().filter((s) => s.id !== data.session?.id)] })
        set({ currentSession: data.session })
      },
      addMovement: async (type, amount, description, userId, referenceId) => {
        const session = get().currentSession
        if (!session) return null
        const res = await apiFetch<{ movement: CashMovement }>('/api/cash/movements', { method: 'POST', body: JSON.stringify({ cashSessionId: session.id, type, amount, description, userId, referenceId }) })
        hydrateDatabaseCache({ cashMovements: [res.movement, ...cashMovementsDB.getAll()] })
        return res.movement
      },
      getSessionSummary: () => {
        const currentSession = get().currentSession
        if (!currentSession) return null
        const sales = salesDB.getBySession(currentSession.id).filter((s) => s.status === 'completed')
        const byPaymentMethod: Record<PaymentMethod, number> = { cash: 0, card: 0, transfer: 0, voucher: 0 }
        let totalSales = 0
        for (const sale of sales) {
          totalSales += sale.total
          for (const payment of salePaymentsDB.getBySale(sale.id)) byPaymentMethod[payment.method] += payment.amount - payment.changeAmount
        }
        const movements = cashMovementsDB.getBySession(currentSession.id)
        const withdrawals = movements.filter((m) => m.type === 'withdrawal').reduce((s, m) => s + m.amount, 0)
        const deposits = movements.filter((m) => m.type === 'deposit').reduce((s, m) => s + m.amount, 0)
        const returns = movements.filter((m) => m.type === 'return').reduce((s, m) => s + m.amount, 0)
        return { totalSales, salesCount: sales.length, byPaymentMethod, withdrawals, deposits, returns, expectedCash: currentSession.openingAmount + byPaymentMethod.cash - withdrawals + deposits - returns }
      },
    }),
    { name: 'ventamx-cash', partialize: (state) => ({ currentSession: state.currentSession }) }
  )
)

export function useCurrentSession(): CashSession | null { return useCashStore((state) => state.currentSession) }
export function useHasOpenSession(): boolean { return useCashStore((state) => state.currentSession !== null) }
