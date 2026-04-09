'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { apiFetch } from '@/lib/api/client'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { Sale, SaleItem, SalePayment } from '@/lib/types'

export default function SaleDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [sale, setSale] = useState<Sale | null>(null)
  const [items, setItems] = useState<SaleItem[]>([])
  const [payments, setPayments] = useState<SalePayment[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const data = await apiFetch<{ sale: Sale; items: SaleItem[]; payments: SalePayment[] }>(`/api/sales/${params.id}`)
        setSale(data.sale)
        setItems(data.items)
        setPayments(data.payments)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo cargar la venta')
      }
    }
    if (params.id) load()
  }, [params.id])

  if (error) return <div className="p-6">{error}</div>
  if (!sale) return <div className="p-6">Cargando...</div>

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Venta {sale.folio}</h1>
          <p className="text-muted-foreground">{formatDate(sale.createdAt)}</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>Regresar</Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Detalle</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium">{item.productName}</p>
                <p className="text-sm text-muted-foreground">{item.quantity} x {formatCurrency(item.unitPrice)}</p>
              </div>
              <p>{formatCurrency(item.total)}</p>
            </div>
          ))}
          <Separator />
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(sale.subtotal)}</span></div>
            <div className="flex justify-between"><span>IVA</span><span>{formatCurrency(sale.taxAmount)}</span></div>
            <div className="flex justify-between font-semibold"><span>Total</span><span>{formatCurrency(sale.total)}</span></div>
          </div>
          <Separator />
          <div>
            <p className="font-medium mb-2">Pagos</p>
            {payments.map((payment) => <div key={payment.id} className="flex justify-between text-sm"><span>{payment.method}</span><span>{formatCurrency(payment.amount)}</span></div>)}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
