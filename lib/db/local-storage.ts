// ===========================================
// CAPA DE DATOS CON LOCALSTORAGE
// Preparada para migrar a PostgreSQL/Neon
// ===========================================

import type {
  User,
  Role,
  Branch,
  Category,
  Product,
  ProductStock,
  Customer,
  CashRegister,
  CashSession,
  CashMovement,
  Sale,
  SaleItem,
  SalePayment,
  Invoice,
  InventoryMovement,
  BusinessSettings,
} from '@/lib/types'

import {
  DEMO_ROLES,
  DEMO_USERS,
  DEMO_BRANCHES,
  DEMO_CATEGORIES,
  DEMO_PRODUCTS,
  DEMO_PRODUCT_STOCK,
  DEMO_CUSTOMERS,
  DEMO_CASH_REGISTERS,
  DEMO_BUSINESS_SETTINGS,
} from '@/lib/data/demo-data'

// --- STORAGE KEYS ---

const STORAGE_KEYS = {
  ROLES: 'ventamx_roles',
  USERS: 'ventamx_users',
  BRANCHES: 'ventamx_branches',
  CATEGORIES: 'ventamx_categories',
  PRODUCTS: 'ventamx_products',
  PRODUCT_STOCK: 'ventamx_product_stock',
  CUSTOMERS: 'ventamx_customers',
  CASH_REGISTERS: 'ventamx_cash_registers',
  CASH_SESSIONS: 'ventamx_cash_sessions',
  CASH_MOVEMENTS: 'ventamx_cash_movements',
  SALES: 'ventamx_sales',
  SALE_ITEMS: 'ventamx_sale_items',
  SALE_PAYMENTS: 'ventamx_sale_payments',
  INVOICES: 'ventamx_invoices',
  INVENTORY_MOVEMENTS: 'ventamx_inventory_movements',
  SETTINGS: 'ventamx_settings',
  INITIALIZED: 'ventamx_initialized',
} as const

// --- HELPER FUNCTIONS ---

function getFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue
  try {
    const item = localStorage.getItem(key)
    if (!item) return defaultValue
    return JSON.parse(item, (_, value) => {
      // Revive dates
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
        return new Date(value)
      }
      return value
    })
  } catch {
    return defaultValue
  }
}

function setToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`Error saving to localStorage: ${key}`, error)
  }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

// --- INITIALIZATION ---

export function initializeDatabase(): void {
  if (typeof window === 'undefined') return
  
  const initialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED)
  if (initialized) return

  // Load demo data
  setToStorage(STORAGE_KEYS.ROLES, DEMO_ROLES)
  setToStorage(STORAGE_KEYS.USERS, DEMO_USERS)
  setToStorage(STORAGE_KEYS.BRANCHES, DEMO_BRANCHES)
  setToStorage(STORAGE_KEYS.CATEGORIES, DEMO_CATEGORIES)
  setToStorage(STORAGE_KEYS.PRODUCTS, DEMO_PRODUCTS)
  setToStorage(STORAGE_KEYS.PRODUCT_STOCK, DEMO_PRODUCT_STOCK)
  setToStorage(STORAGE_KEYS.CUSTOMERS, DEMO_CUSTOMERS)
  setToStorage(STORAGE_KEYS.CASH_REGISTERS, DEMO_CASH_REGISTERS)
  setToStorage(STORAGE_KEYS.CASH_SESSIONS, [])
  setToStorage(STORAGE_KEYS.CASH_MOVEMENTS, [])
  setToStorage(STORAGE_KEYS.SALES, [])
  setToStorage(STORAGE_KEYS.SALE_ITEMS, [])
  setToStorage(STORAGE_KEYS.SALE_PAYMENTS, [])
  setToStorage(STORAGE_KEYS.INVOICES, [])
  setToStorage(STORAGE_KEYS.INVENTORY_MOVEMENTS, [])
  setToStorage(STORAGE_KEYS.SETTINGS, DEMO_BUSINESS_SETTINGS)

  localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true')
}

export function resetDatabase(): void {
  if (typeof window === 'undefined') return
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key))
  initializeDatabase()
}


export function hydrateDatabaseCache(payload: Partial<Record<string, unknown>>): void {
  if (typeof window === 'undefined') return
  const map: Record<string, string> = {
    roles: STORAGE_KEYS.ROLES,
    users: STORAGE_KEYS.USERS,
    branches: STORAGE_KEYS.BRANCHES,
    categories: STORAGE_KEYS.CATEGORIES,
    products: STORAGE_KEYS.PRODUCTS,
    productStock: STORAGE_KEYS.PRODUCT_STOCK,
    customers: STORAGE_KEYS.CUSTOMERS,
    cashRegisters: STORAGE_KEYS.CASH_REGISTERS,
    cashSessions: STORAGE_KEYS.CASH_SESSIONS,
    cashMovements: STORAGE_KEYS.CASH_MOVEMENTS,
    sales: STORAGE_KEYS.SALES,
    saleItems: STORAGE_KEYS.SALE_ITEMS,
    salePayments: STORAGE_KEYS.SALE_PAYMENTS,
    inventoryMovements: STORAGE_KEYS.INVENTORY_MOVEMENTS,
  }
  for (const [key, storageKey] of Object.entries(map)) {
    if (payload[key] !== undefined) {
      setToStorage(storageKey, payload[key])
    }
  }
  localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true')
}

// --- ROLES ---

export const rolesDB = {
  getAll: (): Role[] => getFromStorage<Role[]>(STORAGE_KEYS.ROLES, []),
  getById: (id: string): Role | undefined => {
    const roles = rolesDB.getAll()
    return roles.find((r) => r.id === id)
  },
  getByName: (name: string): Role | undefined => {
    const roles = rolesDB.getAll()
    return roles.find((r) => r.name === name)
  },
}

// --- USERS ---

export const usersDB = {
  getAll: (): User[] => getFromStorage<User[]>(STORAGE_KEYS.USERS, []),
  getById: (id: string): User | undefined => {
    const users = usersDB.getAll()
    return users.find((u) => u.id === id)
  },
  getByEmail: (email: string): User | undefined => {
    const users = usersDB.getAll()
    return users.find((u) => u.email.toLowerCase() === email.toLowerCase())
  },
  getByBranch: (branchId: string): User[] => {
    const users = usersDB.getAll()
    return users.filter((u) => u.branchId === branchId)
  },
  create: (user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): User => {
    const users = usersDB.getAll()
    const newUser: User = {
      ...user,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setToStorage(STORAGE_KEYS.USERS, [...users, newUser])
    return newUser
  },
  update: (id: string, data: Partial<User>): User | undefined => {
    const users = usersDB.getAll()
    const index = users.findIndex((u) => u.id === id)
    if (index === -1) return undefined
    users[index] = { ...users[index], ...data, updatedAt: new Date() }
    setToStorage(STORAGE_KEYS.USERS, users)
    return users[index]
  },
  delete: (id: string): boolean => {
    const users = usersDB.getAll()
    const filtered = users.filter((u) => u.id !== id)
    if (filtered.length === users.length) return false
    setToStorage(STORAGE_KEYS.USERS, filtered)
    return true
  },
}

// --- BRANCHES ---

export const branchesDB = {
  getAll: (): Branch[] => getFromStorage<Branch[]>(STORAGE_KEYS.BRANCHES, []),
  getActive: (): Branch[] => branchesDB.getAll().filter((b) => b.isActive),
  getById: (id: string): Branch | undefined => {
    const branches = branchesDB.getAll()
    return branches.find((b) => b.id === id)
  },
  getByCode: (code: string): Branch | undefined => {
    const branches = branchesDB.getAll()
    return branches.find((b) => b.code === code)
  },
  create: (branch: Omit<Branch, 'id' | 'createdAt' | 'updatedAt'>): Branch => {
    const branches = branchesDB.getAll()
    const newBranch: Branch = {
      ...branch,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setToStorage(STORAGE_KEYS.BRANCHES, [...branches, newBranch])
    return newBranch
  },
  update: (id: string, data: Partial<Branch>): Branch | undefined => {
    const branches = branchesDB.getAll()
    const index = branches.findIndex((b) => b.id === id)
    if (index === -1) return undefined
    branches[index] = { ...branches[index], ...data, updatedAt: new Date() }
    setToStorage(STORAGE_KEYS.BRANCHES, branches)
    return branches[index]
  },
  delete: (id: string): boolean => {
    const branches = branchesDB.getAll()
    const index = branches.findIndex((b) => b.id === id)
    if (index === -1) return false
    branches[index] = { ...branches[index], isActive: false, updatedAt: new Date() }
    setToStorage(STORAGE_KEYS.BRANCHES, branches)
    return true
  },
}

// --- CATEGORIES ---

export const categoriesDB = {
  getAll: (): Category[] => getFromStorage<Category[]>(STORAGE_KEYS.CATEGORIES, []),
  getActive: (): Category[] => categoriesDB.getAll().filter((c) => c.isActive),
  getById: (id: string): Category | undefined => {
    const categories = categoriesDB.getAll()
    return categories.find((c) => c.id === id)
  },
  create: (category: Omit<Category, 'id' | 'createdAt'>): Category => {
    const categories = categoriesDB.getAll()
    const newCategory: Category = {
      ...category,
      id: generateId(),
      createdAt: new Date(),
    }
    setToStorage(STORAGE_KEYS.CATEGORIES, [...categories, newCategory])
    return newCategory
  },
  update: (id: string, data: Partial<Category>): Category | undefined => {
    const categories = categoriesDB.getAll()
    const index = categories.findIndex((c) => c.id === id)
    if (index === -1) return undefined
    categories[index] = { ...categories[index], ...data }
    setToStorage(STORAGE_KEYS.CATEGORIES, categories)
    return categories[index]
  },
}

// --- PRODUCTS ---

export const productsDB = {
  getAll: (): Product[] => getFromStorage<Product[]>(STORAGE_KEYS.PRODUCTS, []),
  getActive: (): Product[] => productsDB.getAll().filter((p) => p.isActive),
  getById: (id: string): Product | undefined => {
    const products = productsDB.getAll()
    return products.find((p) => p.id === id)
  },
  getBySku: (sku: string): Product | undefined => {
    const products = productsDB.getAll()
    return products.find((p) => p.sku === sku)
  },
  getByBarcode: (barcode: string): Product | undefined => {
    const products = productsDB.getAll()
    return products.find((p) => p.barcode === barcode)
  },
  getByCategory: (categoryId: string): Product[] => {
    const products = productsDB.getAll()
    return products.filter((p) => p.categoryId === categoryId && p.isActive)
  },
  search: (query: string): Product[] => {
    const products = productsDB.getActive()
    const lowerQuery = query.toLowerCase()
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.sku.toLowerCase().includes(lowerQuery) ||
        p.barcode.includes(query)
    )
  },
  create: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product => {
    const products = productsDB.getAll()
    const newProduct: Product = {
      ...product,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setToStorage(STORAGE_KEYS.PRODUCTS, [...products, newProduct])
    return newProduct
  },
  update: (id: string, data: Partial<Product>): Product | undefined => {
    const products = productsDB.getAll()
    const index = products.findIndex((p) => p.id === id)
    if (index === -1) return undefined
    products[index] = { ...products[index], ...data, updatedAt: new Date() }
    setToStorage(STORAGE_KEYS.PRODUCTS, products)
    return products[index]
  },
  delete: (id: string): boolean => {
    const products = productsDB.getAll()
    const index = products.findIndex((p) => p.id === id)
    if (index === -1) return false
    products[index] = { ...products[index], isActive: false, updatedAt: new Date() }
    setToStorage(STORAGE_KEYS.PRODUCTS, products)
    return true
  },
}

// --- PRODUCT STOCK ---

export const productStockDB = {
  getAll: (): ProductStock[] => getFromStorage<ProductStock[]>(STORAGE_KEYS.PRODUCT_STOCK, []),
  getByProduct: (productId: string): ProductStock[] => {
    const stock = productStockDB.getAll()
    return stock.filter((s) => s.productId === productId)
  },
  getByBranch: (branchId: string): ProductStock[] => {
    const stock = productStockDB.getAll()
    return stock.filter((s) => s.branchId === branchId)
  },
  get: (productId: string, branchId: string): ProductStock | undefined => {
    const stock = productStockDB.getAll()
    return stock.find((s) => s.productId === productId && s.branchId === branchId)
  },
  update: (productId: string, branchId: string, quantity: number): ProductStock => {
    const allStock = productStockDB.getAll()
    const index = allStock.findIndex(
      (s) => s.productId === productId && s.branchId === branchId
    )
    
    if (index === -1) {
      const newStock: ProductStock = {
        id: generateId(),
        productId,
        branchId,
        quantity,
        updatedAt: new Date(),
      }
      setToStorage(STORAGE_KEYS.PRODUCT_STOCK, [...allStock, newStock])
      return newStock
    }
    
    allStock[index] = { ...allStock[index], quantity, updatedAt: new Date() }
    setToStorage(STORAGE_KEYS.PRODUCT_STOCK, allStock)
    return allStock[index]
  },
  adjustQuantity: (productId: string, branchId: string, delta: number): ProductStock => {
    const current = productStockDB.get(productId, branchId)
    const newQuantity = (current?.quantity || 0) + delta
    return productStockDB.update(productId, branchId, Math.max(0, newQuantity))
  },
  getLowStock: (branchId?: string): Array<{ product: Product; stock: ProductStock; minStock: number }> => {
    const products = productsDB.getActive()
    const stock = branchId ? productStockDB.getByBranch(branchId) : productStockDB.getAll()
    
    const lowStockItems: Array<{ product: Product; stock: ProductStock; minStock: number }> = []
    
    for (const s of stock) {
      const product = products.find((p) => p.id === s.productId)
      if (product && s.quantity <= product.minStock) {
        lowStockItems.push({ product, stock: s, minStock: product.minStock })
      }
    }
    
    return lowStockItems
  },
}

// --- CUSTOMERS ---

export const customersDB = {
  getAll: (): Customer[] => getFromStorage<Customer[]>(STORAGE_KEYS.CUSTOMERS, []),
  getActive: (): Customer[] => customersDB.getAll().filter((c) => c.isActive),
  getById: (id: string): Customer | undefined => {
    const customers = customersDB.getAll()
    return customers.find((c) => c.id === id)
  },
  getByRfc: (rfc: string): Customer | undefined => {
    const customers = customersDB.getAll()
    return customers.find((c) => c.rfc === rfc)
  },
  search: (query: string): Customer[] => {
    const customers = customersDB.getActive()
    const lowerQuery = query.toLowerCase()
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(lowerQuery) ||
        c.rfc.toLowerCase().includes(lowerQuery) ||
        c.email.toLowerCase().includes(lowerQuery)
    )
  },
  create: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Customer => {
    const customers = customersDB.getAll()
    const newCustomer: Customer = {
      ...customer,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setToStorage(STORAGE_KEYS.CUSTOMERS, [...customers, newCustomer])
    return newCustomer
  },
  update: (id: string, data: Partial<Customer>): Customer | undefined => {
    const customers = customersDB.getAll()
    const index = customers.findIndex((c) => c.id === id)
    if (index === -1) return undefined
    customers[index] = { ...customers[index], ...data, updatedAt: new Date() }
    setToStorage(STORAGE_KEYS.CUSTOMERS, customers)
    return customers[index]
  },
  delete: (id: string): boolean => {
    const customers = customersDB.getAll()
    const index = customers.findIndex((c) => c.id === id)
    if (index === -1) return false
    customers[index] = { ...customers[index], isActive: false, updatedAt: new Date() }
    setToStorage(STORAGE_KEYS.CUSTOMERS, customers)
    return true
  },
}

// --- CASH REGISTERS ---

export const cashRegistersDB = {
  getAll: (): CashRegister[] => getFromStorage<CashRegister[]>(STORAGE_KEYS.CASH_REGISTERS, []),
  getByBranch: (branchId: string): CashRegister[] => {
    const registers = cashRegistersDB.getAll()
    return registers.filter((r) => r.branchId === branchId && r.isActive)
  },
  getById: (id: string): CashRegister | undefined => {
    const registers = cashRegistersDB.getAll()
    return registers.find((r) => r.id === id)
  },
}

// --- CASH SESSIONS ---

export const cashSessionsDB = {
  getAll: (): CashSession[] => getFromStorage<CashSession[]>(STORAGE_KEYS.CASH_SESSIONS, []),
  getById: (id: string): CashSession | undefined => {
    const sessions = cashSessionsDB.getAll()
    return sessions.find((s) => s.id === id)
  },
  getOpen: (): CashSession[] => {
    const sessions = cashSessionsDB.getAll()
    return sessions.filter((s) => s.status === 'open')
  },
  getOpenByUser: (userId: string): CashSession | undefined => {
    const sessions = cashSessionsDB.getAll()
    return sessions.find((s) => s.userId === userId && s.status === 'open')
  },
  getOpenByRegister: (registerId: string): CashSession | undefined => {
    const sessions = cashSessionsDB.getAll()
    return sessions.find((s) => s.cashRegisterId === registerId && s.status === 'open')
  },
  getByBranch: (branchId: string): CashSession[] => {
    const sessions = cashSessionsDB.getAll()
    return sessions.filter((s) => s.branchId === branchId)
  },
  getByDateRange: (startDate: Date, endDate: Date): CashSession[] => {
    const sessions = cashSessionsDB.getAll()
    return sessions.filter((s) => {
      const opened = new Date(s.openedAt)
      return opened >= startDate && opened <= endDate
    })
  },
  create: (session: Omit<CashSession, 'id' | 'openedAt'>): CashSession => {
    const sessions = cashSessionsDB.getAll()
    const newSession: CashSession = {
      ...session,
      id: generateId(),
      openedAt: new Date(),
    }
    setToStorage(STORAGE_KEYS.CASH_SESSIONS, [...sessions, newSession])
    return newSession
  },
  update: (id: string, data: Partial<CashSession>): CashSession | undefined => {
    const sessions = cashSessionsDB.getAll()
    const index = sessions.findIndex((s) => s.id === id)
    if (index === -1) return undefined
    sessions[index] = { ...sessions[index], ...data }
    setToStorage(STORAGE_KEYS.CASH_SESSIONS, sessions)
    return sessions[index]
  },
  close: (
    id: string,
    closingAmount: number,
    expectedAmount: number,
    notes: string
  ): CashSession | undefined => {
    return cashSessionsDB.update(id, {
      closingAmount,
      expectedAmount,
      difference: closingAmount - expectedAmount,
      status: 'closed',
      closedAt: new Date(),
      notes,
    })
  },
}

// --- CASH MOVEMENTS ---

export const cashMovementsDB = {
  getAll: (): CashMovement[] => getFromStorage<CashMovement[]>(STORAGE_KEYS.CASH_MOVEMENTS, []),
  getBySession: (sessionId: string): CashMovement[] => {
    const movements = cashMovementsDB.getAll()
    return movements.filter((m) => m.cashSessionId === sessionId)
  },
  create: (movement: Omit<CashMovement, 'id' | 'createdAt'>): CashMovement => {
    const movements = cashMovementsDB.getAll()
    const newMovement: CashMovement = {
      ...movement,
      id: generateId(),
      createdAt: new Date(),
    }
    setToStorage(STORAGE_KEYS.CASH_MOVEMENTS, [...movements, newMovement])
    return newMovement
  },
}

// --- SALES ---

export const salesDB = {
  getAll: (): Sale[] => getFromStorage<Sale[]>(STORAGE_KEYS.SALES, []),
  getById: (id: string): Sale | undefined => {
    const sales = salesDB.getAll()
    return sales.find((s) => s.id === id)
  },
  getByFolio: (folio: string): Sale | undefined => {
    const sales = salesDB.getAll()
    return sales.find((s) => s.folio === folio)
  },
  getBySession: (sessionId: string): Sale[] => {
    const sales = salesDB.getAll()
    return sales.filter((s) => s.cashSessionId === sessionId)
  },
  getByBranch: (branchId: string): Sale[] => {
    const sales = salesDB.getAll()
    return sales.filter((s) => s.branchId === branchId)
  },
  getByDateRange: (startDate: Date, endDate: Date, branchId?: string): Sale[] => {
    const sales = salesDB.getAll()
    return sales.filter((s) => {
      const created = new Date(s.createdAt)
      const inRange = created >= startDate && created <= endDate
      if (branchId) {
        return inRange && s.branchId === branchId
      }
      return inRange
    })
  },
  getNextFolio: (branchCode: string): string => {
    const sales = salesDB.getAll()
    const branchSales = sales.filter((s) => s.folio.startsWith(branchCode))
    const lastFolio = branchSales.length > 0
      ? Math.max(...branchSales.map((s) => parseInt(s.folio.split('-')[1] || '0')))
      : 0
    return `${branchCode}-${String(lastFolio + 1).padStart(6, '0')}`
  },
  create: (sale: Omit<Sale, 'id' | 'createdAt'>): Sale => {
    const sales = salesDB.getAll()
    const newSale: Sale = {
      ...sale,
      id: generateId(),
      createdAt: new Date(),
    }
    setToStorage(STORAGE_KEYS.SALES, [...sales, newSale])
    return newSale
  },
  update: (id: string, data: Partial<Sale>): Sale | undefined => {
    const sales = salesDB.getAll()
    const index = sales.findIndex((s) => s.id === id)
    if (index === -1) return undefined
    sales[index] = { ...sales[index], ...data }
    setToStorage(STORAGE_KEYS.SALES, sales)
    return sales[index]
  },
  cancel: (id: string, cancelledBy: string, reason: string): Sale | undefined => {
    return salesDB.update(id, {
      status: 'cancelled',
      cancelledAt: new Date(),
      cancelledBy,
      cancelReason: reason,
    })
  },
}

// --- SALE ITEMS ---

export const saleItemsDB = {
  getAll: (): SaleItem[] => getFromStorage<SaleItem[]>(STORAGE_KEYS.SALE_ITEMS, []),
  getBySale: (saleId: string): SaleItem[] => {
    const items = saleItemsDB.getAll()
    return items.filter((i) => i.saleId === saleId)
  },
  createMany: (items: Omit<SaleItem, 'id'>[]): SaleItem[] => {
    const allItems = saleItemsDB.getAll()
    const newItems = items.map((item) => ({
      ...item,
      id: generateId(),
    }))
    setToStorage(STORAGE_KEYS.SALE_ITEMS, [...allItems, ...newItems])
    return newItems
  },
}

// --- SALE PAYMENTS ---

export const salePaymentsDB = {
  getAll: (): SalePayment[] => getFromStorage<SalePayment[]>(STORAGE_KEYS.SALE_PAYMENTS, []),
  getBySale: (saleId: string): SalePayment[] => {
    const payments = salePaymentsDB.getAll()
    return payments.filter((p) => p.saleId === saleId)
  },
  createMany: (payments: Omit<SalePayment, 'id' | 'createdAt'>[]): SalePayment[] => {
    const allPayments = salePaymentsDB.getAll()
    const newPayments = payments.map((payment) => ({
      ...payment,
      id: generateId(),
      createdAt: new Date(),
    }))
    setToStorage(STORAGE_KEYS.SALE_PAYMENTS, [...allPayments, ...newPayments])
    return newPayments
  },
}

// --- INVOICES ---

export const invoicesDB = {
  getAll: (): Invoice[] => getFromStorage<Invoice[]>(STORAGE_KEYS.INVOICES, []),
  getById: (id: string): Invoice | undefined => {
    const invoices = invoicesDB.getAll()
    return invoices.find((i) => i.id === id)
  },
  getBySale: (saleId: string): Invoice | undefined => {
    const invoices = invoicesDB.getAll()
    return invoices.find((i) => i.saleId === saleId)
  },
  getNextFolio: (series: string): string => {
    const invoices = invoicesDB.getAll()
    const seriesInvoices = invoices.filter((i) => i.internalFolio.startsWith(series))
    const lastFolio = seriesInvoices.length > 0
      ? Math.max(...seriesInvoices.map((i) => parseInt(i.internalFolio.split('-')[1] || '0')))
      : 0
    return `${series}-${String(lastFolio + 1).padStart(6, '0')}`
  },
  create: (invoice: Omit<Invoice, 'id' | 'createdAt'>): Invoice => {
    const invoices = invoicesDB.getAll()
    const newInvoice: Invoice = {
      ...invoice,
      id: generateId(),
      createdAt: new Date(),
    }
    setToStorage(STORAGE_KEYS.INVOICES, [...invoices, newInvoice])
    return newInvoice
  },
  update: (id: string, data: Partial<Invoice>): Invoice | undefined => {
    const invoices = invoicesDB.getAll()
    const index = invoices.findIndex((i) => i.id === id)
    if (index === -1) return undefined
    invoices[index] = { ...invoices[index], ...data }
    setToStorage(STORAGE_KEYS.INVOICES, invoices)
    return invoices[index]
  },
}

// --- INVENTORY MOVEMENTS ---

export const inventoryMovementsDB = {
  getAll: (): InventoryMovement[] => getFromStorage<InventoryMovement[]>(STORAGE_KEYS.INVENTORY_MOVEMENTS, []),
  getByProduct: (productId: string): InventoryMovement[] => {
    const movements = inventoryMovementsDB.getAll()
    return movements.filter((m) => m.productId === productId)
  },
  getByBranch: (branchId: string): InventoryMovement[] => {
    const movements = inventoryMovementsDB.getAll()
    return movements.filter((m) => m.branchId === branchId)
  },
  create: (movement: Omit<InventoryMovement, 'id' | 'createdAt'>): InventoryMovement => {
    const movements = inventoryMovementsDB.getAll()
    const newMovement: InventoryMovement = {
      ...movement,
      id: generateId(),
      createdAt: new Date(),
    }
    setToStorage(STORAGE_KEYS.INVENTORY_MOVEMENTS, [...movements, newMovement])
    return newMovement
  },
}

// --- SETTINGS ---

export const settingsDB = {
  get: (): BusinessSettings => {
    return getFromStorage<BusinessSettings>(STORAGE_KEYS.SETTINGS, DEMO_BUSINESS_SETTINGS)
  },
  update: (data: Partial<BusinessSettings>): BusinessSettings => {
    const current = settingsDB.get()
    const updated = { ...current, ...data }
    setToStorage(STORAGE_KEYS.SETTINGS, updated)
    return updated
  },
}


// --- COMPATIBILIDAD LEGACY ---

export const db = {
  roles: rolesDB,
  users: usersDB,
  branches: branchesDB,
  categories: categoriesDB,
  products: productsDB,
  customers: customersDB,
  cashRegisters: cashRegistersDB,
  cashSessions: cashSessionsDB,
  cashMovements: cashMovementsDB,
  sales: salesDB,
  invoices: invoicesDB,
  inventoryMovements: inventoryMovementsDB,
  settings: settingsDB,
  productStock: {
    getAll: productStockDB.getAll,
    getByProduct: productStockDB.getByProduct,
    getByBranch: productStockDB.getByBranch,
    getByProductAndBranch: productStockDB.get,
    get: productStockDB.get,
    create: (stock: ProductStock): ProductStock => {
      return productStockDB.update(stock.productId, stock.branchId, stock.quantity)
    },
    update: (id: string, data: Partial<ProductStock>): ProductStock | undefined => {
      const current = productStockDB.getAll().find((s) => s.id === id)
      if (!current) return undefined
      return productStockDB.update(
        data.productId ?? current.productId,
        data.branchId ?? current.branchId,
        data.quantity ?? current.quantity
      )
    },
  },
  saleItems: {
    getAll: saleItemsDB.getAll,
    getBySale: saleItemsDB.getBySale,
    getBySaleId: saleItemsDB.getBySale,
    createMany: saleItemsDB.createMany,
  },
  salePayments: {
    getAll: salePaymentsDB.getAll,
    getBySale: salePaymentsDB.getBySale,
    getBySaleId: salePaymentsDB.getBySale,
    createMany: salePaymentsDB.createMany,
  },
}
