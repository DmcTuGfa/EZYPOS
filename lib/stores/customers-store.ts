import { create } from 'zustand'
import type { Customer } from '@/lib/types'
import { apiFetch } from '@/lib/api/client'
import { hydrateDatabaseCache } from '@/lib/db/local-storage'

interface CustomersState {
  customers: Customer[]
  isLoading: boolean
  loadCustomers: () => Promise<void>
  saveCustomer: (customer: Customer) => Promise<void>
  deleteCustomer: (id: string) => Promise<void>
  getCustomerById: (id: string) => Customer | undefined
  searchCustomers: (query: string) => Customer[]
}

export const useCustomersStore = create<CustomersState>((set, get) => ({
  customers: [], isLoading: false,
  loadCustomers: async () => {
    set({ isLoading: true })
    const data = await apiFetch<{ customers: Customer[] }>('/api/customers')
    hydrateDatabaseCache({ customers: data.customers })
    set({ customers: data.customers, isLoading: false })
  },
  saveCustomer: async (customer) => {
    if (get().customers.find((c) => c.id === customer.id)) {
      await apiFetch(`/api/customers/${customer.id}`, { method: 'PATCH', body: JSON.stringify(customer) })
    } else {
      await apiFetch('/api/customers', { method: 'POST', body: JSON.stringify(customer) })
    }
    await get().loadCustomers()
  },
  deleteCustomer: async (id) => {
    await apiFetch(`/api/customers/${id}`, { method: 'DELETE' })
    await get().loadCustomers()
  },
  getCustomerById: (id) => get().customers.find(c => c.id === id),
  searchCustomers: (query) => {
    const q = query.toLowerCase()
    return get().customers.filter(c => [c.name, c.rfc, c.email, c.phone].some(v => (v || '').toLowerCase().includes(q)))
  },
}))
