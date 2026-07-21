import { NextResponse } from 'next/server'
import { ensureDatabaseSetup } from '@/lib/server/setup'
import { pool } from '@/lib/server/db'

/**
 * Reporte de INGRESOS y EGRESOS de productos.
 * - Ingresos  = entradas de mercancía (compras / entradas manuales / transferencias recibidas)
 * - Egresos   = salidas (ventas, mermas / salidas manuales, transferencias enviadas)
 * Devuelve piezas y dinero (costo y venta) por producto.
 */
export async function GET(request: Request) {
  await ensureDatabaseSetup()
  const { searchParams } = new URL(request.url)
  const branchId = searchParams.get('branchId')
  const from = searchParams.get('from') || new Date(Date.now() - 30 * 86400000).toISOString()
  const to = searchParams.get('to') || new Date().toISOString()

  const movementsSql = `
    SELECT m.product_id, m.type,
           SUM(ABS(m.quantity))::numeric AS qty
    FROM inventory_movements m
    WHERE m.created_at >= $1 AND m.created_at <= $2
      AND ($3::text IS NULL OR m.branch_id = $3 OR m.to_branch_id = $3)
    GROUP BY m.product_id, m.type
  `

  const salesSql = `
    SELECT si.product_id,
           SUM(si.quantity)::numeric AS qty,
           SUM(si.total)::numeric AS revenue,
           SUM(si.quantity * p.purchase_price)::numeric AS cost
    FROM sale_items si
    JOIN sales s ON s.id = si.sale_id
    JOIN products p ON p.id = si.product_id
    WHERE s.status <> 'cancelled'
      AND s.created_at >= $1 AND s.created_at <= $2
      AND ($3::text IS NULL OR s.branch_id = $3)
    GROUP BY si.product_id
  `

  const stockSql = `
    SELECT product_id, SUM(quantity)::numeric AS qty
    FROM product_stock
    WHERE ($1::text IS NULL OR branch_id = $1)
    GROUP BY product_id
  `

  const [movements, sales, stock, products] = await Promise.all([
    pool.query(movementsSql, [from, to, branchId]),
    pool.query(salesSql, [from, to, branchId]),
    pool.query(stockSql, [branchId]),
    pool.query('SELECT id, sku, name, purchase_price, sale_price, min_stock FROM products WHERE is_active = true ORDER BY name'),
  ])

  const num = (v: unknown) => Number(v || 0)

  const byProduct = new Map<string, any>()
  for (const p of products.rows) {
    byProduct.set(p.id, {
      productId: p.id,
      sku: p.sku,
      name: p.name,
      purchasePrice: num(p.purchase_price),
      salePrice: num(p.sale_price),
      minStock: num(p.min_stock),
      entriesQty: 0,
      entriesCost: 0,
      transfersInQty: 0,
      soldQty: 0,
      soldRevenue: 0,
      soldCost: 0,
      exitsQty: 0,
      exitsCost: 0,
      adjustments: 0,
      stock: 0,
    })
  }

  for (const row of movements.rows) {
    const entry = byProduct.get(row.product_id)
    if (!entry) continue
    const qty = num(row.qty)
    if (row.type === 'entry') {
      entry.entriesQty += qty
      entry.entriesCost += qty * entry.purchasePrice
    } else if (row.type === 'exit') {
      entry.exitsQty += qty
      entry.exitsCost += qty * entry.purchasePrice
    } else if (row.type === 'transfer') {
      entry.transfersInQty += qty
    } else if (row.type === 'adjustment') {
      entry.adjustments += qty
    }
  }

  for (const row of sales.rows) {
    const entry = byProduct.get(row.product_id)
    if (!entry) continue
    entry.soldQty += num(row.qty)
    entry.soldRevenue += num(row.revenue)
    entry.soldCost += num(row.cost)
  }

  for (const row of stock.rows) {
    const entry = byProduct.get(row.product_id)
    if (!entry) continue
    entry.stock = num(row.qty)
  }

  const rows = Array.from(byProduct.values()).map((r) => ({
    ...r,
    margin: r.soldRevenue - r.soldCost,
    marginPercent: r.soldRevenue > 0 ? ((r.soldRevenue - r.soldCost) / r.soldRevenue) * 100 : 0,
    stockValue: r.stock * r.purchasePrice,
  }))

  const totals = rows.reduce(
    (acc, r) => ({
      entriesQty: acc.entriesQty + r.entriesQty,
      entriesCost: acc.entriesCost + r.entriesCost,
      soldQty: acc.soldQty + r.soldQty,
      soldRevenue: acc.soldRevenue + r.soldRevenue,
      soldCost: acc.soldCost + r.soldCost,
      exitsQty: acc.exitsQty + r.exitsQty,
      exitsCost: acc.exitsCost + r.exitsCost,
      margin: acc.margin + r.margin,
      stockValue: acc.stockValue + r.stockValue,
    }),
    { entriesQty: 0, entriesCost: 0, soldQty: 0, soldRevenue: 0, soldCost: 0, exitsQty: 0, exitsCost: 0, margin: 0, stockValue: 0 }
  )

  return NextResponse.json({ from, to, branchId, rows, totals })
}
