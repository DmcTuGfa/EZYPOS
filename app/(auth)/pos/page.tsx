'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ProductSearch } from '@/components/pos/product-search'
import { ProductGrid } from '@/components/pos/product-grid'
import { CartList } from '@/components/pos/cart-list'
import { CartSummary } from '@/components/pos/cart-summary'
import { PaymentPanel } from '@/components/pos/payment-panel'
import { useCartStore } from '@/lib/stores/cart-store'
import { useCashStore } from '@/lib/stores/cash-store'
import { useBranchStore } from '@/lib/stores/branch-store'
import { useAuthStore } from '@/lib/stores/auth-store'
import { formatCurrency } from '@/lib/utils/format'
import { toast } from 'sonner'
import {
  ShoppingCart,
  Trash2,
  CreditCard,
  AlertCircle,
  Wallet,
  ReceiptText,
} from 'lucide-react'

export default function POSPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { currentBranch } = useBranchStore()
  const { currentSession, loadCurrentSession, loadRegisters } = useCashStore()
  const { items, getTotal, clearCart } = useCartStore()

  const [paymentPanelOpen, setPaymentPanelOpen] = useState(false)
  const [clearCartDialogOpen, setClearCartDialogOpen] = useState(false)
  const [lastSaleId, setLastSaleId] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadCurrentSession(user.id)
    }
    if (currentBranch) {
      loadRegisters(currentBranch.id)
    }
  }, [user, currentBranch, loadCurrentSession, loadRegisters])

  const total = getTotal()
  const hasItems = items.length > 0

  const handleOpenPayment = () => {
    if (!currentSession) {
      toast.error('Debes abrir una caja antes de realizar ventas', {
        action: {
          label: 'Abrir caja',
          onClick: () => router.push('/cash-register'),
        },
      })
      return
    }
    setPaymentPanelOpen(true)
  }

  const handleSaleComplete = (saleId: string) => {
    setLastSaleId(saleId)
    toast.success('Venta completada exitosamente', {
      description: `Folio: ${saleId}`,
      action: {
        label: 'Ver ticket',
        onClick: () => router.push(`/sales/${saleId}`),
      },
    })
  }

  const handleClearCart = () => {
    clearCart()
    setClearCartDialogOpen(false)
    toast.info('Carrito vacío')
  }

  // Show warning if no cash session is open
  if (!currentSession) {
    return (
      <div className="flex flex-col h-[calc(100vh-3.5rem)]">
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <AlertCircle className="h-6 w-6" />
              </div>
              <CardTitle>Caja cerrada</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Para realizar ventas, primero debes abrir una caja. Ve al módulo de corte de caja para iniciar tu turno.
              </p>
              <Button onClick={() => router.push('/cash-register')} className="w-full">
                <Wallet className="h-4 w-4 mr-2" />
                Ir a Caja
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side - Products */}
        <div className="flex-1 flex flex-col border-r overflow-hidden">
          {/* Search Bar */}
          <div className="p-4 border-b">
            <ProductSearch />
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-hidden">
            <ProductGrid />
          </div>
        </div>

        {/* Right Side - Cart */}
        <div className="w-full lg:w-96 xl:w-[420px] flex flex-col bg-muted/30">
          {/* Cart Header */}
          <div className="flex items-center justify-between p-4 border-b bg-background">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              <span className="font-semibold">Carrito</span>
              {hasItems && (
                <Badge variant="secondary">
                  {items.length} {items.length === 1 ? 'producto' : 'productos'}
                </Badge>
              )}
            </div>
            {hasItems && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setClearCartDialogOpen(true)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Vaciar
              </Button>
            )}
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-hidden">
            <CartList />
          </div>

          {/* Cart Summary */}
          <CartSummary />

          {/* Action Buttons */}
          <div className="p-4 border-t bg-background space-y-2">
            <Button
              size="lg"
              className="w-full h-14 text-lg"
              disabled={!hasItems}
              onClick={handleOpenPayment}
            >
              <CreditCard className="h-5 w-5 mr-2" />
              Cobrar {hasItems && formatCurrency(total)}
            </Button>
            
            {lastSaleId && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => router.push(`/sales/${lastSaleId}`)}
              >
                <ReceiptText className="h-4 w-4 mr-2" />
                Ver última venta
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Payment Panel */}
      <PaymentPanel
        open={paymentPanelOpen}
        onOpenChange={setPaymentPanelOpen}
        onSaleComplete={handleSaleComplete}
      />

      {/* Clear Cart Dialog */}
      <AlertDialog open={clearCartDialogOpen} onOpenChange={setClearCartDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vaciar carrito</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará todos los productos del carrito. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearCart} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Vaciar carrito
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
