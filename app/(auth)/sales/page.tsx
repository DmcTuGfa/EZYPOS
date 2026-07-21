"use client"

import { useEffect, useState } from "react"
import { Search, Eye, XCircle, Receipt, MessageCircle, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useSalesStore } from "@/lib/stores/sales-store"
import { useBranchStore } from "@/lib/stores/branch-store"
import { useCustomersStore } from "@/lib/stores/customers-store"
import { apiFetch } from "@/lib/api/client"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils/format"
import { TicketLinkButtons } from "@/components/ticket/ticket-link-buttons"
import { toast } from "sonner"
import type { Sale, SaleItem, SalePayment } from "@/lib/types"

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  voucher: "Vales",
  mixed: "Mixto",
}

export default function SalesPage() {
  const { sales, loadSales, cancelSale } = useSalesStore()
  const { branches, loadBranches } = useBranchStore()
  const { customers, loadCustomers } = useCustomersStore()

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<string>("today")
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [saleItems, setSaleItems] = useState<SaleItem[]>([])
  const [salePayments, setSalePayments] = useState<SalePayment[]>([])
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState("")

  useEffect(() => {
    loadSales()
    loadBranches()
    loadCustomers()
  }, [loadSales, loadBranches, loadCustomers])

  const filteredSales = sales.filter((sale) => {
    const customerName = sale.customerId
      ? customers.find((c) => c.id === sale.customerId)?.name || ""
      : ""
    const term = searchTerm.toLowerCase()
    const matchesSearch =
      !term || sale.folio.toLowerCase().includes(term) || customerName.toLowerCase().includes(term)

    const matchesStatus = statusFilter === "all" || sale.status === statusFilter

    let matchesDate = true
    const saleDate = new Date(sale.createdAt)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (dateFilter === "today") {
      const saleDateOnly = new Date(saleDate)
      saleDateOnly.setHours(0, 0, 0, 0)
      matchesDate = saleDateOnly.getTime() === today.getTime()
    } else if (dateFilter === "week") {
      const weekAgo = new Date(today)
      weekAgo.setDate(weekAgo.getDate() - 7)
      matchesDate = saleDate >= weekAgo
    } else if (dateFilter === "month") {
      const monthAgo = new Date(today)
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      matchesDate = saleDate >= monthAgo
    }

    return matchesSearch && matchesStatus && matchesDate
  })

  async function handleViewSale(sale: Sale) {
    setSelectedSale(sale)
    setSaleItems([])
    setSalePayments([])
    setIsDetailDialogOpen(true)
    setIsLoadingDetail(true)
    try {
      const data = await apiFetch<{ sale: Sale; items: SaleItem[]; payments: SalePayment[] }>(
        `/api/sales/${sale.id}`
      )
      setSelectedSale(data.sale)
      setSaleItems(data.items || [])
      setSalePayments(data.payments || [])
    } catch {
      toast.error("No se pudo cargar el detalle de la venta")
    } finally {
      setIsLoadingDetail(false)
    }
  }

  async function handleCancelSale() {
    if (!selectedSale || !cancelReason) return
    try {
      await cancelSale(selectedSale.id, selectedSale.userId, cancelReason)
      toast.success("Venta cancelada")
      setIsCancelDialogOpen(false)
      setIsDetailDialogOpen(false)
      setCancelReason("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cancelar la venta")
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "completed":
        return <Badge variant="default">Completada</Badge>
      case "cancelled":
        return <Badge variant="destructive">Cancelada</Badge>
      case "invoiced":
        return <Badge className="bg-blue-500">Facturada</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getPaymentMethodLabel = (method?: string) =>
    (method && PAYMENT_LABELS[method]) || method || "—"

  function getCustomer(customerId?: string | null) {
    if (!customerId) return null
    return customers.find((c) => c.id === customerId) || null
  }

  const getCustomerName = (customerId?: string | null) =>
    getCustomer(customerId)?.name || "Público general"

  const getBranchName = (branchId: string) =>
    branches.find((b) => b.id === branchId)?.name || "Sucursal"

  function sendWhatsApp(sale: Sale) {
    const phone = getCustomer(sale.customerId)?.phone || ""
    const digits = phone.replace(/\D/g, "")
    const to = digits ? (digits.length === 10 ? `52${digits}` : digits) : ""
    const url = `${window.location.origin}/ticket/venta/${sale.id}`
    const text = encodeURIComponent(
      `Ticket de compra ${sale.folio} por ${formatCurrency(sale.total)}\n${url}`
    )
    window.open(to ? `https://wa.me/${to}?text=${text}` : `https://wa.me/?text=${text}`, "_blank")
  }

  const completedSales = filteredSales.filter((s) => s.status === "completed")
  const totalSales = completedSales.reduce((sum, s) => sum + Number(s.total || 0), 0)

  return (
    <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">Historial de Ventas</h1>
          <p className="text-sm text-muted-foreground">
            Consulta ventas y envía comprobantes digitales
          </p>
        </div>
        <div className="rounded-lg border p-3 text-right md:border-0 md:p-0">
          <p className="text-xs text-muted-foreground">{completedSales.length} ventas</p>
          <p className="text-lg font-bold">{formatCurrency(totalSales)}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="p-4 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por folio o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 md:flex md:w-auto">
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full md:w-[150px]">
                  <SelectValue placeholder="Fecha" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoy</SelectItem>
                  <SelectItem value="week">Esta semana</SelectItem>
                  <SelectItem value="month">Este mes</SelectItem>
                  <SelectItem value="all">Todas</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[150px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="completed">Completadas</SelectItem>
                  <SelectItem value="cancelled">Canceladas</SelectItem>
                  <SelectItem value="invoiced">Facturadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
          {filteredSales.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Receipt className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No se encontraron ventas</p>
            </div>
          ) : (
            <>
              {/* Móvil: tarjetas */}
              <div className="space-y-3 lg:hidden">
                {filteredSales.map((sale) => (
                  <div key={sale.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-medium">{sale.folio}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {getCustomerName(sale.customerId)}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(sale.createdAt)}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-semibold">{formatCurrency(sale.total)}</p>
                        <div className="mt-1">{getStatusBadge(sale.status)}</div>
                      </div>
                    </div>

                    <Separator className="my-3" />

                    <div className="grid grid-cols-3 gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleViewSale(sale)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/ticket/venta/${sale.id}`, "_blank")}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        className="bg-[#25D366] text-white hover:bg-[#1eb955]"
                        onClick={() => sendWhatsApp(sale)}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Escritorio: tabla */}
              <div className="hidden rounded-md border lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Folio</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Sucursal</TableHead>
                      <TableHead>Pago</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-[150px] text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-mono font-medium">{sale.folio}</TableCell>
                        <TableCell className="text-sm">{formatDate(sale.createdAt)}</TableCell>
                        <TableCell>{getCustomerName(sale.customerId)}</TableCell>
                        <TableCell>{getBranchName(sale.branchId)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getPaymentMethodLabel(sale.paymentMethod)}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(sale.total)}
                        </TableCell>
                        <TableCell>{getStatusBadge(sale.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" title="Ver detalle" onClick={() => handleViewSale(sale)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Ver comprobante"
                              onClick={() => window.open(`/ticket/venta/${sale.id}`, "_blank")}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Enviar por WhatsApp"
                              className="text-[#25D366]"
                              onClick={() => sendWhatsApp(sale)}
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Detalle de venta ── */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-[95vw] overflow-hidden sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2">
              <span className="font-mono">{selectedSale?.folio}</span>
              {selectedSale && getStatusBadge(selectedSale.status)}
            </DialogTitle>
            <DialogDescription>
              {selectedSale && formatDateTime(selectedSale.createdAt)}
            </DialogDescription>
          </DialogHeader>

          {selectedSale && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Cliente</p>
                    <p className="font-medium">{getCustomerName(selectedSale.customerId)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Sucursal</p>
                    <p className="font-medium">{getBranchName(selectedSale.branchId)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Método de pago</p>
                    <p className="font-medium">{getPaymentMethodLabel(selectedSale.paymentMethod)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Estado</p>
                    <p className="font-medium">{selectedSale.status}</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="mb-2 font-medium">Productos</h4>
                  {isLoadingDetail ? (
                    <p className="py-4 text-sm text-muted-foreground">Cargando...</p>
                  ) : (
                    <div className="space-y-2">
                      {saleItems.map((item) => (
                        <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{item.productName}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.quantity} x {formatCurrency(item.unitPrice)}
                            </p>
                          </div>
                          <span className="whitespace-nowrap font-medium">
                            {formatCurrency(item.total)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(selectedSale.subtotal)}</span>
                  </div>
                  {Number(selectedSale.discountAmount || 0) > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Descuento</span>
                      <span>-{formatCurrency(selectedSale.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IVA</span>
                    <span>{formatCurrency(selectedSale.taxAmount)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>{formatCurrency(selectedSale.total)}</span>
                  </div>
                </div>

                {salePayments.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-1 text-sm">
                      <p className="font-medium">Pagos</p>
                      {salePayments.map((payment) => (
                        <div key={payment.id} className="flex justify-between">
                          <span className="text-muted-foreground">
                            {getPaymentMethodLabel(payment.method)}
                          </span>
                          <span>{formatCurrency(payment.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {selectedSale.notes && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground">Notas</p>
                      <p className="text-sm">{selectedSale.notes}</p>
                    </div>
                  </>
                )}

                <Separator />

                <div>
                  <p className="mb-2 text-sm font-medium">Comprobante digital</p>
                  <TicketLinkButtons
                    path={`/ticket/venta/${selectedSale.id}`}
                    message={`Ticket de compra ${selectedSale.folio} por ${formatCurrency(selectedSale.total)}`}
                    phone={getCustomer(selectedSale.customerId)?.phone}
                  />
                </div>
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            {selectedSale?.status === "completed" && (
              <Button
                variant="outline"
                className="w-full text-destructive sm:w-auto"
                onClick={() => setIsCancelDialogOpen(true)}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Cancelar venta
              </Button>
            )}
            <Button className="w-full sm:w-auto" onClick={() => setIsDetailDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Cancelación ── */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar Venta</DialogTitle>
            <DialogDescription>
              Esta acción cancelará la venta {selectedSale?.folio} y restaurará el inventario.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Motivo de cancelación *</Label>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ingresa el motivo de la cancelación..."
              rows={3}
            />
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsCancelDialogOpen(false)}>
              Volver
            </Button>
            <Button
              variant="destructive"
              className="w-full sm:w-auto"
              onClick={handleCancelSale}
              disabled={!cancelReason}
            >
              Confirmar cancelación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
