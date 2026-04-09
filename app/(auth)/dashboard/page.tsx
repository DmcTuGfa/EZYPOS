"use client"

import { useEffect, useState } from "react"
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
  BarChart3
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useBranchStore } from "@/lib/stores/branch-store"
import { useProductsStore } from "@/lib/stores/products-store"
import { useCustomersStore } from "@/lib/stores/customers-store"
import { useSalesStore } from "@/lib/stores/sales-store"
import { useCashStore } from "@/lib/stores/cash-store"
import { formatCurrency, formatDate } from "@/lib/utils/format"
import { db } from "@/lib/db/local-storage"
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
  LineChart,
  Line
} from "recharts"

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

export default function DashboardPage() {
  const { currentBranch } = useBranchStore()
  const { products, loadProducts } = useProductsStore()
  const { customers, loadCustomers } = useCustomersStore()
  const { sales, loadSales } = useSalesStore()
  const { currentSession, loadCurrentSession } = useCashStore()
  const [productStocks, setProductStocks] = useState<Array<{ productId: string; quantity: number }>>([])

  useEffect(() => {
    loadProducts()
    loadCustomers()
    loadSales()
    loadCurrentSession()
    loadProductStocks()
  }, [loadProducts, loadCustomers, loadSales, loadCurrentSession])

  function loadProductStocks() {
    const stocks = db.productStock.getAll()
    if (currentBranch) {
      setProductStocks(stocks.filter(s => s.branchId === currentBranch.id))
    } else {
      setProductStocks(stocks)
    }
  }

  // Calculate metrics
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const todaySales = sales.filter(s => {
    const saleDate = new Date(s.createdAt)
    saleDate.setHours(0, 0, 0, 0)
    return saleDate.getTime() === today.getTime() && s.status === "completed"
  })

  const todayTotal = todaySales.reduce((sum, sale) => sum + sale.total, 0)
  const todayCount = todaySales.length
  const averageTicket = todayCount > 0 ? todayTotal / todayCount : 0

  // Yesterday comparison
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdaySales = sales.filter(s => {
    const saleDate = new Date(s.createdAt)
    saleDate.setHours(0, 0, 0, 0)
    return saleDate.getTime() === yesterday.getTime() && s.status === "completed"
  })
  const yesterdayTotal = yesterdaySales.reduce((sum, sale) => sum + sale.total, 0)
  const salesGrowth = yesterdayTotal > 0 ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100 : 0

  // Low stock products
  const lowStockProducts = products.filter(p => {
    const stock = productStocks.find(s => s.productId === p.id)
    return (stock?.quantity || 0) <= p.minStock
  })

  // Sales by payment method
  const paymentMethodData = todaySales.reduce((acc, sale) => {
    const method = sale.paymentMethod ?? 'cash'
    const label = getPaymentMethodLabel(method)
    const existing = acc.find(a => a.name === label)
    if (existing) {
      existing.value += sale.total
    } else {
      acc.push({ name: label, value: sale.total })
    }
    return acc
  }, [] as Array<{ name: string; value: number }>)

  // Sales by hour
  const hourlyData = Array.from({ length: 24 }, (_, i) => {
    const hourSales = todaySales.filter(s => {
      const hour = new Date(s.createdAt).getHours()
      return hour === i
    })
    return {
      hour: `${i.toString().padStart(2, "0")}:00`,
      ventas: hourSales.reduce((sum, s) => sum + s.total, 0),
      transacciones: hourSales.length
    }
  }).filter((_, i) => i >= 6 && i <= 22) // Show only business hours

  // Top products
  const topProducts = getTopProducts()

  function getTopProducts() {
    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {}
    
    todaySales.forEach(sale => {
      const items = db.saleItems.getBySaleId(sale.id)
      items.forEach(item => {
        if (productSales[item.productId]) {
          productSales[item.productId].quantity += item.quantity
          productSales[item.productId].revenue += item.total
        } else {
          const product = products.find(p => p.id === item.productId)
          productSales[item.productId] = {
            name: product?.name || "Producto",
            quantity: item.quantity,
            revenue: item.total
          }
        }
      })
    })

    return Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
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

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Resumen de ventas y operaciones del día
          </p>
        </div>
        {currentSession && (
          <Badge variant="outline" className="text-green-600 border-green-200">
            Caja Abierta
          </Badge>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas del Día</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(todayTotal)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {salesGrowth >= 0 ? (
                <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
              )}
              <span className={salesGrowth >= 0 ? "text-green-500" : "text-red-500"}>
                {salesGrowth >= 0 ? "+" : ""}{salesGrowth.toFixed(1)}%
              </span>
              <span className="ml-1">vs ayer</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transacciones</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayCount}</div>
            <p className="text-xs text-muted-foreground">
              Ticket promedio: {formatCurrency(averageTicket)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
            <p className="text-xs text-muted-foreground">
              {products.filter(p => p.isActive).length} activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
            <p className="text-xs text-muted-foreground">
              Registrados en el sistema
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              Alertas de Stock Bajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStockProducts.slice(0, 5).map(product => {
                const stock = productStocks.find(s => s.productId === product.id)
                return (
                  <Badge key={product.id} variant="secondary" className="bg-amber-100 text-amber-700">
                    {product.name}: {stock?.quantity || 0} {product.unit}
                  </Badge>
                )
              })}
              {lowStockProducts.length > 5 && (
                <Badge variant="secondary">
                  +{lowStockProducts.length - 5} más
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Ventas por Hora</CardTitle>
            <CardDescription>
              Distribución de ventas durante el día
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="hour" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), "Ventas"]}
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                />
                <Bar 
                  dataKey="ventas" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Métodos de Pago</CardTitle>
            <CardDescription>
              Distribución de ventas por método de pago
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {paymentMethodData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethodData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {paymentMethodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), "Total"]}
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">Sin ventas hoy</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Products & Recent Sales */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Productos Más Vendidos</CardTitle>
            <CardDescription>
              Top 5 productos del día por ingresos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topProducts.length > 0 ? (
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div key={index} className="flex items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                      {index + 1}
                    </div>
                    <div className="ml-4 flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {product.quantity} unidades
                      </p>
                    </div>
                    <div className="font-medium">{formatCurrency(product.revenue)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-[200px] items-center justify-center">
                <p className="text-muted-foreground">Sin ventas hoy</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Últimas Ventas</CardTitle>
            <CardDescription>
              Transacciones más recientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {todaySales.length > 0 ? (
              <div className="space-y-4">
                {todaySales.slice(0, 5).map((sale) => (
                  <div key={sale.id} className="flex items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      {sale.paymentMethod === "cash" ? (
                        <Banknote className="h-4 w-4" />
                      ) : (
                        <CreditCard className="h-4 w-4" />
                      )}
                    </div>
                    <div className="ml-4 flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        Venta #{sale.folio}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(sale.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center font-medium">
                      {formatCurrency(sale.total)}
                      <ArrowUpRight className="ml-1 h-4 w-4 text-green-500" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-[200px] items-center justify-center">
                <p className="text-muted-foreground">Sin ventas hoy</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
