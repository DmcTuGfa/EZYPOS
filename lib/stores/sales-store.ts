// ===========================================
// STORE DE VENTAS
// ===========================================

import { create } from 'zustand'
import type {
  Sale,
  SaleItem,
  SalePayment,
  CartItem,
  Customer,
  DiscountType,
  PaymentMethod,
} from '@/lib/types'
import {
  salesDB,
  saleItemsDB,
  salePaymentsDB,
  productStockDB,
  inventoryMovementsDB,
  cashMovementsDB,
  branchesDB,
} from '@/lib/db/local-storage'

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

interface SalesState {
  sales: Sale[]
  isLoading: boolean
  
  // Actions
  loadSales: (branchId?: string) => void
  loadSalesByDateRange: (startDate: Date, endDate: Date, branchId?: string) => void
  getSaleWithDetails: (saleId: string) => SaleWithDetails | null
  createSale: (params: CreateSaleParams) => Sale | null
  cancelSale: (saleId: string, userId: string, reason: string) => Sale | null
}

export interface SaleWithDetails extends Sale {
  items: SaleItem[]
  payments: SalePayment[]
}

export const useSalesStore = create<SalesState>((set, get) => ({
  sales: [],
  isLoading: false,

  loadSales: (branchId?: string) => {
    set({ isLoading: true })
    const sales = branchId ? salesDB.getByBranch(branchId) : salesDB.getAll()
    // Sort by date descending
    sales.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    set({ sales, isLoading: false })
  },

  loadSalesByDateRange: (startDate: Date, endDate: Date, branchId?: string) => {
    set({ isLoading: true })
    const sales = salesDB.getByDateRange(startDate, endDate, branchId)
    sales.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    set({ sales, isLoading: false })
  },

  getSaleWithDetails: (saleId: string): SaleWithDetails | null => {
    const sale = salesDB.getById(saleId)
    if (!sale) return null
    
    const items = saleItemsDB.getBySale(saleId)
    const payments = salePaymentsDB.getBySale(saleId)
    
    return { ...sale, items, payments }
  },

  createSale: (params: CreateSaleParams): Sale | null => {
    const {
      branchId,
      cashSessionId,
      userId,
      items,
      customer,
      discount,
      payments,
      notes,
    } = params
    
    if (items.length === 0) return null
    
    // Calculate totals
    let subtotal = 0
    let taxAmount = 0
    
    for (const item of items) {
      const itemSubtotal = item.unitPrice * item.quantity - item.discountAmount
      subtotal += itemSubtotal
      taxAmount += itemSubtotal * (item.taxRate / 100)
    }
    
    // Calculate discount
    let discountAmount = 0
    if (discount) {
      if (discount.type === 'percentage') {
        discountAmount = subtotal * (discount.value / 100)
      } else {
        discountAmount = discount.value
      }
    }
    
    const total = subtotal + taxAmount - discountAmount
    
    // Get branch for folio
    const branch = branchesDB.getById(branchId)
    const folio = salesDB.getNextFolio(branch?.code || 'VTA')
    
    // Create sale
    const sale = salesDB.create({
      folio,
      branchId,
      cashSessionId,
      userId,
      customerId: customer?.id || null,
      subtotal,
      taxAmount,
      discountAmount,
      discountType: discount?.type || null,
      discountValue: discount?.value || null,
      total,
      status: 'completed',
      invoiceStatus: 'pending',
      notes,
      cancelledAt: null,
      cancelledBy: null,
      cancelReason: '',
    })
    
    // Create sale items
    const saleItems = items.map((item) => {
      const itemSubtotal = item.unitPrice * item.quantity - item.discountAmount
      const itemTax = itemSubtotal * (item.taxRate / 100)
      
      return {
        saleId: sale.id,
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
    saleItemsDB.createMany(saleItems)
    
    // Create payments
    const salePayments = payments.map((p) => ({
      saleId: sale.id,
      method: p.method,
      amount: p.amount,
      reference: p.reference || '',
      changeAmount: p.changeAmount || 0,
    }))
    salePaymentsDB.createMany(salePayments)
    
    // Update inventory
    for (const item of items) {
      // Decrease stock
      productStockDB.adjustQuantity(item.productId, branchId, -item.quantity)
      
      // Create inventory movement
      inventoryMovementsDB.create({
        productId: item.productId,
        branchId,
        fromBranchId: null,
        toBranchId: null,
        type: 'sale',
        quantity: -item.quantity,
        reason: `Venta ${folio}`,
        referenceId: sale.id,
        userId,
      })
    }
    
    // Create cash movement for cash payments
    const cashPayment = payments.find((p) => p.method === 'cash')
    if (cashPayment) {
      cashMovementsDB.create({
        cashSessionId,
        type: 'sale',
        amount: cashPayment.amount - (cashPayment.changeAmount || 0),
        description: `Venta ${folio}`,
        referenceId: sale.id,
        userId,
      })
    }
    
    // Reload sales
    get().loadSales(branchId)
    
    return sale
  },

  cancelSale: (saleId: string, userId: string, reason: string): Sale | null => {
    const sale = salesDB.getById(saleId)
    if (!sale || sale.status === 'cancelled') return null
    
    // Cancel the sale
    const cancelled = salesDB.cancel(saleId, userId, reason)
    if (!cancelled) return null
    
    // Restore inventory
    const items = saleItemsDB.getBySale(saleId)
    for (const item of items) {
      productStockDB.adjustQuantity(item.productId, sale.branchId, item.quantity)
      
      inventoryMovementsDB.create({
        productId: item.productId,
        branchId: sale.branchId,
        fromBranchId: null,
        toBranchId: null,
        type: 'return',
        quantity: item.quantity,
        reason: `Cancelación de venta ${sale.folio}`,
        referenceId: saleId,
        userId,
      })
    }
    
    // Reload sales
    get().loadSales(sale.branchId)
    
    return cancelled
  },
}))

export function useSales(): Sale[] {
  return useSalesStore((state) => state.sales)
}
