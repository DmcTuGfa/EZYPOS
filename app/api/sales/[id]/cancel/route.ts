import { NextResponse } from 'next/server'
import { ensureDatabaseSetup } from '@/lib/server/setup'
import { pool } from '@/lib/server/db'
import { mapSale } from '@/lib/server/mappers'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureDatabaseSetup()
  const { id } = await params
  const { userId, reason } = await request.json()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const saleRes = await client.query('SELECT * FROM sales WHERE id = $1 FOR UPDATE', [id])
    const sale = saleRes.rows[0]
    if (!sale) return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 })
    if (sale.status === 'cancelled') return NextResponse.json({ error: 'La venta ya está cancelada' }, { status: 400 })

    await client.query(`UPDATE sales SET status='cancelled', cancelled_at=NOW(), cancelled_by=$2, cancel_reason=$3 WHERE id = $1`, [id, userId, reason || ''])
    const items = await client.query('SELECT * FROM sale_items WHERE sale_id = $1', [id])
    for (const item of items.rows) {
      await client.query(
        `INSERT INTO inventory_movements (id, product_id, branch_id, from_branch_id, to_branch_id, type, quantity, reason, reference_id, user_id, created_at)
         VALUES ($1,$2,$3,NULL,NULL,'return',$4,$5,$6,$7,NOW())`,
        [crypto.randomUUID(), item.product_id, sale.branch_id, item.quantity, `Cancelación de venta ${sale.folio}`, id, userId]
      )
      await client.query(
        `INSERT INTO product_stock (id, product_id, branch_id, quantity, updated_at)
         VALUES ($1,$2,$3,$4,NOW())
         ON CONFLICT (product_id, branch_id) DO UPDATE SET quantity = product_stock.quantity + $4, updated_at = NOW()`,
        [crypto.randomUUID(), item.product_id, sale.branch_id, item.quantity]
      )
    }
    await client.query('COMMIT')
    const updated = await pool.query(`SELECT s.*, COALESCE((SELECT sp.method FROM sale_payments sp WHERE sp.sale_id = s.id ORDER BY sp.created_at ASC LIMIT 1), 'mixed') as payment_method FROM sales s WHERE id = $1`, [id])
    return NextResponse.json({ sale: mapSale(updated.rows[0]) })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error(error)
    return NextResponse.json({ error: 'No se pudo cancelar la venta' }, { status: 500 })
  } finally {
    client.release()
  }
}
