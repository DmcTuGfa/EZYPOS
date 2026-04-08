"use client"

import { useState, useEffect } from "react"
import { Package, ArrowUpCircle, ArrowDownCircle, RefreshCw, ArrowLeftRight, Search, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useProductsStore } from "@/lib/stores/products-store"
import { useBranchStore } from "@/lib/stores/branch-store"
import { useAuthStore } from "@/lib/stores/auth-store"
import { formatCurrency, formatDate } from "@/lib/utils/format"
import { db } from "@/lib/db/local-storage"
import type { InventoryMovement, ProductStock } from "@/lib/types"

type MovementType = "entrada" | "salida" | "ajuste" | "traspaso"

export default function InventoryPage() {
  const { products, loadProducts } = useProductsStore()
  const { currentBranch, branches, loadBranches } = useBranchStore()
  const { user } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState("")
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [productStocks, setProductStocks] = useState<ProductStock[]>([])
  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false)
  const [movementType, setMovementType] = useState<MovementType>("entrada")
  
  const [movementForm, setMovementForm] = useState({
    productId: "",
    quantity: "",
    reason: "",
    targetBranchId: "",
  })

  useEffect(() => {
    loadProducts()
    loadBranches()
    loadMovements()
    loadProductStocks()
  }, [loadProducts, loadBranches])

  function loadMovements() {
    const allMovements = db.inventoryMovements.getAll()
    const branchMovements = currentBranch 
      ? allMovements.filter(m => m.branchId === currentBranch.id || m.targetBranchId === currentBranch.id)
      : allMovements
    setMovements(branchMovements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
  }

  function loadProductStocks() {
    const allStocks = db.productStock.getAll()
    const branchStocks = currentBranch 
      ? allStocks.filter(s => s.branchId === currentBranch.id)
      : allStocks
    setProductStocks(branchStocks)
  }

  function getProductStock(productId: string): number {
    const stock = productStocks.find(s => s.productId === productId)
    return stock?.quantity || 0
  }

  function getProductById(productId: string) {
    return products.find(p => p.id === productId)
  }

  function getBranchById(branchId: string) {
    return branches.find(b => b.id === branchId)
  }

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  )

  function handleOpenMovementDialog(type: MovementType) {
    setMovementType(type)
    setMovementForm({
      productId: "",
      quantity: "",
      reason: "",
      targetBranchId: "",
    })
    setIsMovementDialogOpen(true)
  }

  function handleSaveMovement() {
    if (!currentBranch || !user || !movementForm.productId || !movementForm.quantity) return

    const quantity = parseInt(movementForm.quantity)
    if (isNaN(quantity) || quantity <= 0) return

    const movement: InventoryMovement = {
      id: crypto.randomUUID(),
      productId: movementForm.productId,
      branchId: currentBranch.id,
      type: movementType,
      quantity: movementType === "salida" ? -quantity : quantity,
      reason: movementForm.reason || undefined,
      targetBranchId: movementType === "traspaso" ? movementForm.targetBranchId : undefined,
      userId: user.id,
      createdAt: new Date().toISOString(),
    }

    db.inventoryMovements.create(movement)

    // Update stock
    const existingStock = db.productStock.getByProductAndBranch(movementForm.productId, currentBranch.id)
    
    if (existingStock) {
      let newQuantity = existingStock.quantity
      
      if (movementType === "entrada") {
        newQuantity += quantity
      } else if (movementType === "salida") {
        newQuantity -= quantity
      } else if (movementType === "ajuste") {
        newQuantity = quantity // For adjustments, set exact quantity
      } else if (movementType === "traspaso") {
        newQuantity -= quantity
        
        // Add stock to target branch
        if (movementForm.targetBranchId) {
          const targetStock = db.productStock.getByProductAndBranch(movementForm.productId, movementForm.targetBranchId)
          if (targetStock) {
            db.productStock.update(targetStock.id, {
              quantity: targetStock.quantity + quantity,
              updatedAt: new Date().toISOString(),
            })
          } else {
            db.productStock.create({
              id: crypto.randomUUID(),
              productId: movementForm.productId,
              branchId: movementForm.targetBranchId,
              quantity: quantity,
              updatedAt: new Date().toISOString(),
            })
          }
        }
      }

      db.productStock.update(existingStock.id, {
        quantity: Math.max(0, newQuantity),
        updatedAt: new Date().toISOString(),
      })
    } else {
      db.productStock.create({
        id: crypto.randomUUID(),
        productId: movementForm.productId,
        branchId: currentBranch.id,
        quantity: movementType === "entrada" || movementType === "ajuste" ? quantity : 0,
        updatedAt: new Date().toISOString(),
      })
    }

    setIsMovementDialogOpen(false)
    loadMovements()
    loadProductStocks()
  }

  function getMovementTypeLabel(type: string) {
    const labels: Record<string, string> = {
      entrada: "Entrada",
      salida: "Salida",
      ajuste: "Ajuste",
      traspaso: "Traspaso",
      venta: "Venta",
    }
    return labels[type] || type
  }

  function getMovementTypeColor(type: string) {
    const colors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      entrada: "default",
      salida: "destructive",
      ajuste: "secondary",
      traspaso: "outline",
      venta: "destructive",
    }
    return colors[type] || "secondary"
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventario</h1>
          <p className="text-muted-foreground">
            Control de stock y movimientos de inventario
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleOpenMovementDialog("entrada")}>
            <ArrowUpCircle className="mr-2 h-4 w-4 text-green-500" />
            Entrada
          </Button>
          <Button variant="outline" onClick={() => handleOpenMovementDialog("salida")}>
            <ArrowDownCircle className="mr-2 h-4 w-4 text-red-500" />
            Salida
          </Button>
          <Button variant="outline" onClick={() => handleOpenMovementDialog("ajuste")}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Ajuste
          </Button>
          <Button variant="outline" onClick={() => handleOpenMovementDialog("traspaso")}>
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            Traspaso
          </Button>
        </div>
      </div>

      <Tabs defaultValue="stock" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stock">Stock Actual</TabsTrigger>
          <TabsTrigger value="movements">Movimientos</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar producto..."
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
                      <TableHead>Producto</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Mínimo</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Package className="h-8 w-8 text-muted-foreground" />
                            <p className="text-muted-foreground">No hay productos</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts.map((product) => {
                        const stock = getProductStock(product.id)
                        const isLowStock = stock <= product.minStock
                        const isOutOfStock = stock === 0
                        return (
                          <TableRow key={product.id}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                            <TableCell className="text-right">
                              <span className={isLowStock ? "text-amber-600 font-medium" : ""}>
                                {stock} {product.unit}
                              </span>
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {product.minStock} {product.unit}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(stock * product.costPrice)}
                            </TableCell>
                            <TableCell>
                              {isOutOfStock ? (
                                <Badge variant="destructive">Agotado</Badge>
                              ) : isLowStock ? (
                                <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                                  Stock bajo
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-green-600 border-green-200">
                                  Normal
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Movimientos</CardTitle>
              <CardDescription>
                Registro de todas las entradas, salidas y ajustes de inventario
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Usuario</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          <p className="text-muted-foreground">No hay movimientos registrados</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      movements.slice(0, 50).map((movement) => {
                        const product = getProductById(movement.productId)
                        const targetBranch = movement.targetBranchId ? getBranchById(movement.targetBranchId) : null
                        return (
                          <TableRow key={movement.id}>
                            <TableCell className="text-sm">
                              {formatDate(movement.createdAt)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getMovementTypeColor(movement.type)}>
                                {getMovementTypeLabel(movement.type)}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              {product?.name || "Producto eliminado"}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              <span className={movement.quantity > 0 ? "text-green-600" : "text-red-600"}>
                                {movement.quantity > 0 ? "+" : ""}{movement.quantity}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                              {movement.reason || (targetBranch ? `A: ${targetBranch.name}` : "-")}
                            </TableCell>
                            <TableCell className="text-sm">
                              {movement.userId ? "Usuario" : "-"}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Movement Dialog */}
      <Dialog open={isMovementDialogOpen} onOpenChange={setIsMovementDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {movementType === "entrada" && "Entrada de Inventario"}
              {movementType === "salida" && "Salida de Inventario"}
              {movementType === "ajuste" && "Ajuste de Inventario"}
              {movementType === "traspaso" && "Traspaso entre Sucursales"}
            </DialogTitle>
            <DialogDescription>
              {movementType === "entrada" && "Registra la entrada de productos al inventario"}
              {movementType === "salida" && "Registra la salida de productos del inventario"}
              {movementType === "ajuste" && "Ajusta la cantidad exacta del producto en inventario"}
              {movementType === "traspaso" && "Transfiere productos a otra sucursal"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Producto *</Label>
              <Select 
                value={movementForm.productId} 
                onValueChange={(value) => setMovementForm({ ...movementForm, productId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar producto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.sku}) - Stock: {getProductStock(product.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                {movementType === "ajuste" ? "Nueva Cantidad *" : "Cantidad *"}
              </Label>
              <Input
                type="number"
                min="1"
                value={movementForm.quantity}
                onChange={(e) => setMovementForm({ ...movementForm, quantity: e.target.value })}
                placeholder={movementType === "ajuste" ? "Cantidad exacta en inventario" : "Cantidad a mover"}
              />
            </div>

            {movementType === "traspaso" && (
              <div className="space-y-2">
                <Label>Sucursal Destino *</Label>
                <Select 
                  value={movementForm.targetBranchId} 
                  onValueChange={(value) => setMovementForm({ ...movementForm, targetBranchId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar sucursal" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches
                      .filter(b => b.id !== currentBranch?.id)
                      .map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Motivo / Observaciones</Label>
              <Textarea
                value={movementForm.reason}
                onChange={(e) => setMovementForm({ ...movementForm, reason: e.target.value })}
                placeholder="Razón del movimiento..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMovementDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveMovement}
              disabled={
                !movementForm.productId || 
                !movementForm.quantity ||
                (movementType === "traspaso" && !movementForm.targetBranchId)
              }
            >
              Registrar Movimiento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
