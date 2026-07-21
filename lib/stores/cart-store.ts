// ===========================================
// STORE DEL CARRITO DE COMPRAS (POS)
// ===========================================

import { create } from 'zustand'
import type { CartItem, CartDiscount, Product, ProductExtra, ProductPortion, Customer, PaymentMethod } from '@/lib/types'

interface Payment {
  method: PaymentMethod
  amount: number
  reference?: string
}

interface CartState {
  items: CartItem[]
  customer: Customer | null
  discount: CartDiscount | null
  payments: Payment[]
  notes: string
  
  // Computed (getters)
  // Actions
  addItem: (product: Product, quantity?: number, options?: { portion?: ProductPortion | null; extras?: ProductExtra[] }) => void
  updateItemQuantity: (lineId: string, quantity: number) => void
  removeItem: (lineId: string) => void
  setItemDiscount: (lineId: string, amount: number) => void
  setCustomer: (customer: Customer | null) => void
  setDiscount: (discount: CartDiscount | null) => void
  addPayment: (payment: Payment) => void
  removePayment: (index: number) => void
  clearPayments: () => void
  setNotes: (notes: string) => void
  clearCart: () => void
  
  // Calculated values
  getSubtotal: () => number
  getTaxAmount: () => number
  getDiscountAmount: () => number
  getTotal: () => number
  getItemCount: () => number
  getTotalPaid: () => number
  getChange: () => number
  isFullyPaid: () => boolean
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customer: null,
  discount: null,
  payments: [],
  notes: '',

  addItem: (product: Product, quantity = 1, options) => {
    const { items } = get()
    const portion = options?.portion || null
    const extras = options?.extras || []
    const extrasTotal = extras.reduce((sum, extra) => sum + Number(extra.price || 0), 0)
    const unitPrice = (portion ? portion.price : product.salePrice) + extrasTotal

    // Dos líneas se combinan solo si son idénticas (misma porción y mismos extras)
    const signature = (p: ProductPortion | null, e: ProductExtra[]) =>
      `${p?.id || ''}|${e.map((x) => x.id).sort().join(',')}`
    const existingIndex = items.findIndex(
      (item) =>
        item.productId === product.id &&
        signature(item.portion || null, item.extras || []) === signature(portion, extras)
    )

    if (existingIndex >= 0) {
      const newItems = [...items]
      newItems[existingIndex] = {
        ...newItems[existingIndex],
        quantity: newItems[existingIndex].quantity + quantity,
      }
      set({ items: newItems })
    } else {
      const newItem: CartItem = {
        lineId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        productId: product.id,
        product,
        quantity,
        unitPrice,
        taxRate: product.taxRate,
        discountAmount: 0,
        portion,
        extras,
      }
      set({ items: [...items, newItem] })
    }
  },

  updateItemQuantity: (lineId: string, quantity: number) => {
    const { items } = get()
    if (quantity <= 0) {
      set({ items: items.filter((item) => item.lineId !== lineId) })
    } else {
      set({
        items: items.map((item) =>
          item.lineId === lineId ? { ...item, quantity } : item
        ),
      })
    }
  },

  removeItem: (lineId: string) => {
    const { items } = get()
    set({ items: items.filter((item) => item.lineId !== lineId) })
  },

  setItemDiscount: (lineId: string, amount: number) => {
    const { items } = get()
    set({
      items: items.map((item) =>
        item.lineId === lineId ? { ...item, discountAmount: amount } : item
      ),
    })
  },

  setCustomer: (customer: Customer | null) => {
    set({ customer })
  },

  setDiscount: (discount: CartDiscount | null) => {
    set({ discount })
  },

  addPayment: (payment: Payment) => {
    const { payments } = get()
    set({ payments: [...payments, payment] })
  },

  removePayment: (index: number) => {
    const { payments } = get()
    set({ payments: payments.filter((_, i) => i !== index) })
  },

  clearPayments: () => {
    set({ payments: [] })
  },

  setNotes: (notes: string) => {
    set({ notes })
  },

  clearCart: () => {
    set({
      items: [],
      customer: null,
      discount: null,
      payments: [],
      notes: '',
    })
  },

  // Calculated values
  getSubtotal: () => {
    const { items } = get()
    return items.reduce((sum, item) => {
      const itemSubtotal = item.unitPrice * item.quantity - item.discountAmount
      return sum + itemSubtotal
    }, 0)
  },

  getTaxAmount: () => {
    const { items } = get()
    return items.reduce((sum, item) => {
      const itemSubtotal = item.unitPrice * item.quantity - item.discountAmount
      const itemTax = itemSubtotal * (item.taxRate / 100)
      return sum + itemTax
    }, 0)
  },

  getDiscountAmount: () => {
    const { discount } = get()
    if (!discount) return 0
    
    const subtotal = get().getSubtotal()
    
    if (discount.type === 'percentage') {
      return subtotal * (discount.value / 100)
    }
    return discount.value
  },

  getTotal: () => {
    const subtotal = get().getSubtotal()
    const tax = get().getTaxAmount()
    const discount = get().getDiscountAmount()
    return subtotal + tax - discount
  },

  getItemCount: () => {
    const { items } = get()
    return items.reduce((sum, item) => sum + item.quantity, 0)
  },

  getTotalPaid: () => {
    const { payments } = get()
    return payments.reduce((sum, p) => sum + p.amount, 0)
  },

  getChange: () => {
    const total = get().getTotal()
    const paid = get().getTotalPaid()
    return Math.max(0, paid - total)
  },

  isFullyPaid: () => {
    const total = get().getTotal()
    const paid = get().getTotalPaid()
    return paid >= total
  },
}))

// Hooks de conveniencia
export function useCartItems(): CartItem[] {
  return useCartStore((state) => state.items)
}

export function useCartTotal(): number {
  return useCartStore((state) => state.getTotal())
}

export function useCartCustomer(): Customer | null {
  return useCartStore((state) => state.customer)
}
