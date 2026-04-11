'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { CartScanButton } from '@/components/pos/cart-scan-button'
import { useCartStore } from '@/lib/stores/cart-store'
import { useCashStore } from '@/lib/stores/cash-store'
import { useBranchStore } from '@/lib/stores/branch-store'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useIsMobile } from '@/hooks/use-mobile'
import { formatCurrency } from '@/lib/utils/format'
import { toast } from 'sonner'
import {
  ShoppingCart,
  Trash2,
  CreditCard,
  AlertCircle,
  Wallet,
  ReceiptText,
  Package,
} from 'lucide-react'

export default function POSPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { currentBranch } = useBranchStore()
  const { currentSession, loadCurrentSession, loadRegisters } = useCashStore()
  const { items, getTotal, clearCart } = useCartStore()
  const isMobile = useIsMobile()

  const [paymentPanelOpen, setPaymentPanelOpen] = useState(false)
  const [clearCartDialogOpen, setClearCartDialogOpen] = useState(false)
  const [lastSaleId, setLastSaleId] = useState<string | null>(null)
  const [mobileTab, setMobileTab] = useState<'products' | 'cart'>('products')

  useEffect(() => {
    if (user) loadCurrentSession(user.id)
    if (currentBranch) loadRegisters(currentBranch.id)
  }, [user, currentBranch, loadCurrentSession, loadRegisters])

  const total = getTotal()
  const hasItems = items.length > 0

  const handleOpenPayment = () => {
    if (!currentSession) {
      toast.error('Debes abrir una caja antes de realizar ventas', {
        action: { label: 'Abrir caja', onClick: () => router.push('/cash-register') },
      })
      return
    }
    setPaymentPanelOpen(true)
  }

  const handleSaleComplete = (saleId: string) => {
    setLastSaleId(saleId)
    setMobileTab('products')
    toast.success('Venta completada exitosamente', {
      description: `Folio: ${saleId}`,
      action: { label: 'Ver ticket', onClick: () => router.push(`/sales/${saleId}`) },
    })
  }

  const handleClearCart = () => {
    clearCart()
    setClearCartDialogOpen(false)
    toast.info('Carrito vacío')
  }

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
                Para realizar ventas, primero debes abrir una caja.
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

  /* ─────────────── MOBILE LAYOUT ─────────────── */
  if (isMobile) {
    return (
      <div className="flex flex-col h-[calc(100vh-3.5rem)]">
        <Tabs value={mobileTab} onValueChange={(v) => setMobileTab(v as 'products' | 'cart')} className="flex flex-col flex-1 overflow-hidden">
          {/* Tab bar */}
          <TabsList className="w-full rounded-none border-b h-11 shrink-0">
            <TabsTrigger value="products" className="flex-1 gap-1.5">
              <Package className="h-4 w-4" />
              Productos
            </TabsTrigger>
            <TabsTrigger value="cart" className="flex-1 gap-1.5">
              <ShoppingCart className="h-4 w-4" />
              Carrito
              {hasItems && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {items.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Products tab */}
          <TabsContent value="products" className="flex-1 flex flex-col overflow-hidden m-0 data-[state=inactive]:hidden">
            <div className="p-3 border-b">
              <ProductSearch onProductSelect={() => { if (isMobile) setMobileTab('cart') }} />
            </div>
            <div className="flex-1 overflow-hidden">
              <ProductGrid />
            </div>
          </TabsContent>

          {/* Cart tab */}
          <TabsContent value="cart" className="flex-1 flex flex-col overflow-hidden m-0 data-[state=inactive]:hidden">
            {/* Cart header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-background shrink-0">
              <span className="font-semibold text-sm">Resumen de venta</span>
              <div className="flex items-center gap-1">
                <CartScanButton />
                {hasItems && (
                  <Button variant="ghost" size="sm" onClick={() => setClearCartDialogOpen(true)} className="text-destructive hover:text-destructive h-8 px-2">
                    <Trash2 className="h-4 w-4 mr-1" />
                    Vaciar
                  </Button>
                )}
              </div>
            </div>
            </div>

            <div className="flex-1 overflow-hidden">
              <CartList />
            </div>

            <CartSummary />

            {/* Action buttons */}
            <div className="p-3 border-t bg-background space-y-2 shrink-0">
              <Button size="lg" className="w-full h-13 text-base" disabled={!hasItems} onClick={handleOpenPayment}>
                <CreditCard className="h-5 w-5 mr-2" />
                Cobrar {hasItems && formatCurrency(total)}
              </Button>
              {lastSaleId && (
                <Button variant="outline" size="sm" className="w-full" onClick={() => router.push(`/sales/${lastSaleId}`)}>
                  <ReceiptText className="h-4 w-4 mr-2" />
                  Ver última venta
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <PaymentPanel open={paymentPanelOpen} onOpenChange={setPaymentPanelOpen} onSaleComplete={handleSaleComplete} />

        <AlertDialog open={clearCartDialogOpen} onOpenChange={setClearCartDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Vaciar carrito</AlertDialogTitle>
              <AlertDialogDescription>Esta acción eliminará todos los productos del carrito.</AlertDialogDescription>
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

  /* ─────────────── DESKTOP LAYOUT ─────────────── */
  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <div className="flex-1 flex overflow-hidden">
        {/* Left — Products */}
        <div className="flex-1 flex flex-col border-r overflow-hidden">
          <div className="p-4 border-b">
            <ProductSearch />
          </div>
          <div className="flex-1 overflow-hidden">
            <ProductGrid />
          </div>
        </div>

        {/* Right — Cart */}
        <div className="w-96 xl:w-[420px] flex flex-col bg-muted/30">
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
            <div className="flex items-center gap-1">
              <CartScanButton />
              {hasItems && (
                <Button variant="ghost" size="sm" onClick={() => setClearCartDialogOpen(true)} className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Vaciar
                </Button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <CartList />
          </div>

          <CartSummary />

          <div className="p-4 border-t bg-background space-y-2">
            <Button size="lg" className="w-full h-14 text-lg" disabled={!hasItems} onClick={handleOpenPayment}>
              <CreditCard className="h-5 w-5 mr-2" />
              Cobrar {hasItems && formatCurrency(total)}
            </Button>
            {lastSaleId && (
              <Button variant="outline" size="sm" className="w-full" onClick={() => router.push(`/sales/${lastSaleId}`)}>
                <ReceiptText className="h-4 w-4 mr-2" />
                Ver última venta
              </Button>
            )}
          </div>
        </div>
      </div>

      <PaymentPanel open={paymentPanelOpen} onOpenChange={setPaymentPanelOpen} onSaleComplete={handleSaleComplete} />

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
