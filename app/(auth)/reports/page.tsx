"use client"

import { useEffect } from 'react'
import { BarChart3, PackageSearch, Receipt } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useBranchStore } from '@/lib/stores/branch-store'
import { useReportsStore } from '@/lib/stores/reports-store'
import { formatCurrency } from '@/lib/utils/format'

export default function ReportsPage() {
  const { currentBranch } = useBranchStore()
  const { summary, topProducts, lowStock, loadReports } = useReportsStore()

  useEffect(() => {
    loadReports(currentBranch?.id)
  }, [loadReports, currentBranch?.id])

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reportes</h1>
        <p className="text-muted-foreground">Resumen comercial con datos de la sucursal activa.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card><CardHeader><CardTitle className="text-sm">Ventas</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatCurrency(summary.totalSales)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Transacciones</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.totalTransactions}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Ticket promedio</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatCurrency(summary.averageTicket)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Ventas canceladas</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.cancelledSales}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Facturadas</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{summary.invoicedSales}</CardContent></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Productos más vendidos</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>Cantidad</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
                <TableBody>
                  {topProducts.length === 0 ? <TableRow><TableCell colSpan={3} className="h-24 text-center">Sin información todavía.</TableCell></TableRow> : topProducts.map((item) => (
                    <TableRow key={item.productId}><TableCell>{item.productName}</TableCell><TableCell>{item.quantity}</TableCell><TableCell>{formatCurrency(item.total)}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><PackageSearch className="h-5 w-5" /> Bajo stock</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>Existencia</TableHead><TableHead>Mínimo</TableHead></TableRow></TableHeader>
                <TableBody>
                  {lowStock.length === 0 ? <TableRow><TableCell colSpan={3} className="h-24 text-center">Sin alertas de mínimo.</TableCell></TableRow> : lowStock.map((item, index) => (
                    <TableRow key={`${item.productName}-${index}`}><TableCell>{item.productName}</TableCell><TableCell>{item.quantity}</TableCell><TableCell>{item.minStock}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" /> Alcance actual</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Este módulo calcula sobre localStorage. Cuando migres a Neon/PostgreSQL, estas mismas métricas se pueden mover a consultas SQL y vistas.
        </CardContent>
      </Card>
    </div>
  )
}
