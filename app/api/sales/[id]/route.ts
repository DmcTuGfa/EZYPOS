import { NextResponse } from 'next/server'
import { ensureDatabaseSetup } from '@/lib/server/setup'
import { pool } from '@/lib/server/db'
import { mapSale, mapSaleItem, mapSalePayment } from '@/lib/server/mappers'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureDatabaseSetup()
  const { id } = await params
  const saleRes = await pool.query(`SELECT s.*, COALESCE((SELECT sp.method FROM sale_payments sp WHERE sp.sale_id = s.id ORDER BY sp.created_at ASC LIMIT 1), 'mixed') as payment_method FROM sales s WHERE id = $1`, [id])
  const sale = saleRes.rows[0]
  if (!sale) return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 })
  const [items, payments] = await Promise.all([
    pool.query('SELECT * FROM sale_items WHERE sale_id = $1 ORDER BY id', [id]),
    pool.query('SELECT * FROM sale_payments WHERE sale_id = $1 ORDER BY created_at', [id]),
  ])
  return NextResponse.json({ sale: mapSale(sale), items: items.rows.map(mapSaleItem), payments: payments.rows.map(mapSalePayment) })
}
