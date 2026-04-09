import { create } from 'zustand'
import type { Category, Product } from '@/lib/types'
import { apiFetch } from '@/lib/api/client'
import { hydrateDatabaseCache, productStockDB } from '@/lib/db/local-storage'

interface ProductsState {
  products: Product[]
  categories: Category[]
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
  createProduct: (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Product>
  updateProduct: (id: string, data: Partial<Product>) => Promise<Product | undefined>
  saveProduct: (product: Product) => Promise<Product | undefined>
  deleteProduct: (id: string) => Promise<boolean>
  createCategory: (data: Omit<Category, 'id' | 'createdAt'>) => Promise<Category>
  updateCategory: (id: string, data: Partial<Category>) => Promise<Category | undefined>
  getFilteredProducts: () => Product[]
}

export const useProductsStore = create<ProductsState>((set, get) => ({
  products: [], categories: [], isLoading: false, searchQuery: '', selectedCategory: null,
  loadProducts: async () => {
    set({ isLoading: true })
    const data = await apiFetch<{ products: Product[]; productStock: any[] }>('/api/products')
    hydrateDatabaseCache({ products: data.products, productStock: data.productStock })
    set({ products: data.products, isLoading: false })
  },
  loadCategories: async () => {
    const data = await apiFetch<{ categories: Category[] }>('/api/categories')
    hydrateDatabaseCache({ categories: data.categories })
    set({ categories: data.categories })
  },
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedCategory: (categoryId) => set({ selectedCategory: categoryId }),
  searchProducts: (query) => get().products.filter((p) => [p.name,p.sku,p.barcode].some(v => v.toLowerCase().includes(query.toLowerCase()))),
  getProductsByCategory: (categoryId) => get().products.filter((p) => p.categoryId === categoryId),
  getProductWithStock: (productId, branchId) => {
    const product = get().products.find((p) => p.id === productId)
    if (!product) return null
    return { product, stock: productStockDB.get(productId, branchId)?.quantity || 0 }
  },
  createProduct: async (data) => {
    const res = await apiFetch<{ product: Product }>('/api/products', { method: 'POST', body: JSON.stringify(data) })
    const products = [...get().products, res.product]
    hydrateDatabaseCache({ products })
    set({ products })
    return res.product
  },
  updateProduct: async (id, data) => {
    const res = await apiFetch<{ product: Product }>(`/api/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
    const products = get().products.map((p) => p.id === id ? res.product : p)
    hydrateDatabaseCache({ products })
    set({ products })
    return res.product
  },
  saveProduct: async (product) => product.id ? get().updateProduct(product.id, product) : get().createProduct(product as any),
  deleteProduct: async (id) => {
    await apiFetch(`/api/products/${id}`, { method: 'DELETE' })
    const products = get().products.filter((p) => p.id !== id)
    hydrateDatabaseCache({ products })
    set({ products })
    return true
  },
  createCategory: async (data) => ({ id: crypto.randomUUID(), ...data, createdAt: new Date() }),
  updateCategory: async () => undefined,
  getFilteredProducts: () => {
    const { products, searchQuery, selectedCategory } = get()
    return products.filter((p) => (!searchQuery || [p.name,p.sku,p.barcode].some(v => v.toLowerCase().includes(searchQuery.toLowerCase()))) && (!selectedCategory || p.categoryId === selectedCategory))
  },
}))

export function useProducts(): Product[] { return useProductsStore((state) => state.products) }
export function useCategories(): Category[] { return useProductsStore((state) => state.categories) }
