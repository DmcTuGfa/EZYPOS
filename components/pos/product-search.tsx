'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Search, Barcode, X } from 'lucide-react'
import { useProductsStore } from '@/lib/stores/products-store'
import { useCartStore } from '@/lib/stores/cart-store'
import { useBranchStore } from '@/lib/stores/branch-store'
import { productStockDB } from '@/lib/db/local-storage'
import { formatCurrency } from '@/lib/utils/format'
import type { Product } from '@/lib/types'

interface ProductSearchProps {
  onProductSelect?: (product: Product) => void
}

export function ProductSearch({ onProductSelect }: ProductSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const { searchProducts, products, loadProducts } = useProductsStore()
  const { addItem } = useCartStore()
  const { currentBranch } = useBranchStore()

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  useEffect(() => {
    if (query.length >= 1) {
      const searchResults = searchProducts(query).slice(0, 10)
      setResults(searchResults)
      setIsOpen(searchResults.length > 0)
    } else {
      setResults([])
      setIsOpen(false)
    }
  }, [query, searchProducts])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectProduct = (product: Product) => {
    addItem(product, 1)
    onProductSelect?.(product)
    setQuery('')
    setIsOpen(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && results.length === 1) {
      handleSelectProduct(results[0])
    }
    if (e.key === 'Escape') {
      setQuery('')
      setIsOpen(false)
    }
  }

  const getStock = (productId: string): number => {
    if (!currentBranch) return 0
    const stock = productStockDB.get(productId, currentBranch.id)
    return stock?.quantity || 0
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Buscar producto por nombre, SKU o código de barras..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 1 && results.length > 0 && setIsOpen(true)}
          className="pl-10 pr-10 h-12 text-base"
          autoComplete="off"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
            onClick={() => {
              setQuery('')
              setIsOpen(false)
              inputRef.current?.focus()
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg overflow-hidden">
          <ScrollArea className="max-h-80">
            <div className="p-1">
              {results.map((product) => {
                const stock = getStock(product.id)
                const hasStock = stock > 0

                return (
                  <button
                    key={product.id}
                    onClick={() => handleSelectProduct(product)}
                    disabled={!hasStock}
                    className="w-full flex items-center gap-3 p-3 text-left rounded-md hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{product.name}</span>
                        {product.barcode && (
                          <Badge variant="outline" className="text-xs font-mono shrink-0">
                            <Barcode className="h-3 w-3 mr-1" />
                            {product.barcode.slice(-6)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-sm text-muted-foreground">
                        <span className="font-mono">{product.sku}</span>
                        <span>-</span>
                        <span>{product.category?.name || 'Sin categoría'}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold">{formatCurrency(product.salePrice)}</div>
                      <div className={`text-xs ${hasStock ? 'text-muted-foreground' : 'text-destructive'}`}>
                        {hasStock ? `${stock} disponibles` : 'Sin stock'}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
