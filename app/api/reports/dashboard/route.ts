import { NextResponse } from 'next/server'
import { ensureDatabaseSetup } from '@/lib/server/setup'
import { pool } from '@/lib/server/db'

type Granularity = 'hour' | 'day' | 'month'

function resolveGranularity(from: Date, to: Date): Granularity {
  const days = (to.getTime() - from.getTime()) / 86400000
  if (days <= 1.5) return 'hour'
  if (days <= 70) return 'day'
  return 'month'
}

export async function GET(request: Request) {
  await ensureDatabaseSetup()
  const { searchParams } = new URL(request.url)
  const branchId = searchParams.get('branchId')

  const to = searchParams.get('to') ? new Date(searchParams.get('to') as string) : new Date()
  const from = searchParams.get('from')
    ? new Date(searchParams.get('from') as string)
    : new Date(new Date().setHours(0, 0, 0, 0))

  const spanMs = Math.max(1, to.getTime() - from.getTime())
  const prevFrom = new Date(from.getTime() - spanMs)
  const prevTo = new Date(from.getTime() - 1)

  const granularity: Granularity = resolveGranularity(from, to)

  const branchFilter = 'AND ($3::text IS NULL OR s.branch_id = $3)'
  const args = [from.toISOString(), to.toISOString(), branchId]

  const [summary, previous, byMethod, series, topProducts, lowStock, counts] = await Promise.all([
    pool.query(
      `SELECT
         COALESCE(SUM(s.total) FILTER (WHERE s.status <> 'cancelled'), 0)::numeric AS total,
         COUNT(*) FILTER (WHERE s.status <> 'cancelled')::int AS transactions,
         COUNT(*) FILTER (WHERE s.status = 'cancelled')::int AS cancelled
       FROM sales s
       WHERE s.created_at >= $1 AND s.created_at <= $2 ${branchFilter}`,
      args
    ),
    pool.query(
      `SELECT COALESCE(SUM(s.total), 0)::numeric AS total
       FROM sales s
       WHERE s.status <> 'cancelled' AND s.created_at >= $1 AND s.created_at <= $2 ${branchFilter}`,
      [prevFrom.toISOString(), prevTo.toISOString(), branchId]
    ),
    pool.query(
      `SELECT sp.method, COALESCE(SUM(sp.amount - sp.change_amount), 0)::numeric AS total
       FROM sale_payments sp
       JOIN sales s ON s.id = sp.sale_id
       WHERE s.status <> 'cancelled' AND s.created_at >= $1 AND s.created_at <= $2 ${branchFilter}
       GROUP BY sp.method
       ORDER BY total DESC`,
      args
    ),
    pool.query(
      `SELECT date_trunc('${granularity}', s.created_at) AS bucket,
              COALESCE(SUM(s.total), 0)::numeric AS total,
              COUNT(*)::int AS transactions
       FROM sales s
       WHERE s.status <> 'cancelled' AND s.created_at >= $1 AND s.created_at <= $2 ${branchFilter}
       GROUP BY bucket
       ORDER BY bucket`,
      args
    ),
    pool.query(
      `SELECT si.product_name AS name,
              SUM(si.quantity)::numeric AS quantity,
              SUM(si.total)::numeric AS revenue
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       WHERE s.status <> 'cancelled' AND s.created_at >= $1 AND s.created_at <= $2 ${branchFilter}
       GROUP BY si.product_name
       ORDER BY revenue DESC
       LIMIT 5`,
      args
    ),
    pool.query(
      `SELECT p.name, p.unit, p.min_stock::numeric AS min_stock, COALESCE(ps.quantity, 0)::numeric AS quantity
       FROM products p
       LEFT JOIN product_stock ps ON ps.product_id = p.id AND ($1::text IS NULL OR ps.branch_id = $1)
       WHERE p.is_active = true AND COALESCE(ps.quantity, 0) <= p.min_stock
       ORDER BY COALESCE(ps.quantity, 0)
       LIMIT 12`,
      [branchId]
    ),
    pool.query(
      `SELECT
         (SELECT COUNT(*)::int FROM products WHERE is_active = true) AS products,
         (SELECT COUNT(*)::int FROM customers WHERE is_active = true) AS customers`
    ),
  ])

  const recentSales = await pool.query(
    `SELECT s.id, s.folio, s.total, s.created_at,
            COALESCE((SELECT sp.method FROM sale_payments sp WHERE sp.sale_id = s.id ORDER BY sp.created_at LIMIT 1), 'mixed') AS method
     FROM sales s
     WHERE s.status <> 'cancelled' AND s.created_at >= $1 AND s.created_at <= $2 ${branchFilter}
     ORDER BY s.created_at DESC
     LIMIT 6`,
    args
  )

  const num = (v: unknown) => Number(v || 0)
  const total = num(summary.rows[0]?.total)
  const transactions = summary.rows[0]?.transactions || 0
  const previousTotal = num(previous.rows[0]?.total)

  return NextResponse.json({
    from: from.toISOString(),
    to: to.toISOString(),
    granularity,
    summary: {
      total,
      transactions,
      cancelled: summary.rows[0]?.cancelled || 0,
      averageTicket: transactions > 0 ? total / transactions : 0,
      previousTotal,
      growth: previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : null,
    },
    byPaymentMethod: byMethod.rows.map((r: any) => ({ method: r.method, total: num(r.total) })),
    series: series.rows.map((r: any) => ({
      bucket: r.bucket,
      total: num(r.total),
      transactions: r.transactions || 0,
    })),
    topProducts: topProducts.rows.map((r: any) => ({
      name: r.name,
      quantity: num(r.quantity),
      revenue: num(r.revenue),
    })),
    lowStock: lowStock.rows.map((r: any) => ({
      name: r.name,
      unit: r.unit,
      quantity: num(r.quantity),
      minStock: num(r.min_stock),
    })),
    counts: {
      products: counts.rows[0]?.products || 0,
      customers: counts.rows[0]?.customers || 0,
    },
    recentSales: recentSales.rows.map((r: any) => ({
      id: r.id,
      folio: r.folio,
      total: num(r.total),
      createdAt: r.created_at,
      method: r.method,
    })),
  })
}
