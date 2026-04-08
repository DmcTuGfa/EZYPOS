// ===========================================
// STORE DEL CARRITO DE COMPRAS (POS)
// ===========================================

import { create } from 'zustand'
import type { CartItem, CartDiscount, Product, Customer, PaymentMethod } from '@/lib/types'

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
  addItem: (product: Product, quantity?: number) => void
  updateItemQuantity: (productId: string, quantity: number) => void
  removeItem: (productId: string) => void
  setItemDiscount: (productId: string, amount: number) => void
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

  addItem: (product: Product, quantity = 1) => {
    const { items } = get()
    const existingIndex = items.findIndex((item) => item.productId === product.id)
    
    if (existingIndex >= 0) {
      // Update quantity of existing item
      const newItems = [...items]
      newItems[existingIndex] = {
        ...newItems[existingIndex],
        quantity: newItems[existingIndex].quantity + quantity,
      }
      set({ items: newItems })
    } else {
      // Add new item
      const newItem: CartItem = {
        productId: product.id,
        product,
        quantity,
        unitPrice: product.salePrice,
        taxRate: product.taxRate,
        discountAmount: 0,
      }
      set({ items: [...items, newItem] })
    }
  },

  updateItemQuantity: (productId: string, quantity: number) => {
    const { items } = get()
    if (quantity <= 0) {
      set({ items: items.filter((item) => item.productId !== productId) })
    } else {
      set({
        items: items.map((item) =>
          item.productId === productId ? { ...item, quantity } : item
        ),
      })
    }
  },

  removeItem: (productId: string) => {
    const { items } = get()
    set({ items: items.filter((item) => item.productId !== productId) })
  },

  setItemDiscount: (productId: string, amount: number) => {
    const { items } = get()
    set({
      items: items.map((item) =>
        item.productId === productId ? { ...item, discountAmount: amount } : item
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
