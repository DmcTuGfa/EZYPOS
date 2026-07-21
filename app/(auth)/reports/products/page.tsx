'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Download,
  PackageSearch,
  RefreshCw,
  Search,
  TrendingUp,
  Warehouse,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useBranchStore } from '@/lib/stores/branch-store'
import { apiFetch } from '@/lib/api/client'
import { formatCurrency, formatNumber } from '@/lib/utils/format'
import { toast } from 'sonner'

interface FlowRow {
  productId: string
  sku: string
  name: string
  purchasePrice: number
  salePrice: number
  minStock: number
  entriesQty: number
  entriesCost: number
  transfersInQty: number
  soldQty: number
  soldRevenue: number
  soldCost: number
  exitsQty: number
  exitsCost: number
  adjustments: number
  stock: number
  margin: number
  marginPercent: number
  stockValue: number
}

interface FlowTotals {
  entriesQty: number
  entriesCost: number
  soldQty: number
  soldRevenue: number
  soldCost: number
  exitsQty: number
  exitsCost: number
  margin: number
  stockValue: number
}

const EMPTY_TOTALS: FlowTotals = {
  entriesQty: 0,
  entriesCost: 0,
  soldQty: 0,
  soldRevenue: 0,
  soldCost: 0,
  exitsQty: 0,
  exitsCost: 0,
  margin: 0,
  stockValue: 0,
}

function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

export default function ProductFlowReportPage() {
  const { currentBranch, branches, loadBranches } = useBranchStore()

  const [from, setFrom] = useState(() => toInputDate(new Date(Date.now() - 29 * 86400000)))
  const [to, setTo] = useState(() => toInputDate(new Date()))
  const [branchFilter, setBranchFilter] = useState<string>('current')
  const [rows, setRows] = useState<FlowRow[]>([])
  const [totals, setTotals] = useState<FlowTotals>(EMPTY_TOTALS)
  const [isLoading, setIsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [onlyWithMovement, setOnlyWithMovement] = useState(true)

  useEffect(() => {
    loadBranches()
  }, [loadBranches])

  const resolvedBranchId = useMemo(() => {
    if (branchFilter === 'all') return ''
    if (branchFilter === 'current') return currentBranch?.id || ''
    return branchFilter
  }, [branchFilter, currentBranch?.id])

  const loadReport = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('from', new Date(`${from}T00:00:00`).toISOString())
      params.set('to', new Date(`${to}T23:59:59`).toISOString())
      if (resolvedBranchId) params.set('branchId', resolvedBranchId)

      const data = await apiFetch<{ rows: FlowRow[]; totals: FlowTotals }>(
        `/api/reports/product-flow?${params.toString()}`
      )
      setRows(data.rows || [])
      setTotals(data.totals || EMPTY_TOTALS)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cargar el reporte')
      setRows([])
      setTotals(EMPTY_TOTALS)
    } finally {
      setIsLoading(false)
    }
  }, [from, to, resolvedBranchId])

  useEffect(() => {
    void loadReport()
  }, [loadReport])

  const visibleRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    return rows
      .filter((row) => {
        if (onlyWithMovement && row.entriesQty === 0 && row.soldQty === 0 && row.exitsQty === 0) return false
        if (!term) return true
        return row.name.toLowerCase().includes(term) || row.sku.toLowerCase().includes(term)
      })
      .sort((a, b) => b.soldRevenue - a.soldRevenue)
  }, [rows, search, onlyWithMovement])

  const handleExportCsv = () => {
    const headers = [
      'SKU', 'Producto', 'Entradas (pzas)', 'Costo entradas', 'Vendido (pzas)',
      'Ingreso por venta', 'Costo de lo vendido', 'Utilidad', 'Margen %',
      'Salidas/mermas (pzas)', 'Costo salidas', 'Stock actual', 'Valor inventario',
    ]
    const lines = visibleRows.map((row) => [
      row.sku,
      `"${row.name.replace(/"/g, '""')}"`,
      row.entriesQty,
      row.entriesCost.toFixed(2),
      row.soldQty,
      row.soldRevenue.toFixed(2),
      row.soldCost.toFixed(2),
      row.margin.toFixed(2),
      row.marginPercent.toFixed(2),
      row.exitsQty,
      row.exitsCost.toFixed(2),
      row.stock,
      row.stockValue.toFixed(2),
    ].join(','))

    const csv = [headers.join(','), ...lines].join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ingresos-egresos-${from}-a-${to}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Reporte exportado')
  }

  const branchLabel =
    branchFilter === 'all'
      ? 'Todas las sucursales'
      : branchFilter === 'current'
      ? currentBranch?.name || 'Sin sucursal'
      : branches.find((b) => b.id === branchFilter)?.name || 'Sucursal'

  return (
    <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">Ingresos y Egresos de Productos</h1>
          <p className="text-sm text-muted-foreground">
            Control de entradas, salidas, utilidad e inventario · {branchLabel}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadReport()} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button size="sm" onClick={handleExportCsv} disabled={visibleRows.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="from">Desde</Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="to">Hasta</Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Sucursal</Label>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Sucursal actual</SelectItem>
                <SelectItem value="all">Todas las sucursales</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="search">Buscar producto</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nombre o SKU"
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-3 pb-2 md:p-6 md:pb-2">
            <CardTitle className="text-xs font-medium md:text-sm">Ingresos (entradas)</CardTitle>
            <ArrowDownCircle className="h-4 w-4 shrink-0 text-green-600" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-lg font-bold md:text-2xl">{formatCurrency(totals.entriesCost)}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(totals.entriesQty)} piezas recibidas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-3 pb-2 md:p-6 md:pb-2">
            <CardTitle className="text-xs font-medium md:text-sm">Egresos (vendido)</CardTitle>
            <ArrowUpCircle className="h-4 w-4 shrink-0 text-blue-600" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-lg font-bold md:text-2xl">{formatCurrency(totals.soldRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(totals.soldQty)} piezas vendidas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-3 pb-2 md:p-6 md:pb-2">
            <CardTitle className="text-xs font-medium md:text-sm">Utilidad bruta</CardTitle>
            <TrendingUp className="h-4 w-4 shrink-0 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-lg font-bold text-green-600 md:text-2xl">{formatCurrency(totals.margin)}</div>
            <p className="text-xs text-muted-foreground">
              Costo: {formatCurrency(totals.soldCost)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-3 pb-2 md:p-6 md:pb-2">
            <CardTitle className="text-xs font-medium md:text-sm">Valor inventario</CardTitle>
            <Warehouse className="h-4 w-4 shrink-0 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-lg font-bold md:text-2xl">{formatCurrency(totals.stockValue)}</div>
            <p className="text-xs text-muted-foreground">
              Mermas: {formatCurrency(totals.exitsCost)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detalle por producto */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base">
            <PackageSearch className="h-5 w-5" />
            Detalle por producto
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => setOnlyWithMovement((value) => !value)}
          >
            {onlyWithMovement ? 'Ver todos' : 'Solo con movimiento'}
          </Button>
        </CardHeader>
        <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
          {isLoading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Cargando reporte...</p>
          ) : visibleRows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No hay movimientos en el periodo seleccionado.
            </p>
          ) : (
            <>
              {/* Móvil: tarjetas */}
              <div className="space-y-3 lg:hidden">
                {visibleRows.map((row) => (
                  <div key={row.productId} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{row.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">{row.sku}</p>
                      </div>
                      <Badge variant={row.stock <= row.minStock ? 'destructive' : 'secondary'} className="shrink-0">
                        Stock {formatNumber(row.stock)}
                      </Badge>
                    </div>

                    <Separator className="my-3" />

                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Entradas</p>
                        <p className="font-medium text-green-600">+{formatNumber(row.entriesQty)}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(row.entriesCost)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Vendido</p>
                        <p className="font-medium text-blue-600">-{formatNumber(row.soldQty)}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(row.soldRevenue)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Salidas / mermas</p>
                        <p className="font-medium">{formatNumber(row.exitsQty)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Utilidad</p>
                        <p className="font-medium text-green-600">{formatCurrency(row.margin)}</p>
                        <p className="text-xs text-muted-foreground">{row.marginPercent.toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Escritorio: tabla */}
              <div className="hidden rounded-md border lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Entradas</TableHead>
                      <TableHead className="text-right">Costo entradas</TableHead>
                      <TableHead className="text-right">Vendido</TableHead>
                      <TableHead className="text-right">Ingreso</TableHead>
                      <TableHead className="text-right">Utilidad</TableHead>
                      <TableHead className="text-right">Margen</TableHead>
                      <TableHead className="text-right">Mermas</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleRows.map((row) => (
                      <TableRow key={row.productId}>
                        <TableCell>
                          <p className="font-medium">{row.name}</p>
                          <p className="font-mono text-xs text-muted-foreground">{row.sku}</p>
                        </TableCell>
                        <TableCell className="text-right text-green-600">+{formatNumber(row.entriesQty)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.entriesCost)}</TableCell>
                        <TableCell className="text-right text-blue-600">-{formatNumber(row.soldQty)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.soldRevenue)}</TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {formatCurrency(row.margin)}
                        </TableCell>
                        <TableCell className="text-right text-sm">{row.marginPercent.toFixed(1)}%</TableCell>
                        <TableCell className="text-right">{formatNumber(row.exitsQty)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={row.stock <= row.minStock ? 'destructive' : 'secondary'}>
                            {formatNumber(row.stock)}
                          </Badge>
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
    </div>
  )
}
