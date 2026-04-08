// ===========================================
// STORE DE CAJA / SESIONES DE CAJA
// ===========================================

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CashSession, CashRegister, CashMovement, PaymentMethod } from '@/lib/types'
import {
  cashSessionsDB,
  cashRegistersDB,
  cashMovementsDB,
  salesDB,
  salePaymentsDB,
} from '@/lib/db/local-storage'

interface CashState {
  currentSession: CashSession | null
  registers: CashRegister[]
  isLoading: boolean
  
  // Actions
  loadRegisters: (branchId: string) => void
  openSession: (
    registerId: string,
    userId: string,
    branchId: string,
    openingAmount: number
  ) => CashSession | null
  closeSession: (closingAmount: number, notes: string) => CashSession | null
  loadCurrentSession: (userId: string) => void
  addMovement: (
    type: CashMovement['type'],
    amount: number,
    description: string,
    userId: string,
    referenceId?: string
  ) => CashMovement | null
  getSessionSummary: () => SessionSummary | null
}

interface SessionSummary {
  totalSales: number
  salesCount: number
  byPaymentMethod: Record<PaymentMethod, number>
  withdrawals: number
  deposits: number
  returns: number
  expectedCash: number
}

export const useCashStore = create<CashState>()(
  persist(
    (set, get) => ({
      currentSession: null,
      registers: [],
      isLoading: false,

      loadRegisters: (branchId: string) => {
        set({ isLoading: true })
        const registers = cashRegistersDB.getByBranch(branchId)
        set({ registers, isLoading: false })
      },

      openSession: (
        registerId: string,
        userId: string,
        branchId: string,
        openingAmount: number
      ): CashSession | null => {
        // Check if user already has an open session
        const existingUserSession = cashSessionsDB.getOpenByUser(userId)
        if (existingUserSession) {
          return null // User already has an open session
        }
        
        // Check if register already has an open session
        const existingRegisterSession = cashSessionsDB.getOpenByRegister(registerId)
        if (existingRegisterSession) {
          return null // Register already has an open session
        }
        
        const session = cashSessionsDB.create({
          cashRegisterId: registerId,
          userId,
          branchId,
          openingAmount,
          closingAmount: null,
          expectedAmount: null,
          difference: null,
          status: 'open',
          notes: '',
          closedAt: null,
        })
        
        set({ currentSession: session })
        return session
      },

      closeSession: (closingAmount: number, notes: string): CashSession | null => {
        const { currentSession, getSessionSummary } = get()
        if (!currentSession) return null
        
        const summary = getSessionSummary()
        if (!summary) return null
        
        const closedSession = cashSessionsDB.close(
          currentSession.id,
          closingAmount,
          summary.expectedCash,
          notes
        )
        
        if (closedSession) {
          set({ currentSession: null })
        }
        
        return closedSession || null
      },

      loadCurrentSession: (userId: string) => {
        const session = cashSessionsDB.getOpenByUser(userId)
        set({ currentSession: session || null })
      },

      addMovement: (
        type: CashMovement['type'],
        amount: number,
        description: string,
        userId: string,
        referenceId?: string
      ): CashMovement | null => {
        const { currentSession } = get()
        if (!currentSession) return null
        
        const movement = cashMovementsDB.create({
          cashSessionId: currentSession.id,
          type,
          amount,
          description,
          referenceId: referenceId || null,
          userId,
        })
        
        return movement
      },

      getSessionSummary: (): SessionSummary | null => {
        const { currentSession } = get()
        if (!currentSession) return null
        
        // Get all sales for this session
        const sales = salesDB.getBySession(currentSession.id)
        const completedSales = sales.filter((s) => s.status === 'completed')
        
        // Calculate totals by payment method
        const byPaymentMethod: Record<PaymentMethod, number> = {
          cash: 0,
          card: 0,
          transfer: 0,
          voucher: 0,
        }
        
        let totalSales = 0
        
        for (const sale of completedSales) {
          totalSales += sale.total
          const payments = salePaymentsDB.getBySale(sale.id)
          for (const payment of payments) {
            byPaymentMethod[payment.method] += payment.amount - payment.changeAmount
          }
        }
        
        // Get movements for this session
        const movements = cashMovementsDB.getBySession(currentSession.id)
        
        let withdrawals = 0
        let deposits = 0
        let returns = 0
        
        for (const movement of movements) {
          if (movement.type === 'withdrawal') withdrawals += movement.amount
          if (movement.type === 'deposit') deposits += movement.amount
          if (movement.type === 'return') returns += movement.amount
        }
        
        // Calculate expected cash
        const expectedCash =
          currentSession.openingAmount +
          byPaymentMethod.cash -
          withdrawals +
          deposits -
          returns
        
        return {
          totalSales,
          salesCount: completedSales.length,
          byPaymentMethod,
          withdrawals,
          deposits,
          returns,
          expectedCash,
        }
      },
    }),
    {
      name: 'ventamx-cash',
      partialize: (state) => ({ currentSession: state.currentSession }),
    }
  )
)

export function useCurrentSession(): CashSession | null {
  return useCashStore((state) => state.currentSession)
}

export function useHasOpenSession(): boolean {
  return useCashStore((state) => state.currentSession !== null)
}
