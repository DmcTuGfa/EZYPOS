'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import { Minus, Plus } from 'lucide-react'
import type { Product, ProductExtra, ProductPortion } from '@/lib/types'

interface ProductOptionsModalProps {
  product: Product | null
  open: boolean
  onClose: () => void
  onConfirm: (
    product: Product,
    quantity: number,
    options: { portion: ProductPortion | null; extras: ProductExtra[] }
  ) => void
}

export function ProductOptionsModal({ product, open, onClose, onConfirm }: ProductOptionsModalProps) {
  const [selectedPortionId, setSelectedPortionId] = useState<string | null>(null)
  const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>([])
  const [quantity, setQuantity] = useState(1)

  const portions = product?.portions || []
  const extras = product?.extras || []

  // Al abrir, seleccionar la primera porción por defecto (si hay)
  useEffect(() => {
    if (open && product) {
      setSelectedPortionId(portions.length > 0 ? portions[0].id : null)
      setSelectedExtraIds([])
      setQuantity(1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product?.id])

  const selectedPortion = useMemo(
    () => portions.find((portion) => portion.id === selectedPortionId) || null,
    [portions, selectedPortionId]
  )
  const selectedExtras = useMemo(
    () => extras.filter((extra) => selectedExtraIds.includes(extra.id)),
    [extras, selectedExtraIds]
  )

  const basePrice = selectedPortion ? selectedPortion.price : product?.salePrice || 0
  const extrasTotal = selectedExtras.reduce((sum, extra) => sum + Number(extra.price || 0), 0)
  const lineTotal = (basePrice + extrasTotal) * quantity

  const toggleExtra = (extraId: string) => {
    setSelectedExtraIds((prev) =>
      prev.includes(extraId) ? prev.filter((id) => id !== extraId) : [...prev, extraId]
    )
  }

  const handleConfirm = () => {
    if (!product) return
    onConfirm(product, quantity, { portion: selectedPortion, extras: selectedExtras })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-[95vw] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{product?.name}</DialogTitle>
          <DialogDescription>
            {portions.length > 0 ? 'Elige la porción' : 'Elige los extras'}
            {portions.length > 0 && extras.length > 0 ? ' y los extras' : ''} para agregar al carrito.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* ── Porciones ── */}
          {portions.length > 0 && (
            <div className="space-y-2">
              <Label>Porción</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {portions.map((portion) => (
                  <button
                    key={portion.id}
                    type="button"
                    onClick={() => setSelectedPortionId(portion.id)}
                    className={cn(
                      'flex flex-col items-center rounded-lg border p-3 text-center transition-all',
                      'hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary',
                      selectedPortionId === portion.id
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : ''
                    )}
                  >
                    <span className="font-semibold">{portion.label}</span>
                    <span className="text-sm text-muted-foreground">{formatCurrency(portion.price)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Extras ── */}
          {extras.length > 0 && (
            <div className="space-y-2">
              <Label>Extras</Label>
              <div className="space-y-1">
                {extras.map((extra) => (
                  <label
                    key={extra.id}
                    className="flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedExtraIds.includes(extra.id)}
                        onCheckedChange={() => toggleExtra(extra.id)}
                      />
                      <span className="text-sm font-medium">{extra.label}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {Number(extra.price) > 0 ? `+${formatCurrency(extra.price)}` : 'Sin costo'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* ── Cantidad y total ── */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-semibold">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setQuantity((q) => q + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-xl font-bold">{formatCurrency(lineTotal)}</p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          <Button variant="outline" className="w-full sm:w-auto" onClick={onClose}>
            Cancelar
          </Button>
          <Button className="w-full sm:w-auto" onClick={handleConfirm}>
            Agregar al carrito
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
