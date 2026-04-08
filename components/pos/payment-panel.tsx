'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCartStore } from '@/lib/stores/cart-store'
import { useCashStore } from '@/lib/stores/cash-store'
import { useBranchStore } from '@/lib/stores/branch-store'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useSalesStore } from '@/lib/stores/sales-store'
import { customersDB } from '@/lib/db/local-storage'
import { formatCurrency } from '@/lib/utils/format'
import {
  Banknote,
  CreditCard,
  ArrowRightLeft,
  Ticket,
  Calculator,
  Check,
  X,
  User,
  Search,
  AlertCircle,
} from 'lucide-react'
import type { PaymentMethod, Customer } from '@/lib/types'

interface PaymentPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaleComplete?: (saleId: string) => void
}

const PAYMENT_METHODS: { method: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { method: 'cash', label: 'Efectivo', icon: <Banknote className="h-4 w-4" /> },
  { method: 'card', label: 'Tarjeta', icon: <CreditCard className="h-4 w-4" /> },
  { method: 'transfer', label: 'Transferencia', icon: <ArrowRightLeft className="h-4 w-4" /> },
  { method: 'voucher', label: 'Vales', icon: <Ticket className="h-4 w-4" /> },
]

const QUICK_AMOUNTS = [20, 50, 100, 200, 500, 1000]

export function PaymentPanel({ open, onOpenChange, onSaleComplete }: PaymentPanelProps) {
  const { items, customer, payments, discount, getTotal, addPayment, clearPayments, setCustomer, clearCart, notes, setNotes } = useCartStore()
  const { currentSession } = useCashStore()
  const { currentBranch } = useBranchStore()
  const { user } = useAuthStore()
  const { createSale } = useSalesStore()

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('cash')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentReference, setPaymentReference] = useState('')
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')
  const [customerResults, setCustomerResults] = useState<Customer[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const total = getTotal()
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
  const remaining = Math.max(0, total - totalPaid)
  const change = Math.max(0, totalPaid - total)
  const canComplete = totalPaid >= total && items.length > 0

  useEffect(() => {
    if (open) {
      setPaymentAmount(remaining.toFixed(2))
      setSelectedMethod('cash')
      setPaymentReference('')
      setError(null)
    }
  }, [open, remaining])

  useEffect(() => {
    if (customerSearchQuery.length >= 2) {
      const results = customersDB.search(customerSearchQuery).slice(0, 5)
      setCustomerResults(results)
    } else {
      setCustomerResults([])
    }
  }, [customerSearchQuery])

  const handleAddPayment = () => {
    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) return

    addPayment({
      method: selectedMethod,
      amount,
      reference: paymentReference,
    })

    setPaymentAmount(Math.max(0, remaining - amount).toFixed(2))
    setPaymentReference('')
  }

  const handleQuickAmount = (amount: number) => {
    setPaymentAmount(amount.toString())
  }

  const handleExactAmount = () => {
    setPaymentAmount(remaining.toFixed(2))
  }

  const handleSelectCustomer = (selectedCustomer: Customer) => {
    setCustomer(selectedCustomer)
    setCustomerSearchQuery('')
    setCustomerResults([])
  }

  const handleCompleteSale = async () => {
    if (!currentSession || !currentBranch || !user) {
      setError('Debes tener una caja abierta para realizar ventas')
      return
    }

    if (!canComplete) return

    setIsProcessing(true)
    setError(null)

    try {
      // Calculate change for cash payment
      const finalPayments = payments.map((p) => ({
        ...p,
        changeAmount: p.method === 'cash' ? Math.max(0, totalPaid - total) : 0,
      }))

      const sale = createSale({
        branchId: currentBranch.id,
        cashSessionId: currentSession.id,
        userId: user.id,
        items,
        customer,
        discount: discount ? { type: discount.type, value: discount.value } : null,
        payments: finalPayments,
        notes,
      })

      if (sale) {
        clearCart()
        clearPayments()
        onOpenChange(false)
        onSaleComplete?.(sale.id)
      } else {
        setError('Error al crear la venta')
      }
    } catch {
      setError('Error al procesar la venta')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancel = () => {
    clearPayments()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Procesar Pago</DialogTitle>
          <DialogDescription>
            Total a cobrar: <span className="font-bold text-foreground">{formatCurrency(total)}</span>
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <div className="flex-1 overflow-auto">
          <Tabs defaultValue="payment" className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="payment">Pago</TabsTrigger>
              <TabsTrigger value="customer">Cliente</TabsTrigger>
            </TabsList>

            <TabsContent value="payment" className="space-y-4 mt-4">
              {/* Payment Method Selection */}
              <div className="space-y-2">
                <Label>Método de pago</Label>
                <div className="grid grid-cols-4 gap-2">
                  {PAYMENT_METHODS.map(({ method, label, icon }) => (
                    <Button
                      key={method}
                      variant={selectedMethod === method ? 'default' : 'outline'}
                      className="flex flex-col gap-1 h-auto py-3"
                      onClick={() => setSelectedMethod(method)}
                    >
                      {icon}
                      <span className="text-xs">{label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <Label>Monto recibido</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="flex-1 text-lg h-12"
                    placeholder="0.00"
                  />
                  <Button variant="outline" onClick={handleExactAmount} className="h-12">
                    <Calculator className="h-4 w-4 mr-2" />
                    Exacto
                  </Button>
                </div>
              </div>

              {/* Quick Amounts for Cash */}
              {selectedMethod === 'cash' && (
                <div className="space-y-2">
                  <Label>Montos rápidos</Label>
                  <div className="grid grid-cols-6 gap-2">
                    {QUICK_AMOUNTS.map((amount) => (
                      <Button
                        key={amount}
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAmount(amount)}
                      >
                        ${amount}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Reference for non-cash */}
              {selectedMethod !== 'cash' && (
                <div className="space-y-2">
                  <Label>Referencia (opcional)</Label>
                  <Input
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder={selectedMethod === 'card' ? 'Últimos 4 dígitos' : 'Número de referencia'}
                  />
                </div>
              )}

              {/* Add Payment Button */}
              <Button onClick={handleAddPayment} className="w-full" disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}>
                Agregar pago
              </Button>

              <Separator />

              {/* Payments Added */}
              {payments.length > 0 && (
                <div className="space-y-2">
                  <Label>Pagos agregados</Label>
                  <div className="space-y-2">
                    {payments.map((payment, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded-lg">
                        <div className="flex items-center gap-2">
                          {PAYMENT_METHODS.find((m) => m.method === payment.method)?.icon}
                          <span className="text-sm">
                            {PAYMENT_METHODS.find((m) => m.method === payment.method)?.label}
                          </span>
                          {payment.reference && (
                            <Badge variant="outline" className="text-xs">
                              {payment.reference}
                            </Badge>
                          )}
                        </div>
                        <span className="font-medium">{formatCurrency(payment.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                <div className="flex justify-between">
                  <span>Total</span>
                  <span className="font-medium">{formatCurrency(total)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pagado</span>
                  <span className="font-medium">{formatCurrency(totalPaid)}</span>
                </div>
                {remaining > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>Restante</span>
                    <span className="font-medium">{formatCurrency(remaining)}</span>
                  </div>
                )}
                {change > 0 && (
                  <div className="flex justify-between text-green-600 text-lg">
                    <span className="font-semibold">Cambio</span>
                    <span className="font-bold">{formatCurrency(change)}</span>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="customer" className="space-y-4 mt-4">
              {/* Customer Selection */}
              {customer ? (
                <div className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{customer.name}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setCustomer(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {customer.rfc && (
                    <p className="text-sm text-muted-foreground">RFC: {customer.rfc}</p>
                  )}
                  {customer.email && (
                    <p className="text-sm text-muted-foreground">{customer.email}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar cliente por nombre, RFC o correo..."
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {customerResults.length > 0 && (
                    <div className="border rounded-lg divide-y">
                      {customerResults.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => handleSelectCustomer(c)}
                          className="w-full flex items-center gap-3 p-3 text-left hover:bg-accent transition-colors"
                        >
                          <User className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{c.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {c.rfc || 'Sin RFC'} {c.email && `- ${c.email}`}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground text-center">
                    La venta puede realizarse sin cliente asociado
                  </p>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notas de la venta (opcional)</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Agregar notas o comentarios..."
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleCompleteSale}
            disabled={!canComplete || isProcessing}
            className="min-w-32"
          >
            {isProcessing ? (
              'Procesando...'
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Completar Venta
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
