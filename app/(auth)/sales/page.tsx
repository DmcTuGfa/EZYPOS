"use client"

import { useEffect, useMemo, useState } from 'react'
import { Eye, Receipt, Search, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useBranchStore } from '@/lib/stores/branch-store'
import { useCustomersStore } from '@/lib/stores/customers-store'
import { useSalesStore, type SaleWithDetails } from '@/lib/stores/sales-store'
import { formatCurrency, formatDateTime, formatPaymentMethod, formatSaleStatus } from '@/lib/utils/format'

export default function SalesPage() {
  const { user } = useAuthStore()
  const { branches, loadBranches } = useBranchStore()
  const { customers, loadCustomers } = useCustomersStore()
  const { sales, loadSales, getSaleWithDetails, cancelSale } = useSalesStore()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [branchFilter, setBranchFilter] = useState('all')
  const [selectedSale, setSelectedSale] = useState<SaleWithDetails | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [detailOpen, setDetailOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)

  useEffect(() => {
    loadSales()
    loadBranches()
    loadCustomers()
  }, [loadSales, loadBranches, loadCustomers])

  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      const customerName = customers.find((customer) => customer.id === sale.customerId)?.name || 'Público general'
      const bySearch = !search || sale.folio.toLowerCase().includes(search.toLowerCase()) || customerName.toLowerCase().includes(search.toLowerCase())
      const byStatus = status === 'all' || sale.status === status
      const byBranch = branchFilter === 'all' || sale.branchId === branchFilter
      return bySearch && byStatus && byBranch
    })
  }, [sales, customers, search, status, branchFilter])

  const completedSales = filteredSales.filter((sale) => sale.status !== 'cancelled')
  const totalAmount = completedSales.reduce((sum, sale) => sum + sale.total, 0)

  const viewSale = (saleId: string) => {
    const detail = getSaleWithDetails(saleId)
    setSelectedSale(detail)
    setDetailOpen(true)
  }

  const getBranchName = (branchId: string) => branches.find((branch) => branch.id === branchId)?.name || 'Sucursal'
  const getCustomerName = (customerId: string | null) => customers.find((customer) => customer.id === customerId)?.name || 'Público general'

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Historial de ventas</h1>
          <p className="text-muted-foreground">Consulta, revisa detalle y cancela ventas.</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">{completedSales.length} ventas válidas</p>
          <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por folio o cliente" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="completed">Completadas</SelectItem>
              <SelectItem value="invoiced">Facturadas</SelectItem>
              <SelectItem value="cancelled">Canceladas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger><SelectValue placeholder="Sucursal" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las sucursales</SelectItem>
              {branches.map((branch) => <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Folio</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estatus</TableHead>
                  <TableHead className="w-[110px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground"><Receipt className="h-8 w-8" /> No se encontraron ventas</div>
                    </TableCell>
                  </TableRow>
                ) : filteredSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{sale.folio}</TableCell>
                    <TableCell>{formatDateTime(sale.createdAt)}</TableCell>
                    <TableCell>{getCustomerName(sale.customerId)}</TableCell>
                    <TableCell>{getBranchName(sale.branchId)}</TableCell>
                    <TableCell>{formatCurrency(sale.total)}</TableCell>
                    <TableCell><Badge variant={sale.status === 'cancelled' ? 'destructive' : 'default'}>{formatSaleStatus(sale.status)}</Badge></TableCell>
                    <TableCell><Button variant="outline" size="sm" onClick={() => viewSale(sale.id)}><Eye className="mr-2 h-4 w-4" /> Ver</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Detalle de venta {selectedSale?.folio}</DialogTitle></DialogHeader>
          {selectedSale && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div><p className="text-sm text-muted-foreground">Cliente</p><p className="font-medium">{getCustomerName(selectedSale.customerId)}</p></div>
                <div><p className="text-sm text-muted-foreground">Sucursal</p><p className="font-medium">{getBranchName(selectedSale.branchId)}</p></div>
                <div><p className="text-sm text-muted-foreground">Fecha</p><p className="font-medium">{formatDateTime(selectedSale.createdAt)}</p></div>
                <div><p className="text-sm text-muted-foreground">Estado</p><p className="font-medium">{formatSaleStatus(selectedSale.status)}</p></div>
              </div>

              <Separator />

              <div>
                <h3 className="mb-2 font-medium">Artículos</h3>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>Cantidad</TableHead><TableHead>Precio</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {selectedSale.items.map((item) => (
                        <TableRow key={item.id}><TableCell>{item.productName}</TableCell><TableCell>{item.quantity}</TableCell><TableCell>{formatCurrency(item.unitPrice)}</TableCell><TableCell>{formatCurrency(item.total)}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div>
                <h3 className="mb-2 font-medium">Pagos</h3>
                <div className="space-y-2">
                  {selectedSale.payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <span>{formatPaymentMethod(payment.method)}</span>
                      <span>{formatCurrency(payment.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 rounded-md border p-4 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(selectedSale.subtotal)}</span></div>
                <div className="flex justify-between"><span>IVA</span><span>{formatCurrency(selectedSale.taxAmount)}</span></div>
                <div className="flex justify-between"><span>Descuento</span><span>- {formatCurrency(selectedSale.discountAmount)}</span></div>
                <Separator />
                <div className="flex justify-between text-base font-semibold"><span>Total</span><span>{formatCurrency(selectedSale.total)}</span></div>
              </div>
            </div>
          )}
          <DialogFooter>
            {selectedSale?.status !== 'cancelled' && <Button variant="destructive" onClick={() => setCancelOpen(true)}><XCircle className="mr-2 h-4 w-4" /> Cancelar venta</Button>}
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancelar venta</DialogTitle></DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Motivo de cancelación</Label>
            <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Describe el motivo" rows={4} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Volver</Button>
            <Button variant="destructive" disabled={!selectedSale || !cancelReason} onClick={() => {
              if (selectedSale && user) {
                cancelSale(selectedSale.id, user.id, cancelReason)
                loadSales()
                setCancelOpen(false)
                setDetailOpen(false)
                setCancelReason('')
              }
            }}>Confirmar cancelación</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
