'use client'

import { BarcodeScanButton } from '@/components/barcode/barcode-scanner-modal'
import { useProductsStore } from '@/lib/stores/products-store'
import { useCartStore } from '@/lib/stores/cart-store'
import { toast } from 'sonner'

export function CartScanButton() {
  const { searchProducts } = useProductsStore()
  const { addItem } = useCartStore()

  const handleScan = (code: string) => {
    const results = searchProducts(code)
    if (results.length === 0) {
      toast.error(`No se encontró producto con código: ${code}`)
      return
    }
    const product = results[0]
    addItem(product, 1)
    toast.success(`${product.name} agregado al carrito`)
  }

  return (
    <BarcodeScanButton
      onScan={handleScan}
      title="Escanear producto al carrito"
      className="h-8 w-8"
    />
  )
}
