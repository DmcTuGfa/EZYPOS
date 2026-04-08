import { create } from 'zustand'
import type { Invoice } from '@/lib/types'
import { customersDB, invoicesDB, salesDB, settingsDB } from '@/lib/db/local-storage'

interface InvoiceState {
  invoices: Invoice[]
  isLoading: boolean
  loadInvoices: () => void
  createInvoiceFromSale: (saleId: string) => Invoice | null
  cancelInvoice: (invoiceId: string, reason: string) => Invoice | undefined
}

export const useInvoicesStore = create<InvoiceState>((set) => ({
  invoices: [],
  isLoading: false,

  loadInvoices: () => {
    set({ isLoading: true })
    const invoices = invoicesDB.getAll().sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    set({ invoices, isLoading: false })
  },

  createInvoiceFromSale: (saleId) => {
    const existing = invoicesDB.getBySale(saleId)
    if (existing) return existing

    const sale = salesDB.getById(saleId)
    if (!sale || sale.status === 'cancelled' || !sale.customerId) return null

    const customer = customersDB.getById(sale.customerId)
    const settings = settingsDB.get()
    if (!customer) return null

    const invoice = invoicesDB.create({
      saleId: sale.id,
      internalFolio: invoicesDB.getNextFolio(settings.invoiceSeries || 'A'),
      uuid: `DEMO-${Date.now()}`,
      customerId: customer.id,
      issuerRfc: settings.rfc,
      issuerName: settings.businessName,
      issuerRegime: settings.taxRegime,
      issuerPostalCode: settings.postalCode,
      receiverRfc: customer.rfc,
      receiverName: customer.name,
      receiverRegime: customer.taxRegime,
      receiverPostalCode: customer.postalCode,
      cfdiUse: customer.cfdiUse,
      subtotal: sale.subtotal,
      taxAmount: sale.taxAmount,
      total: sale.total,
      status: 'stamped',
      xmlContent: `<cfdi folio="${sale.folio}" total="${sale.total.toFixed(2)}" />`,
      pdfUrl: null,
      stampedAt: new Date(),
      cancelledAt: null,
      cancelReason: '',
    })

    salesDB.update(sale.id, { status: 'invoiced', invoiceStatus: 'invoiced' })
    set({ invoices: invoicesDB.getAll() })
    return invoice
  },

  cancelInvoice: (invoiceId, reason) => {
    const invoice = invoicesDB.update(invoiceId, {
      status: 'cancelled',
      cancelledAt: new Date(),
      cancelReason: reason,
    })

    if (invoice) {
      salesDB.update(invoice.saleId, { invoiceStatus: 'pending', status: 'completed' })
    }

    set({ invoices: invoicesDB.getAll() })
    return invoice
  },
}))
