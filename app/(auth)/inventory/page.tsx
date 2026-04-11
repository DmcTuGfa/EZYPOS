"use client"
import { useState, useEffect } from "react"
import { ArrowUpCircle, ArrowDownCircle, RefreshCw, ArrowLeftRight, Search, ScanLine } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useProductsStore } from "@/lib/stores/products-store"
import { useBranchStore } from "@/lib/stores/branch-store"
import { useAuthStore } from "@/lib/stores/auth-store"

import { formatDate } from "@/lib/utils/format"
import { apiFetch } from "@/lib/api/client"
import { BarcodeScanButton } from "@/components/barcode/barcode-scanner-modal"
import type { InventoryMovement, ProductStock } from "@/lib/types"

type MovementType = "entry" | "exit" | "adjustment" | "transfer"

export default function InventoryPage() {
  const { products, loadProducts } = useProductsStore()
  const { currentBranch, branches, loadBranches } = useBranchStore()
  const { user } = useAuthStore()
  

  const [searchTerm, setSearchTerm] = useState("")
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [productStocks, setProductStocks] = useState<ProductStock[]>([])
  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false)
  const [movementType, setMovementType] = useState<MovementType>("entry")
  const [movementForm, setMovementForm] = useState({ productId: "", quantity: "", reason: "", targetBranchId: "" })
  
  

  useEffect(() => { loadProducts(); loadBranches() }, [loadProducts, loadBranches])
  useEffect(() => { void refreshData() }, [currentBranch?.id])

  async function refreshData() {
    const branchFilter = currentBranch?.id ? `?branchId=${currentBranch.id}` : ''
    const [movementsRes, stocksRes] = await Promise.all([
      apiFetch<{ movements: InventoryMovement[] }>(`/api/inventory-movements${branchFilter}`),
      apiFetch<{ productStock: ProductStock[] }>(`/api/product-stock${branchFilter}`)
    ])
    setMovements(movementsRes.movements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
    setProductStocks(stocksRes.productStock)
  }

  const getProductStock = (productId: string) => productStocks.find(s => s.productId === productId)?.quantity || 0
  const getProductById = (productId: string) => products.find(p => p.id === productId)
  const getBranchById = (branchId: string) => branches.find(b => b.id === branchId)
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  )

  function handleOpenMovementDialog(type: MovementType) {
    setMovementType(type)
    setMovementForm({ productId: "", quantity: "", reason: "", targetBranchId: "" })
    setIsMovementDialogOpen(true)
  }

  async function handleSaveMovement() {
    if (!currentBranch || !user || !movementForm.productId || !movementForm.quantity) return
    const quantity = parseInt(movementForm.quantity)
    if (isNaN(quantity) || quantity <= 0) return
    await apiFetch('/api/inventory-movements', {
      method: 'POST',
      body: JSON.stringify({
        productId: movementForm.productId,
        branchId: currentBranch.id,
        fromBranchId: movementType === 'transfer' ? currentBranch.id : null,
        toBranchId: movementType === 'transfer' ? movementForm.targetBranchId : null,
        type: movementType,
        quantity,
        reason: movementForm.reason || '',
        userId: user.id
      })
    })
    setIsMovementDialogOpen(false)
    await refreshData()
    await loadProducts()
  }

  const getMovementTypeLabel = (type: string) =>
    ({ entry: 'Entrada', exit: 'Salida', adjustment: 'Ajuste', transfer: 'Traspaso', sale: 'Venta' } as Record<string, string>)[type] || type

  const getMovementTypeColor = (type: string) =>
    ({ entry: 'default', exit: 'destructive', adjustment: 'secondary', transfer: 'outline', sale: 'destructive' } as Record<string, "default" | "secondary" | "destructive" | "outline">)[type] || 'secondary'

  return (
    <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">Inventario</h1>
          <p className="text-sm text-muted-foreground">Control de stock y movimientos</p>
        </div>
        {/* Action buttons — scroll on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap">
          <Button variant="outline" size="sm" className="shrink-0" onClick={() => handleOpenMovementDialog("entry")}>
            <ArrowUpCircle className="mr-1.5 h-4 w-4 text-green-500" />Entrada
          </Button>
          <Button variant="outline" size="sm" className="shrink-0" onClick={() => handleOpenMovementDialog("exit")}>
            <ArrowDownCircle className="mr-1.5 h-4 w-4 text-red-500" />Salida
          </Button>
          <Button variant="outline" size="sm" className="shrink-0" onClick={() => handleOpenMovementDialog("adjustment")}>
            <RefreshCw className="mr-1.5 h-4 w-4" />Ajuste
          </Button>
          <Button variant="outline" size="sm" className="shrink-0" onClick={() => handleOpenMovementDialog("transfer")}>
            <ArrowLeftRight className="mr-1.5 h-4 w-4" />Traspaso
          </Button>
        </div>
      </div>

      <Tabs defaultValue="stock" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stock">Stock Actual</TabsTrigger>
          <TabsTrigger value="movements">Movimientos</TabsTrigger>
        </TabsList>

        <TabsContent value="stock">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar producto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <BarcodeScanButton
                  onScan={(code) => setSearchTerm(code)}
                  title="Buscar por código"
                  className="shrink-0"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="hidden sm:table-cell">SKU</TableHead>
                      <TableHead>Exist.</TableHead>
                      <TableHead className="hidden sm:table-cell">Mínimo</TableHead>
                      <TableHead>Estatus</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => {
                      const stock = getProductStock(product.id)
                      return (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium max-w-[140px] truncate">{product.name}</TableCell>
                          <TableCell className="hidden sm:table-cell font-mono text-xs">{product.sku}</TableCell>
                          <TableCell>{stock}</TableCell>
                          <TableCell className="hidden sm:table-cell">{product.minStock}</TableCell>
                          <TableCell>
                            <Badge variant={stock <= 0 ? 'destructive' : stock <= product.minStock ? 'secondary' : 'default'} className="text-xs">
                              {stock <= 0 ? 'Agotado' : stock <= product.minStock ? 'Bajo' : 'OK'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements">
          <Card>
            <CardContent className="p-0 pt-4 sm:p-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Cant.</TableHead>
                      <TableHead className="hidden md:table-cell">Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((movement) => (
                      <TableRow key={movement.id}>
                        <TableCell className="text-xs">{formatDate(movement.createdAt)}</TableCell>
                        <TableCell className="max-w-[120px] truncate text-sm">{getProductById(movement.productId)?.name || movement.productId}</TableCell>
                        <TableCell>
                          <Badge variant={getMovementTypeColor(movement.type)} className="text-xs">
                            {getMovementTypeLabel(movement.type)}
                          </Badge>
                        </TableCell>
                        <TableCell>{movement.quantity}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{movement.reason || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Movement Dialog */}
      <Dialog open={isMovementDialogOpen} onOpenChange={setIsMovementDialogOpen}>
        <DialogContent className="max-w-sm sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar movimiento</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Producto</Label>
              <div className="flex gap-2">
                <Select value={movementForm.productId} onValueChange={(value) => setMovementForm({ ...movementForm, productId: value })}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecciona producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <BarcodeScanButton
                  onScan={(code) => {
                    const found = products.find(p => p.barcode === code || p.sku === code)
                    if (found) setMovementForm(f => ({ ...f, productId: found.id }))
                  }}
                  title="Seleccionar producto"
                  className="shrink-0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cantidad</Label>
              <Input type="number" inputMode="numeric" value={movementForm.quantity} onChange={(e) => setMovementForm({ ...movementForm, quantity: e.target.value })} />
            </div>
            {movementType === 'transfer' && (
              <div className="space-y-2">
                <Label>Sucursal destino</Label>
                <Select value={movementForm.targetBranchId} onValueChange={(value) => setMovementForm({ ...movementForm, targetBranchId: value })}>
                  <SelectTrigger><SelectValue placeholder="Selecciona sucursal" /></SelectTrigger>
                  <SelectContent>
                    {branches.filter((branch) => branch.id !== currentBranch?.id).map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Textarea value={movementForm.reason} onChange={(e) => setMovementForm({ ...movementForm, reason: e.target.value })} />
            </div>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsMovementDialogOpen(false)} className="w-full sm:w-auto">Cancelar</Button>
            <Button onClick={handleSaveMovement} className="w-full sm:w-auto">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
