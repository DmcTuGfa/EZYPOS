// ===========================================
// STORE DE PRODUCTOS
// ===========================================

import { create } from 'zustand'
import type { Product, Category, ProductStock } from '@/lib/types'
import { productsDB, categoriesDB, productStockDB } from '@/lib/db/local-storage'

interface ProductsState {
  products: Product[]
  categories: Category[]
  isLoading: boolean
  searchQuery: string
  selectedCategory: string | null
  
  // Actions
  loadProducts: () => void
  loadCategories: () => void
  setSearchQuery: (query: string) => void
  setSelectedCategory: (categoryId: string | null) => void
  searchProducts: (query: string) => Product[]
  getProductsByCategory: (categoryId: string) => Product[]
  getProductWithStock: (productId: string, branchId: string) => { product: Product; stock: number } | null
  createProduct: (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Product
  updateProduct: (id: string, data: Partial<Product>) => Product | undefined
  deleteProduct: (id: string) => boolean
  createCategory: (data: Omit<Category, 'id' | 'createdAt'>) => Category
  updateCategory: (id: string, data: Partial<Category>) => Category | undefined
  getFilteredProducts: () => Product[]
}

export const useProductsStore = create<ProductsState>((set, get) => ({
  products: [],
  categories: [],
  isLoading: false,
  searchQuery: '',
  selectedCategory: null,

  loadProducts: () => {
    set({ isLoading: true })
    const products = productsDB.getActive()
    set({ products, isLoading: false })
  },

  loadCategories: () => {
    const categories = categoriesDB.getActive()
    set({ categories })
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query })
  },

  setSelectedCategory: (categoryId: string | null) => {
    set({ selectedCategory: categoryId })
  },

  searchProducts: (query: string): Product[] => {
    return productsDB.search(query)
  },

  getProductsByCategory: (categoryId: string): Product[] => {
    return productsDB.getByCategory(categoryId)
  },

  getProductWithStock: (productId: string, branchId: string) => {
    const product = productsDB.getById(productId)
    if (!product) return null
    
    const stockRecord = productStockDB.get(productId, branchId)
    return {
      product,
      stock: stockRecord?.quantity || 0,
    }
  },

  createProduct: (data) => {
    const newProduct = productsDB.create(data)
    const products = productsDB.getActive()
    set({ products })
    return newProduct
  },

  updateProduct: (id, data) => {
    const updated = productsDB.update(id, data)
    if (updated) {
      const products = productsDB.getActive()
      set({ products })
    }
    return updated
  },

  deleteProduct: (id) => {
    const deleted = productsDB.delete(id)
    if (deleted) {
      const products = productsDB.getActive()
      set({ products })
    }
    return deleted
  },

  createCategory: (data) => {
    const newCategory = categoriesDB.create(data)
    const categories = categoriesDB.getActive()
    set({ categories })
    return newCategory
  },

  updateCategory: (id, data) => {
    const updated = categoriesDB.update(id, data)
    if (updated) {
      const categories = categoriesDB.getActive()
      set({ categories })
    }
    return updated
  },

  getFilteredProducts: (): Product[] => {
    const { products, searchQuery, selectedCategory } = get()
    
    let filtered = products
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query) ||
          p.barcode.includes(searchQuery)
      )
    }
    
    if (selectedCategory) {
      filtered = filtered.filter((p) => p.categoryId === selectedCategory)
    }
    
    return filtered
  },
}))

// Hooks de conveniencia
export function useProducts(): Product[] {
  return useProductsStore((state) => state.products)
}

export function useCategories(): Category[] {
  return useProductsStore((state) => state.categories)
}
