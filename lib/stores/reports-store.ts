import { create } from 'zustand'
import { productStockDB, saleItemsDB, salesDB } from '@/lib/db/local-storage'

type Summary = {
  totalSales: number
  totalTransactions: number
  averageTicket: number
  cancelledSales: number
  invoicedSales: number
}

type TopProduct = {
  productId: string
  productName: string
  quantity: number
  total: number
}

interface ReportsState {
  summary: Summary
  topProducts: TopProduct[]
  lowStock: Array<{ productName: string; branchId: string; quantity: number; minStock: number }>
  loadReports: (branchId?: string) => void
}

export const useReportsStore = create<ReportsState>((set) => ({
  summary: {
    totalSales: 0,
    totalTransactions: 0,
    averageTicket: 0,
    cancelledSales: 0,
    invoicedSales: 0,
  },
  topProducts: [],
  lowStock: [],

  loadReports: (branchId) => {
    const sales = (branchId ? salesDB.getByBranch(branchId) : salesDB.getAll())
    const completed = sales.filter((sale) => sale.status !== 'cancelled')
    const totalSales = completed.reduce((sum, sale) => sum + sale.total, 0)
    const totalTransactions = completed.length
    const averageTicket = totalTransactions > 0 ? totalSales / totalTransactions : 0
    const cancelledSales = sales.filter((sale) => sale.status === 'cancelled').length
    const invoicedSales = sales.filter((sale) => sale.invoiceStatus === 'invoiced').length

    const items = saleItemsDB.getAll().filter((item) => {
      const sale = sales.find((entry) => entry.id === item.saleId)
      return Boolean(sale && sale.status !== 'cancelled')
    })

    const grouped = new Map<string, TopProduct>()
    for (const item of items) {
      const current = grouped.get(item.productId)
      if (current) {
        current.quantity += item.quantity
        current.total += item.total
      } else {
        grouped.set(item.productId, {
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          total: item.total,
        })
      }
    }

    const topProducts = Array.from(grouped.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)

    const lowStock = productStockDB.getLowStock(branchId).map((entry) => ({
      productName: entry.product.name,
      branchId: entry.stock.branchId,
      quantity: entry.stock.quantity,
      minStock: entry.minStock,
    }))

    set({
      summary: { totalSales, totalTransactions, averageTicket, cancelledSales, invoicedSales },
      topProducts,
      lowStock,
    })
  },
}))
