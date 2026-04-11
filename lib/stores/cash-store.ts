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
  loadCurrentSession: (userId?: string, branchId?: string) => Promise<void>
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
    try {
      const data = await apiFetch<{ registers: CashRegister[] }>(`/api/cash/registers?branchId=${branchId}`)
      set({ registers: data.registers, isLoading: false })
    } catch {
      set({ registers: [], isLoading: false })
    }
  },

  openSession: async (registerId, userId, branchId, openingAmount) => {
    const res = await apiFetch<{ session: CashSession }>('/api/cash/sessions', {
      method: 'POST',
      body: JSON.stringify({
        cashRegisterId: registerId,
        userId,
        branchId,
        openingAmount,
      }),
    })
    set({ currentSession: res.session })
    return res.session
  },

  closeSession: async (closingAmount, notes) => {
    const currentSession = get().currentSession
    const summary = await get().getSessionSummary()
    if (!currentSession || !summary) return null

    const res = await apiFetch<{ session: CashSession }>(
      `/api/cash/sessions/${currentSession.id}/close`,
      {
        method: 'POST',
        body: JSON.stringify({
          closingAmount,
          expectedAmount: summary.expectedCash,
          notes,
        }),
      }
    )

    set({ currentSession: null, movements: [] })
    return res.session
  },

  loadCurrentSession: async (userId, branchId) => {
    if (!userId && !branchId) {
      set({ currentSession: null })
      return
    }

    const params = new URLSearchParams()
    if (userId) params.set('userId', userId)
    if (branchId) params.set('branchId', branchId)

    try {
      const data = await apiFetch<{ session?: CashSession | null; sessions?: CashSession[] }>(
        `/api/cash/sessions?${params.toString()}`
      )

      if ('session' in data) {
        set({ currentSession: data.session ?? null })
        return
      }

      const session = (data.sessions || []).find((item) => item.status === 'open') ?? null
      set({ currentSession: session })
    } catch {
      set({ currentSession: null })
    }
  },

  addMovement: async (type, amount, description, userId, referenceId) => {
    const session = get().currentSession
    if (!session) return null

    const res = await apiFetch<{ movement: CashMovement }>('/api/cash/movements', {
      method: 'POST',
      body: JSON.stringify({
        cashSessionId: session.id,
        type,
        amount,
        description,
        userId,
        referenceId,
      }),
    })

    const data = await apiFetch<{ movements: CashMovement[] }>(
      `/api/cash/movements?sessionId=${session.id}`
    )
    set({ movements: data.movements })
    return res.movement
  },

  getSessionSummary: async () => {
    const currentSession = get().currentSession
    if (!currentSession) return null

    const [salesRes, paymentsBootstrap, movementsRes] = await Promise.all([
      apiFetch<{ sales: Sale[] }>(`/api/sales?branchId=${currentSession.branchId}`),
      apiFetch<{ salePayments: SalePayment[] }>(`/api/bootstrap` as any),
      apiFetch<{ movements: CashMovement[] }>(`/api/cash/movements?sessionId=${currentSession.id}`),
    ])

    const sales = salesRes.sales.filter(
      (sale) => sale.cashSessionId === currentSession.id && sale.status === 'completed'
    )

    const allPayments = paymentsBootstrap.salePayments || []
    const byPaymentMethod: Record<PaymentMethod, number> = {
      cash: 0,
      card: 0,
      transfer: 0,
      voucher: 0,
    }

    let totalSales = 0
    for (const sale of sales) {
      totalSales += sale.total
      for (const payment of allPayments.filter((p) => p.saleId === sale.id)) {
        // Restar el cambio entregado al cliente — el efectivo real en caja
        // es lo que pagó menos el cambio que salió
        const netAmount = payment.method === 'cash'
          ? payment.amount - (payment.changeAmount || 0)
          : payment.amount
        byPaymentMethod[payment.method] += netAmount
      }
    }

    const movements = movementsRes.movements || []
    const withdrawals = movements
      .filter((movement) => movement.type === 'withdrawal')
      .reduce((sum, movement) => sum + movement.amount, 0)

    const deposits = movements
      .filter((movement) => movement.type === 'deposit')
      .reduce((sum, movement) => sum + movement.amount, 0)

    const returns = 0
    const expectedCash =
      currentSession.openingAmount +
      byPaymentMethod.cash +
      deposits -
      withdrawals -
      returns

    return {
      totalSales,
      salesCount: sales.length,
      byPaymentMethod,
      withdrawals,
      deposits,
      returns,
      expectedCash,
    }
  },
}))
