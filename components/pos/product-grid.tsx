'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useProductsStore } from '@/lib/stores/products-store'
import { useCartStore } from '@/lib/stores/cart-store'
import { useBranchStore } from '@/lib/stores/branch-store'
import { productStockDB } from '@/lib/db/local-storage'
import { formatCurrency } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import type { Product, Category } from '@/lib/types'

interface ProductGridProps {
  onProductSelect?: (product: Product) => void
}

export function ProductGrid({ onProductSelect }: ProductGridProps) {
  const { products, categories, loadProducts, loadCategories, selectedCategory, setSelectedCategory } = useProductsStore()
  const { addItem } = useCartStore()
  const { currentBranch } = useBranchStore()

  useEffect(() => {
    loadProducts()
    loadCategories()
  }, [loadProducts, loadCategories])

  const getStock = (productId: string): number => {
    if (!currentBranch) return 0
    const stock = productStockDB.get(productId, currentBranch.id)
    return stock?.quantity || 0
  }

  const handleSelectProduct = (product: Product) => {
    const stock = getStock(product.id)
    if (stock <= 0) return
    
    addItem(product, 1)
    onProductSelect?.(product)
  }

  const filteredProducts = selectedCategory
    ? products.filter((p) => p.categoryId === selectedCategory)
    : products

  return (
    <div className="flex flex-col h-full">
      {/* Category Tabs */}
      <div className="border-b">
        <ScrollArea className="w-full">
          <div className="flex gap-1 p-2">
            <Button
              variant={selectedCategory === null ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className="shrink-0"
            >
              Todos
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className="shrink-0"
              >
                {category.name}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Product Grid */}
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 p-2">
          {filteredProducts.map((product) => {
            const stock = getStock(product.id)
            const hasStock = stock > 0

            return (
              <button
                key={product.id}
                onClick={() => handleSelectProduct(product)}
                disabled={!hasStock}
                className={cn(
                  'flex flex-col p-3 rounded-lg border text-left transition-all',
                  'hover:border-primary hover:shadow-sm',
                  'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:shadow-none',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm leading-tight line-clamp-2">
                    {product.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    {product.sku}
                  </p>
                </div>
                <div className="mt-2 flex items-end justify-between gap-1">
                  <span className="font-bold text-base">
                    {formatCurrency(product.salePrice)}
                  </span>
                  <Badge 
                    variant={hasStock ? 'secondary' : 'destructive'} 
                    className="text-xs shrink-0"
                  >
                    {stock}
                  </Badge>
                </div>
              </button>
            )
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p>No hay productos en esta categoría</p>
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
