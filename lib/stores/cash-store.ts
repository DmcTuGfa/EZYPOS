
import { create } from 'zustand'
import type { CashMovement, CashRegister, CashSession, PaymentMethod, Sale, SalePayment } from '@/lib/types'
import { apiFetch } from '@/lib/api/client'

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
  movements: CashMovement[]
  isLoading: boolean
  loadRegisters: (branchId: string) => Promise<void>
  openSession: (registerId: string, userId: string, branchId: string, openingAmount: number) => Promise<CashSession | null>
  closeSession: (closingAmount: number, notes: string) => Promise<CashSession | null>
  loadCurrentSession: (userId?: string) => Promise<void>
  addMovement: (type: CashMovement['type'], amount: number, description: string, userId: string, referenceId?: string) => Promise<CashMovement | null>
  getSessionSummary: () => Promise<SessionSummary | null>
}

export const useCashStore = create<CashState>((set, get) => ({
  currentSession: null,
  registers: [],
  movements: [],
  isLoading: false,
  loadRegisters: async (branchId) => {
    set({ isLoading: true })
    const data = await apiFetch<{ registers: CashRegister[] }>(`/api/cash/registers?branchId=${branchId}`)
    set({ registers: data.registers, isLoading: false })
  },
  openSession: async (registerId, userId, branchId, openingAmount) => {
    const res = await apiFetch<{ session: CashSession }>('/api/cash/sessions', { method: 'POST', body: JSON.stringify({ cashRegisterId: registerId, userId, branchId, openingAmount }) })
    set({ currentSession: res.session })
    return res.session
  },
  closeSession: async (closingAmount, notes) => {
    const currentSession = get().currentSession
    const summary = await get().getSessionSummary()
    if (!currentSession || !summary) return null
    const res = await apiFetch<{ session: CashSession }>(`/api/cash/sessions/${currentSession.id}/close`, { method: 'POST', body: JSON.stringify({ closingAmount, expectedAmount: summary.expectedCash, notes }) })
    set({ currentSession: null })
    return res.session
  },
  loadCurrentSession: async (userId) => {
    if (!userId) { set({ currentSession: null }); return }
    const data = await apiFetch<{ session: CashSession | null }>(`/api/cash/sessions?userId=${userId}`)
    set({ currentSession: data.session })
  },
  addMovement: async (type, amount, description, userId, referenceId) => {
    const session = get().currentSession
    if (!session) return null
    const res = await apiFetch<{ movement: CashMovement }>('/api/cash/movements', { method: 'POST', body: JSON.stringify({ cashSessionId: session.id, type, amount, description, userId, referenceId }) })
    const data = await apiFetch<{ movements: CashMovement[] }>(`/api/cash/movements?sessionId=${session.id}`)
    set({ movements: data.movements })
    return res.movement
  },
  getSessionSummary: async () => {
    const currentSession = get().currentSession
    if (!currentSession) return null
    const [salesRes, paymentsRes, movementsRes] = await Promise.all([
      apiFetch<{ sales: Sale[] }>(`/api/sales?branchId=${currentSession.branchId}`),
      apiFetch<{ salePayments: SalePayment[] }>(`/api/bootstrap` as any).then((d:any)=>({salePayments:d.salePayments as SalePayment[]})),
      apiFetch<{ movements: CashMovement[] }>(`/api/cash/movements?sessionId=${currentSession.id}`),
    ])
    const sales = salesRes.sales.filter((s) => s.cashSessionId === currentSession.id && s.status === 'completed')
    const allPayments = paymentsRes.salePayments
    const byPaymentMethod: Record<PaymentMethod, number> = { cash: 0, card: 0, transfer: 0, voucher: 0 }
    let totalSales = 0
    for (const sale of sales) {
      totalSales += sale.total
      for (const payment of allPayments.filter((p) => p.saleId === sale.id)) byPaymentMethod[payment.method] += payment.amount - payment.changeAmount
    }
    const movements = movementsRes.movements
    const withdrawals = movements.filter((m) => m.type === 'withdrawal').reduce((s, m) => s + m.amount, 0)
    const deposits = movements.filter((m) => m.type === 'deposit').reduce((s, m) => s + m.amount, 0)
    const returns = movements.filter((m) => m.type === 'return').reduce((s, m) => s + m.amount, 0)
    return { totalSales, salesCount: sales.length, byPaymentMethod, withdrawals, deposits, returns, expectedCash: currentSession.openingAmount + byPaymentMethod.cash - withdrawals + deposits - returns }
  },
}))

export function useCurrentSession(): CashSession | null { return useCashStore((state) => state.currentSession) }
export function useHasOpenSession(): boolean { return useCashStore((state) => state.currentSession !== null) }
