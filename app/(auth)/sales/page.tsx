"use client"

import { useEffect, useState } from "react"
import { Search, Eye, Printer, FileText, XCircle, Receipt } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { useSalesStore } from "@/lib/stores/sales-store"
import { useBranchStore } from "@/lib/stores/branch-store"
import { useProductsStore } from "@/lib/stores/products-store"
import { useCustomersStore } from "@/lib/stores/customers-store"
import { formatCurrency, formatDate } from "@/lib/utils/format"
import { db } from "@/lib/db/local-storage"
import type { Sale, SaleItem } from "@/lib/types"

export default function SalesPage() {
  const { sales, loadSales, cancelSale } = useSalesStore()
  const { branches, loadBranches } = useBranchStore()
  const { products, loadProducts } = useProductsStore()
  const { customers, loadCustomers } = useCustomersStore()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<string>("today")
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [saleItems, setSaleItems] = useState<SaleItem[]>([])
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState("")

  useEffect(() => {
    loadSales()
    loadBranches()
    loadProducts()
    loadCustomers()
  }, [loadSales, loadBranches, loadProducts, loadCustomers])

  const filteredSales = sales.filter(sale => {
    // Search filter
    const matchesSearch = 
      sale.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sale.customerId && customers.find(c => c.id === sale.customerId)?.name.toLowerCase().includes(searchTerm.toLowerCase()))
    
    // Status filter
    const matchesStatus = statusFilter === "all" || sale.status === statusFilter

    // Date filter
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

  function handleViewSale(sale: Sale) {
    setSelectedSale(sale)
    const items = db.saleItems.getBySaleId(sale.id)
    setSaleItems(items)
    setIsDetailDialogOpen(true)
  }

  async function handleCancelSale() {
    if (selectedSale && cancelReason) {
      await cancelSale(selectedSale.id, selectedSale.userId, cancelReason)
      setIsCancelDialogOpen(false)
      setIsDetailDialogOpen(false)
      setCancelReason("")
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

  function getPaymentMethodLabel(method: string) {
    const labels: Record<string, string> = {
      cash: "Efectivo",
      card: "Tarjeta",
      transfer: "Transferencia",
      voucher: "Vales",
      mixed: "Mixto"
    }
    return labels[method] || method
  }

  function getProductName(productId: string) {
    return products.find(p => p.id === productId)?.name || "Producto"
  }

  function getCustomerName(customerId?: string) {
    if (!customerId) return "Público general"
    return customers.find(c => c.id === customerId)?.name || "Cliente"
  }

  function getBranchName(branchId: string) {
    return branches.find(b => b.id === branchId)?.name || "Sucursal"
  }

  // Calculate totals
  const totalSales = filteredSales.filter(s => s.status === "completed").reduce((sum, s) => sum + s.total, 0)
  const totalCount = filteredSales.filter(s => s.status === "completed").length

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Historial de Ventas</h1>
          <p className="text-muted-foreground">
            Consulta y administra todas las ventas realizadas
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">{totalCount} ventas</p>
            <p className="text-lg font-bold">{formatCurrency(totalSales)}</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por folio o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[150px]">
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
              <SelectTrigger className="w-[150px]">
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
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Folio</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Método de Pago</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Receipt className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">No se encontraron ventas</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-mono font-medium">{sale.folio}</TableCell>
                      <TableCell className="text-sm">{formatDate(sale.createdAt)}</TableCell>
                      <TableCell>{getCustomerName(sale.customerId)}</TableCell>
                      <TableCell>{getBranchName(sale.branchId)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getPaymentMethodLabel(sale.paymentMethod)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(sale.total)}
                      </TableCell>
                      <TableCell>{getStatusBadge(sale.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewSale(sale)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Sale Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Venta #{selectedSale?.folio}</span>
              {selectedSale && getStatusBadge(selectedSale.status)}
            </DialogTitle>
            <DialogDescription>
              {selectedSale && formatDate(selectedSale.createdAt)}
            </DialogDescription>
          </DialogHeader>

          {selectedSale && (
            <div className="space-y-4">
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
                  <p className="text-muted-foreground">Método de Pago</p>
                  <p className="font-medium">{getPaymentMethodLabel(selectedSale.paymentMethod)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Cajero</p>
                  <p className="font-medium">{selectedSale.userId ? "Usuario" : "-"}</p>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="mb-2 font-medium">Productos</h4>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead className="text-right">Precio</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {saleItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{getProductName(item.productId)}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(selectedSale.subtotal)}</span>
                </div>
                {selectedSale.discount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Descuento</span>
                    <span>-{formatCurrency(selectedSale.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IVA</span>
                  <span>{formatCurrency(selectedSale.tax)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(selectedSale.total)}</span>
                </div>
              </div>

              {selectedSale.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Notas</p>
                    <p className="text-sm">{selectedSale.notes}</p>
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            {selectedSale?.status === "completed" && (
              <>
                <Button variant="outline" onClick={() => setIsCancelDialogOpen(true)}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancelar Venta
                </Button>
                <Button variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  Facturar
                </Button>
              </>
            )}
            <Button variant="outline">
              <Printer className="mr-2 h-4 w-4" />
              Reimprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Venta</DialogTitle>
            <DialogDescription>
              Esta acción cancelará la venta #{selectedSale?.folio} y restaurará el inventario.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Motivo de cancelación *</Label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ingresa el motivo de la cancelación..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)}>
              Volver
            </Button>
            <Button variant="destructive" onClick={handleCancelSale} disabled={!cancelReason}>
              Confirmar Cancelación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
