'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useCartStore } from '@/lib/stores/cart-store'
import { formatCurrency } from '@/lib/utils/format'
import { Minus, Plus, Trash2, ShoppingCart } from 'lucide-react'

export function CartList() {
  const { items, updateItemQuantity, removeItem } = useCartStore()

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
        <ShoppingCart className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-sm">El carrito está vacío</p>
        <p className="text-xs mt-1">Busca o selecciona productos para agregar</p>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-1 p-2">
        {items.map((item) => {
          const lineTotal = item.unitPrice * item.quantity - item.discountAmount
          const lineTax = lineTotal * (item.taxRate / 100)

          return (
            <div
              key={item.productId}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm leading-tight line-clamp-2">
                  {item.product.name}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                  {item.product.sku}
                </p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span>{formatCurrency(item.unitPrice)} c/u</span>
                  {item.taxRate > 0 && (
                    <>
                      <span>+</span>
                      <span>{item.taxRate}% IVA</span>
                    </>
                  )}
                </div>
                {item.discountAmount > 0 && (
                  <p className="text-xs text-green-600 mt-0.5">
                    Descuento: -{formatCurrency(item.discountAmount)}
                  </p>
                )}
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => updateItemQuantity(item.productId, item.quantity - 1)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1
                      updateItemQuantity(item.productId, val)
                    }}
                    className="h-7 w-12 text-center text-sm p-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => updateItemQuantity(item.productId, item.quantity + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => removeItem(item.productId)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <p className="font-semibold text-sm">
                  {formatCurrency(lineTotal + lineTax)}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}
