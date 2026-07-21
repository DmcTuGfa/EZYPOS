
'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useProductsStore } from '@/lib/stores/products-store'
import { useCartStore } from '@/lib/stores/cart-store'
import { useBranchStore } from '@/lib/stores/branch-store'
import { ProductOptionsModal } from '@/components/pos/product-options-modal'
import { formatCurrency } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import { Layers } from 'lucide-react'
import type { Product, ProductExtra, ProductPortion } from '@/lib/types'

interface ProductGridProps { onProductSelect?: (product: Product) => void }

export function ProductGrid({ onProductSelect }: ProductGridProps) {
  const { products, categories, loadProducts, loadCategories, selectedCategory, setSelectedCategory, getStockByProductAndBranch } = useProductsStore()
  const { addItem } = useCartStore()
  const { currentBranch } = useBranchStore()
  const [optionsProduct, setOptionsProduct] = useState<Product | null>(null)

  useEffect(() => { loadProducts(); loadCategories() }, [loadProducts, loadCategories])

  const getStock = (productId: string) => !currentBranch ? 0 : getStockByProductAndBranch(productId, currentBranch.id)

  const hasOptions = (product: Product) =>
    (product.portions?.length || 0) > 0 || (product.extras?.length || 0) > 0

  const handleSelectProduct = (product: Product) => {
    if (getStock(product.id) <= 0) return
    if (hasOptions(product)) {
      // Productos con porciones o extras abren el selector
      setOptionsProduct(product)
      return
    }
    addItem(product, 1)
    onProductSelect?.(product)
  }

  const handleConfirmOptions = (
    product: Product,
    quantity: number,
    options: { portion: ProductPortion | null; extras: ProductExtra[] }
  ) => {
    addItem(product, quantity, options)
    onProductSelect?.(product)
  }

  const filteredProducts = selectedCategory ? products.filter((p) => p.categoryId === selectedCategory) : products

  return (
    <div className="flex flex-col h-full">
      <div className="border-b">
        <ScrollArea className="w-full">
          <div className="flex gap-1 p-2">
            <Button variant={selectedCategory === null ? 'default' : 'ghost'} size="sm" onClick={() => setSelectedCategory(null)} className="shrink-0">Todos</Button>
            {categories.map((category) => (
              <Button key={category.id} variant={selectedCategory === category.id ? 'default' : 'ghost'} size="sm" onClick={() => setSelectedCategory(category.id)} className="shrink-0">
                {category.name}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      <ScrollArea className="flex-1">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 p-2">
          {filteredProducts.map((product) => {
            const stock = getStock(product.id)
            const hasStock = stock > 0
            const withOptions = hasOptions(product)
            const minPortionPrice = product.portions?.length
              ? Math.min(...product.portions.map((portion) => portion.price))
              : null
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
                  <p className="font-medium text-sm leading-tight line-clamp-2">{product.name}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
                    {withOptions && (
                      <Badge variant="outline" className="h-4 gap-0.5 px-1 text-[10px]">
                        <Layers className="h-2.5 w-2.5" />
                        Opciones
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex items-end justify-between gap-1">
                  <span className="font-bold text-base">
                    {minPortionPrice != null
                      ? `Desde ${formatCurrency(minPortionPrice)}`
                      : formatCurrency(product.salePrice)}
                  </span>
                  <Badge variant={hasStock ? 'secondary' : 'destructive'} className="text-xs shrink-0">{stock}</Badge>
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

      <ProductOptionsModal
        product={optionsProduct}
        open={Boolean(optionsProduct)}
        onClose={() => setOptionsProduct(null)}
        onConfirm={handleConfirmOptions}
      />
    </div>
  )
}
