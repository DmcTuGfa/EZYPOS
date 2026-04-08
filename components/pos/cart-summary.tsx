'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCartStore } from '@/lib/stores/cart-store'
import { formatCurrency } from '@/lib/utils/format'
import { Percent, DollarSign, X } from 'lucide-react'
import type { DiscountType } from '@/lib/types'

export function CartSummary() {
  const {
    items,
    discount,
    setDiscount,
    getSubtotal,
    getTaxAmount,
    getDiscountAmount,
    getTotal,
    getItemCount,
  } = useCartStore()

  const [discountDialogOpen, setDiscountDialogOpen] = useState(false)
  const [discountType, setDiscountType] = useState<DiscountType>('percentage')
  const [discountValue, setDiscountValue] = useState('')

  const subtotal = getSubtotal()
  const taxAmount = getTaxAmount()
  const discountAmount = getDiscountAmount()
  const total = getTotal()
  const itemCount = getItemCount()

  const handleApplyDiscount = () => {
    const value = parseFloat(discountValue)
    if (isNaN(value) || value <= 0) {
      setDiscount(null)
    } else {
      // Validate percentage doesn't exceed 100%
      if (discountType === 'percentage' && value > 100) {
        setDiscount({ type: 'percentage', value: 100 })
      } else {
        setDiscount({ type: discountType, value })
      }
    }
    setDiscountDialogOpen(false)
    setDiscountValue('')
  }

  const handleRemoveDiscount = () => {
    setDiscount(null)
  }

  return (
    <div className="space-y-3 p-4 border-t bg-muted/30">
      {/* Items count */}
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">
          {itemCount} {itemCount === 1 ? 'artículo' : 'artículos'}
        </span>
      </div>

      {/* Subtotal */}
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Subtotal</span>
        <span>{formatCurrency(subtotal)}</span>
      </div>

      {/* Tax */}
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">IVA</span>
        <span>{formatCurrency(taxAmount)}</span>
      </div>

      {/* Discount */}
      {discount && (
        <div className="flex justify-between text-sm text-green-600">
          <div className="flex items-center gap-1">
            <span>
              Descuento ({discount.type === 'percentage' ? `${discount.value}%` : formatCurrency(discount.value)})
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={handleRemoveDiscount}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <span>-{formatCurrency(discountAmount)}</span>
        </div>
      )}

      {/* Add discount button */}
      {!discount && items.length > 0 && (
        <Dialog open={discountDialogOpen} onOpenChange={setDiscountDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <Percent className="h-4 w-4 mr-2" />
              Agregar descuento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aplicar Descuento</DialogTitle>
              <DialogDescription>
                Selecciona el tipo de descuento y el valor a aplicar
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tipo de descuento</Label>
                <Select
                  value={discountType}
                  onValueChange={(value) => setDiscountType(value as DiscountType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">
                      <div className="flex items-center gap-2">
                        <Percent className="h-4 w-4" />
                        Porcentaje
                      </div>
                    </SelectItem>
                    <SelectItem value="fixed">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Monto fijo
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  {discountType === 'percentage' ? 'Porcentaje (%)' : 'Monto ($)'}
                </Label>
                <Input
                  type="number"
                  min="0"
                  max={discountType === 'percentage' ? '100' : undefined}
                  step="0.01"
                  placeholder={discountType === 'percentage' ? '10' : '50.00'}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDiscountDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleApplyDiscount}>
                Aplicar descuento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Separator />

      {/* Total */}
      <div className="flex justify-between items-center">
        <span className="text-lg font-semibold">Total</span>
        <span className="text-2xl font-bold">{formatCurrency(total)}</span>
      </div>
    </div>
  )
}
