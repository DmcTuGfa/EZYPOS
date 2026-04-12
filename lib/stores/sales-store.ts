'use client'

import { create } from 'zustand'
import type { CartItem, Customer, DiscountType, PaymentMethod, Sale, SaleItem, SalePayment } from '@/lib/types'
import { apiFetch } from '@/lib/api/client'

interface Payment {
  method: PaymentMethod
  amount: number
  reference?: string
  changeAmount?: number
}

interface CreateSaleParams {
  branchId: string
  cashSessionId: string
  userId: string
  items: CartItem[]
  customer: Customer | null
  discount: { type: DiscountType; value: number } | null
  payments: Payment[]
  notes: string
}

interface SaleWithDetails extends Sale {
  items: SaleItem[]
  payments: SalePayment[]
}

interface SalesState {
  sales: Sale[]
  isLoading: boolean
  loadSales: (branchId?: string) => Promise<void>
  loadSalesByDateRange: (startDate: Date, endDate: Date, branchId?: string) => Promise<void>
  getSaleWithDetails: (saleId: string) => Promise<SaleWithDetails | null>
  createSale: (params: CreateSaleParams) => Promise<Sale | null>
  cancelSale: (saleId: string, userId: string, reason: string) => Promise<Sale | null>
}

export const useSalesStore = create<SalesState>((set, get) => ({
  sales: [],
  isLoading: false,

  loadSales: async (branchId) => {
    set({ isLoading: true })
    try {
      const data = await apiFetch<{ sales: Sale[] }>(
        `/api/sales${branchId ? `?branchId=${branchId}` : ''}`
      )
      set({ sales: data.sales, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  loadSalesByDateRange: async (startDate, endDate, branchId) => {
    await get().loadSales(branchId)
    set({
      sales: get().sales.filter((s) => {
        const created = new Date(s.createdAt)
        return created >= startDate && created <= endDate
      }),
    })
  },

  getSaleWithDetails: async (saleId) => {
    try {
      const data = await apiFetch<{ sale: Sale; items: SaleItem[]; payments: SalePayment[] }>(
        `/api/sales/${saleId}`
      )
      return { ...data.sale, items: data.items, payments: data.payments }
    } catch {
      return null
    }
  },

  createSale: async (params) => {
    try {
      const subtotal = params.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
      const taxAmount = params.items.reduce(
        (sum, item) =>
          sum + (item.unitPrice * item.quantity - item.discountAmount) * (item.taxRate / 100),
        0
      )
      let discountAmount = 0
      if (params.discount) {
        discountAmount =
          params.discount.type === 'percentage'
            ? subtotal * (params.discount.value / 100)
            : params.discount.value
      }
      const total = subtotal + taxAmount - discountAmount

      const items = params.items.map((item) => {
        const itemSubtotal = item.unitPrice * item.quantity - item.discountAmount
        const itemTax = itemSubtotal * (item.taxRate / 100)
        return {
          productId: item.productId,
          productName: item.product.name,
          productSku: item.product.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          taxAmount: itemTax,
          discountAmount: item.discountAmount,
          subtotal: itemSubtotal,
          total: itemSubtotal + itemTax,
        }
      })

      const res = await apiFetch<{ sale: Sale }>('/api/sales', {
        method: 'POST',
        body: JSON.stringify({
          ...params,
          subtotal,
          taxAmount,
          discountAmount,
          discountType: params.discount?.type || null,
          discountValue: params.discount?.value || null,
          total,
          items,
        }),
      })

      await get().loadSales(params.branchId)
      return res.sale
    } catch (e: any) {
      throw e // Re-lanzar para que PaymentPanel lo capture y muestre el error
    }
  },

  cancelSale: async (saleId, userId, reason) => {
    try {
      const res = await apiFetch<{ sale: Sale }>(`/api/sales/${saleId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ userId, reason }),
      })
      await get().loadSales()
      return res.sale
    } catch {
      return null
    }
  },
}))

export function useSales(): Sale[] {
  return useSalesStore((state) => state.sales)
}
