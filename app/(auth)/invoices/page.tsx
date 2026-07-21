"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { FileText, Receipt, Lock, Settings as SettingsIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useCustomersStore } from '@/lib/stores/customers-store'
import { useInvoicesStore } from '@/lib/stores/invoices-store'
import { useSalesStore } from '@/lib/stores/sales-store'
import { useSettingsStore } from '@/lib/stores/settings-store'
import { formatCurrency, formatDateTime, formatInvoiceStatus } from '@/lib/utils/format'

export default function InvoicesPage() {
  const { invoices, loadInvoices, createInvoiceFromSale, cancelInvoice } = useInvoicesStore()
  const { sales, loadSales } = useSalesStore()
  const { customers, loadCustomers } = useCustomersStore()
  const { settings, isLoaded, loadSettings } = useSettingsStore()
  const [reason, setReason] = useState('')
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)

  useEffect(() => { void loadSettings() }, [loadSettings])

  useEffect(() => {
    if (settings.invoicingEnabled) {
      loadInvoices(); loadSales(); loadCustomers()
    }
  }, [settings.invoicingEnabled, loadInvoices, loadSales, loadCustomers])

  const pendingSales = useMemo(() => sales.filter((sale) => sale.status === 'completed' && sale.invoiceStatus !== 'invoiced' && sale.customerId), [sales])
  const findCustomer = (id: string) => customers.find((item) => item.id === id)

  if (!isLoaded) {
    return <div className="p-6 text-sm text-muted-foreground">Cargando...</div>
  }

  // ── Módulo desactivado ──
  if (!settings.invoicingEnabled) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">Facturación</h1>
          <p className="text-sm text-muted-foreground">Módulo desactivado</p>
        </div>

        <Card className="mx-auto w-full max-w-xl">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <p className="font-medium">La facturación electrónica está desactivada</p>
              <p className="text-sm text-muted-foreground">
                Este módulo aún no está conectado a un PAC autorizado por el SAT, por lo que
                <strong> no emite CFDI válidos</strong>. Se mantiene apagado para evitar marcar
                ventas como facturadas por error.
              </p>
              <p className="text-sm text-muted-foreground">
                Cuando definas con qué negocios se va a implementar y contrates el servicio de
                timbrado, se puede activar desde Configuración.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/settings">
                <SettingsIcon className="mr-2 h-4 w-4" />
                Ir a Configuración
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Facturación</h1>
        <p className="text-muted-foreground">Módulo en modo local. Los comprobantes generados aquí no están timbrados ante el SAT.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Ventas pendientes por facturar</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader><TableRow><TableHead>Folio</TableHead><TableHead>Cliente</TableHead><TableHead>Total</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {pendingSales.length === 0 ? <TableRow><TableCell colSpan={4} className="h-24 text-center">Sin ventas pendientes.</TableCell></TableRow> : pendingSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>{sale.folio}</TableCell>
                      <TableCell>{findCustomer(sale.customerId || '')?.name || 'Cliente'}</TableCell>
                      <TableCell>{formatCurrency(sale.total)}</TableCell>
                      <TableCell className="text-right"><Button size="sm" onClick={() => { createInvoiceFromSale(sale.id); loadInvoices(); loadSales() }}>Facturar</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Facturas generadas</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader><TableRow><TableHead>Folio</TableHead><TableHead>Cliente</TableHead><TableHead>Total</TableHead><TableHead>Estatus</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {invoices.length === 0 ? <TableRow><TableCell colSpan={5} className="h-24 text-center">Aún no hay facturas.</TableCell></TableRow> : invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.internalFolio}</TableCell>
                      <TableCell>{invoice.receiverName}</TableCell>
                      <TableCell>{formatCurrency(invoice.total)}</TableCell>
                      <TableCell><Badge variant={invoice.status === 'cancelled' ? 'destructive' : 'default'}>{formatInvoiceStatus(invoice.status)}</Badge></TableCell>
                      <TableCell className="text-right">
                        {invoice.status !== 'cancelled' && <Button variant="outline" size="sm" onClick={() => setSelectedInvoiceId(invoice.id)}>Cancelar</Button>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              {invoices.slice(0, 3).map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div className="flex items-center gap-2"><FileText className="h-4 w-4" /> {invoice.internalFolio}</div>
                  <div>{formatDateTime(invoice.createdAt)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(selectedInvoiceId)} onOpenChange={(open) => !open && setSelectedInvoiceId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancelar factura</DialogTitle></DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Motivo</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej. error en datos fiscales" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedInvoiceId(null)}>Volver</Button>
            <Button variant="destructive" disabled={!reason || !selectedInvoiceId} onClick={() => { if (selectedInvoiceId) { cancelInvoice(selectedInvoiceId, reason); loadInvoices(); loadSales(); setSelectedInvoiceId(null); setReason('') } }}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" /> Nota importante</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Este módulo genera comprobantes locales para probar el flujo. Para emitir CFDI 4.0 válidos hay que conectarlo a un PAC autorizado (Facturapi, Facturama, SW o Finkok) y contar con el Certificado de Sello Digital del negocio.
        </CardContent>
      </Card>
    </div>
  )
}
