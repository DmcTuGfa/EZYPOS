
import { create } from 'zustand'
import type { Category, Product, ProductStock } from '@/lib/types'
import { apiFetch } from '@/lib/api/client'

interface ProductsState {
  products: Product[]
  categories: Category[]
  productStock: ProductStock[]
  isLoading: boolean
  searchQuery: string
  selectedCategory: string | null
  loadProducts: () => Promise<void>
  loadCategories: () => Promise<void>
  setSearchQuery: (query: string) => void
  setSelectedCategory: (categoryId: string | null) => void
  searchProducts: (query: string) => Product[]
  getProductsByCategory: (categoryId: string) => Product[]
  getProductWithStock: (productId: string, branchId: string) => { product: Product; stock: number } | null
  getStockByProductAndBranch: (productId: string, branchId: string) => number
  createProduct: (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Product>
  updateProduct: (id: string, data: Partial<Product>) => Promise<Product | undefined>
  saveProduct: (product: Product) => Promise<Product | undefined>
  deleteProduct: (id: string) => Promise<boolean>
  createCategory: (data: Omit<Category, 'id' | 'createdAt'>) => Promise<Category>
  updateCategory: (id: string, data: Partial<Category>) => Promise<Category | undefined>
  getFilteredProducts: () => Product[]
}

export const useProductsStore = create<ProductsState>((set, get) => ({
  products: [], categories: [], productStock: [], isLoading: false, searchQuery: '', selectedCategory: null,
  loadProducts: async () => {
    set({ isLoading: true })
    const data = await apiFetch<{ products: Product[]; productStock: ProductStock[] }>('/api/products')
    set({ products: data.products, productStock: data.productStock, isLoading: false })
  },
  loadCategories: async () => {
    const data = await apiFetch<{ categories: Category[] }>('/api/categories')
    set({ categories: data.categories })
  },
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedCategory: (categoryId) => set({ selectedCategory: categoryId }),
  searchProducts: (query) => get().products.filter((p) => [p.name,p.sku,p.barcode].some(v => (v || '').toLowerCase().includes(query.toLowerCase()))),
  getProductsByCategory: (categoryId) => get().products.filter((p) => p.categoryId === categoryId),
  getStockByProductAndBranch: (productId, branchId) => get().productStock.find((s) => s.productId === productId && s.branchId === branchId)?.quantity || 0,
  getProductWithStock: (productId, branchId) => {
    const product = get().products.find((p) => p.id === productId)
    if (!product) return null
    return { product, stock: get().getStockByProductAndBranch(productId, branchId) }
  },
  createProduct: async (data) => {
    const res = await apiFetch<{ product: Product }>('/api/products', { method: 'POST', body: JSON.stringify(data) })
    await get().loadProducts()
    return res.product
  },
  updateProduct: async (id, data) => {
    const res = await apiFetch<{ product: Product }>(`/api/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
    await get().loadProducts()
    return res.product
  },
  saveProduct: async (product) => {
    const exists = !!get().products.find((p) => p.id === product.id)
    return exists ? get().updateProduct(product.id, product) : get().createProduct(product as any)
  },
  deleteProduct: async (id) => { await apiFetch(`/api/products/${id}`, { method: 'DELETE' }); await get().loadProducts(); return true },
  createCategory: async (data) => ({ id: crypto.randomUUID(), ...data, createdAt: new Date() }),
  updateCategory: async () => undefined,
  getFilteredProducts: () => {
    const { products, searchQuery, selectedCategory } = get()
    return products.filter((p) => (!searchQuery || [p.name,p.sku,p.barcode].some(v => (v || '').toLowerCase().includes(searchQuery.toLowerCase()))) && (!selectedCategory || p.categoryId === selectedCategory))
  },
}))

export function useProducts(): Product[] { return useProductsStore((state) => state.products) }
export function useCategories(): Category[] { return useProductsStore((state) => state.categories) }
