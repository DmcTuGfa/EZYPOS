"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Plus, Search, Users, Edit, Trash2, Wallet, History, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useCustomersStore } from "@/lib/stores/customers-store"
import { useAuthStore } from "@/lib/stores/auth-store"
import { useBranchStore } from "@/lib/stores/branch-store"
import { useCashStore } from "@/lib/stores/cash-store"
import { apiFetch } from "@/lib/api/client"
import { formatCurrency, formatDateTime } from "@/lib/utils/format"
import { TicketLinkButtons } from "@/components/ticket/ticket-link-buttons"
import { toast } from "sonner"
import type { Customer, CustomerPayment } from "@/lib/types"

const REGIMEN_FISCAL_OPTIONS = [
  { value: "601", label: "601 - General de Ley Personas Morales" },
  { value: "603", label: "603 - Personas Morales con Fines no Lucrativos" },
  { value: "605", label: "605 - Sueldos y Salarios" },
  { value: "606", label: "606 - Arrendamiento" },
  { value: "608", label: "608 - Demás Ingresos" },
  { value: "612", label: "612 - Personas Físicas con Actividades Empresariales" },
  { value: "616", label: "616 - Sin Obligaciones Fiscales" },
  { value: "621", label: "621 - Incorporación Fiscal" },
  { value: "625", label: "625 - Régimen de Actividades Agrícolas" },
  { value: "626", label: "626 - Régimen Simplificado de Confianza" },
]

const USO_CFDI_OPTIONS = [
  { value: "G01", label: "G01 - Adquisición de mercancías" },
  { value: "G02", label: "G02 - Devoluciones, descuentos o bonificaciones" },
  { value: "G03", label: "G03 - Gastos en general" },
  { value: "I01", label: "I01 - Construcciones" },
  { value: "I02", label: "I02 - Mobiliario y equipo de oficina" },
  { value: "I03", label: "I03 - Equipo de transporte" },
  { value: "I04", label: "I04 - Equipo de cómputo" },
  { value: "I08", label: "I08 - Otra maquinaria y equipo" },
  { value: "D01", label: "D01 - Honorarios médicos" },
  { value: "D02", label: "D02 - Gastos médicos por incapacidad" },
  { value: "D03", label: "D03 - Gastos funerales" },
  { value: "D04", label: "D04 - Donativos" },
  { value: "D05", label: "D05 - Intereses por créditos hipotecarios" },
  { value: "P01", label: "P01 - Por definir" },
  { value: "S01", label: "S01 - Sin efectos fiscales" },
  { value: "CP01", label: "CP01 - Pagos" },
]

const PAYMENT_METHODS = [
  { value: "cash", label: "Efectivo" },
  { value: "card", label: "Tarjeta" },
  { value: "transfer", label: "Transferencia" },
  { value: "voucher", label: "Vale" },
]

const emptyForm = {
  name: "",
  rfc: "",
  phone: "",
  email: "",
  fiscalAddress: "",
  neighborhood: "",
  city: "",
  state: "",
  postalCode: "",
  taxRegime: "",
  cfdiUse: "G03",
}

const emptyPaymentForm = {
  amount: "",
  totalAmount: "",
  concept: "",
  method: "cash",
  reference: "",
  notes: "",
}

export default function CustomersPage() {
  const { customers, loadCustomers, saveCustomer, deleteCustomer } = useCustomersStore()
  const { user } = useAuthStore()
  const { currentBranch } = useBranchStore()
  const { currentSession } = useCashStore()

  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null)
  const [formData, setFormData] = useState(emptyForm)

  // --- Abonos ---
  const [payments, setPayments] = useState<CustomerPayment[]>([])
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm)
  const [isSavingPayment, setIsSavingPayment] = useState(false)
  const [lastPayment, setLastPayment] = useState<CustomerPayment | null>(null)

  const loadPayments = useCallback(async () => {
    try {
      const data = await apiFetch<{ payments: CustomerPayment[] }>("/api/customer-payments")
      setPayments(data.payments || [])
    } catch {
      setPayments([])
    }
  }, [])

  useEffect(() => {
    loadCustomers()
    void loadPayments()
  }, [loadCustomers, loadPayments])

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.rfc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.includes(searchTerm)
  )

  const paymentsByCustomer = useMemo(() => {
    const map = new Map<string, { total: number; count: number; items: CustomerPayment[] }>()
    for (const payment of payments) {
      if (payment.status === "cancelled") continue
      const current = map.get(payment.customerId) || { total: 0, count: 0, items: [] }
      current.total += Number(payment.amount || 0)
      current.count += 1
      current.items.push(payment)
      map.set(payment.customerId, current)
    }
    return map
  }, [payments])

  function handleOpenDialog(customer?: Customer) {
    if (customer) {
      setEditingCustomer(customer)
      setFormData({
        name: customer.name,
        rfc: customer.rfc || "",
        phone: customer.phone || "",
        email: customer.email || "",
        fiscalAddress: customer.fiscalAddress || "",
        neighborhood: customer.neighborhood || "",
        city: customer.city || "",
        state: customer.state || "",
        postalCode: customer.postalCode || "",
        taxRegime: customer.taxRegime || "",
        cfdiUse: customer.cfdiUse || "G03",
      })
    } else {
      setEditingCustomer(null)
      setFormData(emptyForm)
    }
    setIsDialogOpen(true)
  }

  async function handleSaveCustomer() {
    try {
      await saveCustomer({
        ...(editingCustomer || {}),
        id: editingCustomer?.id || crypto.randomUUID(),
        ...formData,
        isActive: true,
      } as Customer)
      toast.success(editingCustomer ? "Cliente actualizado" : "Cliente creado")
      setIsDialogOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el cliente")
    }
  }

  async function handleDeleteCustomer() {
    if (!customerToDelete) return
    try {
      await deleteCustomer(customerToDelete.id)
      toast.success("Cliente eliminado")
    } catch {
      toast.error("No se pudo eliminar el cliente")
    }
    setIsDeleteDialogOpen(false)
    setCustomerToDelete(null)
  }

  function isValidForInvoice(customer: Customer): boolean {
    return !!(customer.rfc && customer.taxRegime && customer.postalCode && customer.name)
  }

  function openPaymentDialog(customer: Customer) {
    setSelectedCustomer(customer)
    setPaymentForm(emptyPaymentForm)
    setLastPayment(null)
    setPaymentDialogOpen(true)
  }

  function openHistoryDialog(customer: Customer) {
    setSelectedCustomer(customer)
    setHistoryDialogOpen(true)
  }

  async function handleSavePayment() {
    if (!selectedCustomer) return
    if (!user || !currentBranch) {
      toast.error("Selecciona una sucursal para registrar el abono")
      return
    }
    const amount = parseFloat(paymentForm.amount)
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error("Ingresa un monto válido")
      return
    }
    if (paymentForm.method === "cash" && !currentSession) {
      toast.error("Abre una caja para registrar abonos en efectivo")
      return
    }

    setIsSavingPayment(true)
    try {
      const res = await apiFetch<{ payment: CustomerPayment }>("/api/customer-payments", {
        method: "POST",
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          branchId: currentBranch.id,
          userId: user.id,
          cashSessionId: paymentForm.method === "cash" ? currentSession?.id || null : null,
          amount,
          totalAmount: paymentForm.totalAmount ? parseFloat(paymentForm.totalAmount) : null,
          concept: paymentForm.concept.trim() || "Abono a cuenta",
          method: paymentForm.method,
          reference: paymentForm.reference,
          notes: paymentForm.notes,
        }),
      })
      setLastPayment(res.payment)
      toast.success(`Abono ${res.payment.folio} registrado`)
      await loadPayments()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar el abono")
    } finally {
      setIsSavingPayment(false)
    }
  }

  const customerPayments = selectedCustomer
    ? paymentsByCustomer.get(selectedCustomer.id)?.items || []
    : []

  return (
    <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            Administra clientes, abonos y comprobantes digitales
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="w-full md:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Cliente
        </Button>
      </div>

      <Card>
        <CardHeader className="p-4 md:p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, RFC, email o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
          {filteredCustomers.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Users className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No se encontraron clientes</p>
            </div>
          ) : (
            <>
              {/* ── Vista móvil: tarjetas ── */}
              <div className="space-y-3 md:hidden">
                {filteredCustomers.map((customer) => {
                  const resume = paymentsByCustomer.get(customer.id)
                  return (
                    <div key={customer.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{customer.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {customer.rfc || "Sin RFC"} · {customer.phone || "Sin teléfono"}
                          </p>
                        </div>
                        <Badge variant={isValidForInvoice(customer) ? "default" : "secondary"} className="shrink-0">
                          {isValidForInvoice(customer) ? "Facturable" : "Incompleto"}
                        </Badge>
                      </div>
                      {resume && (
                        <p className="mt-2 text-xs">
                          <span className="text-muted-foreground">Abonado: </span>
                          <span className="font-semibold">{formatCurrency(resume.total)}</span>
                          <span className="text-muted-foreground"> ({resume.count})</span>
                        </p>
                      )}
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Button size="sm" onClick={() => openPaymentDialog(customer)}>
                          <Wallet className="mr-2 h-4 w-4" />
                          Abonar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openHistoryDialog(customer)}>
                          <History className="mr-2 h-4 w-4" />
                          Abonos
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleOpenDialog(customer)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive"
                          onClick={() => { setCustomerToDelete(customer); setIsDeleteDialogOpen(true) }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* ── Vista escritorio: tabla ── */}
              <div className="hidden rounded-md border md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>RFC</TableHead>
                      <TableHead>Contacto</TableHead>
                      <TableHead className="text-right">Abonado</TableHead>
                      <TableHead>Facturación</TableHead>
                      <TableHead className="w-[190px] text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => {
                      const resume = paymentsByCustomer.get(customer.id)
                      return (
                        <TableRow key={customer.id}>
                          <TableCell>
                            <p className="font-medium">{customer.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {[customer.city, customer.state].filter(Boolean).join(", ") || "—"}
                            </p>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{customer.rfc || "—"}</TableCell>
                          <TableCell className="text-sm">
                            <p>{customer.phone || "—"}</p>
                            <p className="text-xs text-muted-foreground">{customer.email || ""}</p>
                          </TableCell>
                          <TableCell className="text-right">
                            {resume ? (
                              <>
                                <p className="font-medium">{formatCurrency(resume.total)}</p>
                                <p className="text-xs text-muted-foreground">{resume.count} abonos</p>
                              </>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={isValidForInvoice(customer) ? "default" : "secondary"}>
                              {isValidForInvoice(customer) ? "Facturable" : "Incompleto"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" title="Registrar abono" onClick={() => openPaymentDialog(customer)}>
                                <Wallet className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" title="Historial de abonos" onClick={() => openHistoryDialog(customer)}>
                                <History className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" title="Editar" onClick={() => handleOpenDialog(customer)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Eliminar"
                                className="text-destructive"
                                onClick={() => { setCustomerToDelete(customer); setIsDeleteDialogOpen(true) }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Diálogo: alta / edición de cliente ── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-[95vw] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
            <DialogDescription>
              {editingCustomer ? "Modifica los datos del cliente" : "Ingresa los datos del nuevo cliente"}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="fiscal">Datos Fiscales</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre o Razón Social *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nombre completo o razón social"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono (WhatsApp)</Label>
                  <Input
                    id="phone"
                    inputMode="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="4421234567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fiscalAddress">Dirección</Label>
                <Input
                  id="fiscalAddress"
                  value={formData.fiscalAddress}
                  onChange={(e) => setFormData({ ...formData, fiscalAddress: e.target.value })}
                  placeholder="Calle, número exterior e interior"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="neighborhood">Colonia</Label>
                  <Input
                    id="neighborhood"
                    value={formData.neighborhood}
                    onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                    placeholder="Colonia"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Ciudad / Municipio</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Ciudad"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="Estado"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Código Postal</Label>
                  <Input
                    id="postalCode"
                    inputMode="numeric"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    placeholder="12345"
                    maxLength={5}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="fiscal" className="space-y-4 pt-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Completa estos datos para poder emitir facturas a este cliente.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rfc">RFC *</Label>
                <Input
                  id="rfc"
                  value={formData.rfc}
                  onChange={(e) => setFormData({ ...formData, rfc: e.target.value.toUpperCase() })}
                  placeholder="XAXX010101000"
                  className="uppercase"
                  maxLength={13}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxRegime">Régimen Fiscal *</Label>
                <Select
                  value={formData.taxRegime}
                  onValueChange={(value) => setFormData({ ...formData, taxRegime: value })}
                >
                  <SelectTrigger id="taxRegime" className="w-full">
                    <SelectValue placeholder="Seleccionar régimen fiscal" />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIMEN_FISCAL_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cfdiUse">Uso de CFDI</Label>
                <Select
                  value={formData.cfdiUse}
                  onValueChange={(value) => setFormData({ ...formData, cfdiUse: value })}
                >
                  <SelectTrigger id="cfdiUse" className="w-full">
                    <SelectValue placeholder="Seleccionar uso de CFDI" />
                  </SelectTrigger>
                  <SelectContent>
                    {USO_CFDI_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fiscalZipCode">Código Postal Fiscal *</Label>
                <Input
                  id="fiscalZipCode"
                  inputMode="numeric"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  placeholder="12345"
                  maxLength={5}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button className="w-full sm:w-auto" onClick={handleSaveCustomer} disabled={!formData.name}>
              {editingCustomer ? "Guardar Cambios" : "Crear Cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Diálogo: registrar abono ── */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-[95vw] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar abono</DialogTitle>
            <DialogDescription>{selectedCustomer?.name}</DialogDescription>
          </DialogHeader>

          {lastPayment ? (
            <div className="space-y-4 py-2">
              <div className="flex flex-col items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-center dark:border-green-900 dark:bg-green-950/20">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
                <p className="font-semibold">Abono {lastPayment.folio} registrado</p>
                <p className="text-2xl font-bold">{formatCurrency(lastPayment.amount)}</p>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Comprobante digital</p>
                <TicketLinkButtons
                  path={`/ticket/abono/${lastPayment.id}`}
                  message={`Comprobante de abono ${lastPayment.folio} por ${formatCurrency(lastPayment.amount)}`}
                  phone={selectedCustomer?.phone}
                />
              </div>
              <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => setPaymentDialogOpen(false)}>
                  Cerrar
                </Button>
                <Button className="w-full sm:w-auto" onClick={() => { setPaymentForm(emptyPaymentForm); setLastPayment(null) }}>
                  Registrar otro abono
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Monto del abono *</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Concepto</Label>
                  <Input
                    value={paymentForm.concept}
                    onChange={(e) => setPaymentForm({ ...paymentForm, concept: e.target.value })}
                    placeholder="Ej. Apartado de refrigerador"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Total acordado (opcional)</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={paymentForm.totalAmount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, totalAmount: e.target.value })}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Si lo capturas, el comprobante mostrará el saldo pendiente.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Forma de pago</Label>
                  <Select
                    value={paymentForm.method}
                    onValueChange={(value) => setPaymentForm({ ...paymentForm, method: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {paymentForm.method === "cash" && (
                    <p className="text-xs text-muted-foreground">
                      {currentSession
                        ? "El abono en efectivo entrará al corte de la caja abierta."
                        : "⚠ Necesitas una caja abierta para abonos en efectivo."}
                    </p>
                  )}
                </div>

                {paymentForm.method !== "cash" && (
                  <div className="space-y-2">
                    <Label>Referencia</Label>
                    <Input
                      value={paymentForm.reference}
                      onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                      placeholder="Autorización / folio de transferencia"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Notas</Label>
                  <Textarea
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    placeholder="Observaciones del abono"
                    rows={2}
                  />
                </div>
              </div>

              <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => setPaymentDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button className="w-full sm:w-auto" onClick={handleSavePayment} disabled={isSavingPayment}>
                  {isSavingPayment ? "Guardando..." : "Registrar abono"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Diálogo: historial de abonos ── */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-[95vw] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Abonos de {selectedCustomer?.name}</DialogTitle>
            <DialogDescription>
              Total abonado: {formatCurrency(customerPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0))}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3 pr-2">
              {customerPayments.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Este cliente aún no tiene abonos registrados.
                </p>
              ) : (
                customerPayments.map((payment) => (
                  <div key={payment.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-xs text-muted-foreground">{payment.folio}</p>
                        <p className="truncate font-medium">{payment.concept || "Abono a cuenta"}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(payment.createdAt)}</p>
                      </div>
                      <p className="shrink-0 font-semibold">{formatCurrency(payment.amount)}</p>
                    </div>
                    <Separator className="my-3" />
                    <TicketLinkButtons
                      path={`/ticket/abono/${payment.id}`}
                      message={`Comprobante de abono ${payment.folio} por ${formatCurrency(payment.amount)}`}
                      phone={selectedCustomer?.phone}
                    />
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* ── Diálogo: eliminar ── */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar Cliente</DialogTitle>
            <DialogDescription>
              ¿Seguro que deseas eliminar al cliente &quot;{customerToDelete?.name}&quot;? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" className="w-full sm:w-auto" onClick={handleDeleteCustomer}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
