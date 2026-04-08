import { create } from "zustand"
import type { Customer } from "@/lib/types"
import { db } from "@/lib/db/local-storage"

interface CustomersState {
  customers: Customer[]
  isLoading: boolean
  loadCustomers: () => void
  saveCustomer: (customer: Customer) => void
  deleteCustomer: (id: string) => void
  getCustomerById: (id: string) => Customer | undefined
  searchCustomers: (query: string) => Customer[]
}

export const useCustomersStore = create<CustomersState>((set, get) => ({
  customers: [],
  isLoading: false,

  loadCustomers: () => {
    set({ isLoading: true })
    const customers = db.customers.getAll()
    set({ customers, isLoading: false })
  },

  saveCustomer: (customer: Customer) => {
    const existing = db.customers.getById(customer.id)
    if (existing) {
      db.customers.update(customer.id, customer)
    } else {
      db.customers.create(customer)
    }
    get().loadCustomers()
  },

  deleteCustomer: (id: string) => {
    db.customers.delete(id)
    get().loadCustomers()
  },

  getCustomerById: (id: string) => {
    return get().customers.find(c => c.id === id)
  },

  searchCustomers: (query: string) => {
    const lowerQuery = query.toLowerCase()
    return get().customers.filter(c =>
      c.name.toLowerCase().includes(lowerQuery) ||
      c.rfc?.toLowerCase().includes(lowerQuery) ||
      c.email?.toLowerCase().includes(lowerQuery) ||
      c.phone?.includes(query)
    )
  },
}))
