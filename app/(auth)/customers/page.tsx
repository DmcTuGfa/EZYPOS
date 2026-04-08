"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Users, Edit, Trash2, FileText } from "lucide-react"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCustomersStore } from "@/lib/stores/customers-store"
import type { Customer } from "@/lib/types"

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

export default function CustomersPage() {
  const { customers, loadCustomers, saveCustomer, deleteCustomer } = useCustomersStore()
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null)
  
  const [formData, setFormData] = useState({
    name: "",
    rfc: "",
    phone: "",
    email: "",
    address: "",
    colony: "",
    city: "",
    state: "",
    zipCode: "",
    regimenFiscal: "",
    usoCfdi: "G03",
  })

  useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.rfc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.includes(searchTerm)
  )

  function handleOpenDialog(customer?: Customer) {
    if (customer) {
      setEditingCustomer(customer)
      setFormData({
        name: customer.name,
        rfc: customer.rfc || "",
        phone: customer.phone || "",
        email: customer.email || "",
        address: customer.address || "",
        colony: customer.colony || "",
        city: customer.city || "",
        state: customer.state || "",
        zipCode: customer.zipCode || "",
        regimenFiscal: customer.regimenFiscal || "",
        usoCfdi: customer.usoCfdi || "G03",
      })
    } else {
      setEditingCustomer(null)
      setFormData({
        name: "",
        rfc: "",
        phone: "",
        email: "",
        address: "",
        colony: "",
        city: "",
        state: "",
        zipCode: "",
        regimenFiscal: "",
        usoCfdi: "G03",
      })
    }
    setIsDialogOpen(true)
  }

  function handleSaveCustomer() {
    const customerData: Customer = {
      id: editingCustomer?.id || crypto.randomUUID(),
      name: formData.name,
      rfc: formData.rfc || undefined,
      phone: formData.phone || undefined,
      email: formData.email || undefined,
      address: formData.address || undefined,
      colony: formData.colony || undefined,
      city: formData.city || undefined,
      state: formData.state || undefined,
      zipCode: formData.zipCode || undefined,
      regimenFiscal: formData.regimenFiscal || undefined,
      usoCfdi: formData.usoCfdi || undefined,
      createdAt: editingCustomer?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    saveCustomer(customerData)
    setIsDialogOpen(false)
  }

  function handleDeleteCustomer() {
    if (customerToDelete) {
      deleteCustomer(customerToDelete.id)
      setIsDeleteDialogOpen(false)
      setCustomerToDelete(null)
    }
  }

  function isValidForInvoice(customer: Customer): boolean {
    return !!(customer.rfc && customer.regimenFiscal && customer.zipCode && customer.name)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">
            Administra la información de tus clientes
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Cliente
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, RFC, email o teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>RFC</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead>Facturación</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">No se encontraron clientes</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div className="font-medium">{customer.name}</div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {customer.rfc || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {customer.email && <div>{customer.email}</div>}
                          {customer.phone && <div className="text-muted-foreground">{customer.phone}</div>}
                          {!customer.email && !customer.phone && "-"}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {customer.city && customer.state 
                          ? `${customer.city}, ${customer.state}` 
                          : customer.city || customer.state || "-"}
                      </TableCell>
                      <TableCell>
                        {isValidForInvoice(customer) ? (
                          <Badge variant="outline" className="text-green-600 border-green-200">
                            <FileText className="mr-1 h-3 w-3" />
                            Listo
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Incompleto</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(customer)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setCustomerToDelete(customer)
                              setIsDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* Customer Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? "Editar Cliente" : "Nuevo Cliente"}
            </DialogTitle>
            <DialogDescription>
              {editingCustomer ? "Modifica los datos del cliente" : "Ingresa los datos del nuevo cliente"}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general">Información General</TabsTrigger>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(55) 1234-5678"
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
                <Label htmlFor="address">Dirección</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Calle, número exterior e interior"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="colony">Colonia</Label>
                  <Input
                    id="colony"
                    value={formData.colony}
                    onChange={(e) => setFormData({ ...formData, colony: e.target.value })}
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

              <div className="grid grid-cols-2 gap-4">
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
                  <Label htmlFor="zipCode">Código Postal</Label>
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    placeholder="12345"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="fiscal" className="space-y-4 pt-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Complete estos datos para poder emitir facturas a este cliente.
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
                <Label htmlFor="regimenFiscal">Régimen Fiscal *</Label>
                <Select 
                  value={formData.regimenFiscal} 
                  onValueChange={(value) => setFormData({ ...formData, regimenFiscal: value })}
                >
                  <SelectTrigger>
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
                <Label htmlFor="usoCfdi">Uso de CFDI</Label>
                <Select 
                  value={formData.usoCfdi} 
                  onValueChange={(value) => setFormData({ ...formData, usoCfdi: value })}
                >
                  <SelectTrigger>
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
                  value={formData.zipCode}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  placeholder="12345"
                  maxLength={5}
                />
                <p className="text-xs text-muted-foreground">
                  Código postal del domicilio fiscal del cliente
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCustomer} disabled={!formData.name}>
              {editingCustomer ? "Guardar Cambios" : "Crear Cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Cliente</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar al cliente &quot;{customerToDelete?.name}&quot;? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteCustomer}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
