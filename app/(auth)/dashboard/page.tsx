"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CreditCard,
  Banknote,
  ArrowUpRight,
  CalendarDays,
  RefreshCw,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useBranchStore } from "@/lib/stores/branch-store"
import { useCashStore } from "@/lib/stores/cash-store"
import { apiFetch } from "@/lib/api/client"
import { formatCurrency, formatDateTime } from "@/lib/utils/format"
import { toast } from "sonner"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  voucher: "Vales",
  mixed: "Mixto",
}

type PeriodKey =
  | "today"
  | "yesterday"
  | "last7"
  | "thisMonth"
  | "lastMonth"
  | "thisYear"
  | "custom"

const PERIOD_OPTIONS: Array<{ value: PeriodKey; label: string }> = [
  { value: "today", label: "Hoy" },
  { value: "yesterday", label: "Ayer" },
  { value: "last7", label: "Últimos 7 días" },
  { value: "thisMonth", label: "Este mes" },
  { value: "lastMonth", label: "Mes pasado" },
  { value: "thisYear", label: "Este año" },
  { value: "custom", label: "Rango personalizado" },
]

interface DashboardData {
  granularity: "hour" | "day" | "month"
  summary: {
    total: number
    transactions: number
    cancelled: number
    averageTicket: number
    previousTotal: number
    growth: number | null
  }
  byPaymentMethod: Array<{ method: string; total: number }>
  series: Array<{ bucket: string; total: number; transactions: number }>
  topProducts: Array<{ name: string; quantity: number; revenue: number }>
  lowStock: Array<{ name: string; unit: string; quantity: number; minStock: number }>
  counts: { products: number; customers: number }
  recentSales: Array<{ id: string; folio: string; total: number; createdAt: string; method: string }>
}

function toInputDate(date: Date) {
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

function resolveRange(period: PeriodKey, customFrom: string, customTo: string) {
  const now = new Date()
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)

  switch (period) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) }
    case "yesterday": {
      const y = new Date(now)
      y.setDate(y.getDate() - 1)
      return { from: startOfDay(y), to: endOfDay(y) }
    }
    case "last7": {
      const start = new Date(now)
      start.setDate(start.getDate() - 6)
      return { from: startOfDay(start), to: endOfDay(now) }
    }
    case "thisMonth":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now) }
    case "lastMonth":
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)),
      }
    case "thisYear":
      return { from: new Date(now.getFullYear(), 0, 1), to: endOfDay(now) }
    case "custom":
    default: {
      const from = customFrom ? new Date(`${customFrom}T00:00:00`) : startOfDay(now)
      const to = customTo ? new Date(`${customTo}T23:59:59`) : endOfDay(now)
      return { from, to }
    }
  }
}

function formatBucket(bucket: string, granularity: "hour" | "day" | "month") {
  const date = new Date(bucket)
  if (granularity === "hour") {
    return `${String(date.getHours()).padStart(2, "0")}:00`
  }
  if (granularity === "day") {
    return new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short" }).format(date)
  }
  return new Intl.DateTimeFormat("es-MX", { month: "short", year: "2-digit" }).format(date)
}

export default function DashboardPage() {
  const { currentBranch } = useBranchStore()
  const { currentSession } = useCashStore()

  const [period, setPeriod] = useState<PeriodKey>("today")
  const [customFrom, setCustomFrom] = useState(() => toInputDate(new Date()))
  const [customTo, setCustomTo] = useState(() => toInputDate(new Date()))
  const [allBranches, setAllBranches] = useState(false)
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const range = useMemo(
    () => resolveRange(period, customFrom, customTo),
    [period, customFrom, customTo]
  )

  const loadDashboard = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("from", range.from.toISOString())
      params.set("to", range.to.toISOString())
      if (!allBranches && currentBranch?.id) params.set("branchId", currentBranch.id)

      const result = await apiFetch<DashboardData>(`/api/reports/dashboard?${params.toString()}`)
      setData(result)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar el dashboard")
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [range.from, range.to, allBranches, currentBranch?.id])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  const summary = data?.summary
  const growth = summary?.growth
  const chartData = (data?.series || []).map((point) => ({
    label: formatBucket(point.bucket, data?.granularity || "day"),
    ventas: point.total,
    transacciones: point.transactions,
  }))
  const pieData = (data?.byPaymentMethod || []).map((entry) => ({
    name: PAYMENT_LABELS[entry.method] || entry.method,
    value: entry.total,
  }))

  const rangeLabel = `${new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(range.from)} — ${new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(range.to)}`

  return (
    <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {allBranches ? "Todas las sucursales" : currentBranch?.name || "Sin sucursal"} · {rangeLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {currentSession && (
            <Badge variant="outline" className="border-green-200 text-green-600">
              Caja Abierta
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={() => void loadDashboard()} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* ── Selector de fechas ── */}
      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Periodo
            </Label>
            <Select value={period} onValueChange={(value) => setPeriod(value as PeriodKey)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="from">Desde</Label>
            <Input
              id="from"
              type="date"
              value={period === "custom" ? customFrom : toInputDate(range.from)}
              disabled={period !== "custom"}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="to">Hasta</Label>
            <Input
              id="to"
              type="date"
              value={period === "custom" ? customTo : toInputDate(range.to)}
              disabled={period !== "custom"}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Alcance</Label>
            <Select
              value={allBranches ? "all" : "current"}
              onValueChange={(value) => setAllBranches(value === "all")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Sucursal actual</SelectItem>
                <SelectItem value="all">Todas las sucursales</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-2 md:p-6 md:pb-2">
            <CardTitle className="text-xs font-medium md:text-sm">Ventas del periodo</CardTitle>
            <DollarSign className="h-4 w-4 shrink-0 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-lg font-bold md:text-2xl">{formatCurrency(summary?.total || 0)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {growth === null || growth === undefined ? (
                <span>Sin periodo anterior comparable</span>
              ) : (
                <>
                  {growth >= 0 ? (
                    <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
                  )}
                  <span className={growth >= 0 ? "text-green-500" : "text-red-500"}>
                    {growth >= 0 ? "+" : ""}
                    {growth.toFixed(1)}%
                  </span>
                  <span className="ml-1">vs anterior</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-2 md:p-6 md:pb-2">
            <CardTitle className="text-xs font-medium md:text-sm">Transacciones</CardTitle>
            <ShoppingCart className="h-4 w-4 shrink-0 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-lg font-bold md:text-2xl">{summary?.transactions || 0}</div>
            <p className="text-xs text-muted-foreground">
              Ticket promedio: {formatCurrency(summary?.averageTicket || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-2 md:p-6 md:pb-2">
            <CardTitle className="text-xs font-medium md:text-sm">Productos</CardTitle>
            <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-lg font-bold md:text-2xl">{data?.counts.products || 0}</div>
            <p className="text-xs text-muted-foreground">Activos en catálogo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-2 md:p-6 md:pb-2">
            <CardTitle className="text-xs font-medium md:text-sm">Clientes</CardTitle>
            <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-lg font-bold md:text-2xl">{data?.counts.customers || 0}</div>
            <p className="text-xs text-muted-foreground">Registrados</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Stock bajo ── */}
      {(data?.lowStock.length || 0) > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              Alertas de stock bajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data?.lowStock.slice(0, 8).map((item) => (
                <Badge key={item.name} variant="secondary" className="bg-amber-100 text-amber-700">
                  {item.name}: {item.quantity} {item.unit}
                </Badge>
              ))}
              {(data?.lowStock.length || 0) > 8 && (
                <Badge variant="secondary">+{(data?.lowStock.length || 0) - 8} más</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Gráficas ── */}
      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-base">
              {data?.granularity === "hour"
                ? "Ventas por hora"
                : data?.granularity === "day"
                ? "Ventas por día"
                : "Ventas por mes"}
            </CardTitle>
            <CardDescription>Distribución de ventas en el periodo seleccionado</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] p-2 md:p-6 md:pt-0">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={45}
                    tickFormatter={(value) => (value >= 1000 ? `$${(value / 1000).toFixed(0)}k` : `$${value}`)}
                  />
                  <Tooltip formatter={(value: number) => [formatCurrency(value), "Ventas"]} />
                  <Bar dataKey="ventas" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-muted-foreground">Sin ventas en este periodo</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-base">Métodos de pago</CardTitle>
            <CardDescription>Distribución por forma de cobro</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] p-2 md:p-6 md:pt-0">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [formatCurrency(value), "Total"]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-muted-foreground">Sin ventas en este periodo</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Top productos y últimas ventas ── */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-base">Productos más vendidos</CardTitle>
            <CardDescription>Top 5 del periodo por ingresos</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
            {(data?.topProducts.length || 0) > 0 ? (
              <div className="space-y-4">
                {data?.topProducts.map((product, index) => (
                  <div key={product.name} className="flex items-center">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                      {index + 1}
                    </div>
                    <div className="ml-3 min-w-0 flex-1 space-y-1">
                      <p className="truncate text-sm font-medium leading-none">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.quantity} unidades</p>
                    </div>
                    <div className="shrink-0 font-medium">{formatCurrency(product.revenue)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-[180px] items-center justify-center">
                <p className="text-sm text-muted-foreground">Sin ventas en este periodo</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-base">Últimas ventas</CardTitle>
            <CardDescription>Transacciones más recientes del periodo</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
            {(data?.recentSales.length || 0) > 0 ? (
              <div className="space-y-4">
                {data?.recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      {sale.method === "cash" ? (
                        <Banknote className="h-4 w-4" />
                      ) : (
                        <CreditCard className="h-4 w-4" />
                      )}
                    </div>
                    <div className="ml-3 min-w-0 flex-1 space-y-1">
                      <p className="truncate text-sm font-medium leading-none">Venta {sale.folio}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(sale.createdAt)}</p>
                    </div>
                    <div className="flex shrink-0 items-center font-medium">
                      {formatCurrency(sale.total)}
                      <ArrowUpRight className="ml-1 h-4 w-4 text-green-500" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-[180px] items-center justify-center">
                <p className="text-sm text-muted-foreground">Sin ventas en este periodo</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
