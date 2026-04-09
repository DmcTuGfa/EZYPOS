import { NextResponse } from 'next/server'
import { ensureDatabaseSetup } from '@/lib/server/setup'
import { pool } from '@/lib/server/db'
import { mapCashMovement, mapSale, mapSaleItem, mapSalePayment } from '@/lib/server/mappers'

export async function GET(request: Request) {
  await ensureDatabaseSetup()
  const { searchParams } = new URL(request.url)
  const branchId = searchParams.get('branchId')
  const res = branchId
    ? await pool.query(`SELECT s.*, COALESCE((SELECT sp.method FROM sale_payments sp WHERE sp.sale_id = s.id ORDER BY sp.created_at ASC LIMIT 1), 'mixed') as payment_method FROM sales s WHERE branch_id = $1 ORDER BY created_at DESC`, [branchId])
    : await pool.query(`SELECT s.*, COALESCE((SELECT sp.method FROM sale_payments sp WHERE sp.sale_id = s.id ORDER BY sp.created_at ASC LIMIT 1), 'mixed') as payment_method FROM sales s ORDER BY created_at DESC`)
  return NextResponse.json({ sales: res.rows.map(mapSale) })
}

export async function POST(request: Request) {
  await ensureDatabaseSetup()
  const data = await request.json()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const branch = await client.query('SELECT code FROM branches WHERE id = $1', [data.branchId])
    const code = branch.rows[0]?.code || 'VTA'
    const countRes = await client.query('SELECT COUNT(*)::int as count FROM sales WHERE folio LIKE $1', [`${code}-%`])
    const folio = `${code}-${String((countRes.rows[0]?.count || 0) + 1).padStart(6, '0')}`

    const saleId = crypto.randomUUID()
    const saleRow = await client.query(
      `INSERT INTO sales (id, folio, branch_id, cash_session_id, user_id, customer_id, subtotal, tax_amount, discount_amount, discount_type, discount_value, total, status, invoice_status, notes, cancelled_at, cancelled_by, cancel_reason, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'completed','pending',$13,NULL,NULL,'',NOW()) RETURNING *, $14 as payment_method`,
      [saleId, folio, data.branchId, data.cashSessionId, data.userId, data.customer?.id || null, data.subtotal, data.taxAmount, data.discountAmount, data.discountType, data.discountValue, data.total, data.notes || '', data.payments?.[0]?.method || 'mixed']
    )

    for (const item of data.items || []) {
      await client.query(
        `INSERT INTO sale_items (id, sale_id, product_id, product_name, product_sku, quantity, unit_price, tax_rate, tax_amount, discount_amount, subtotal, total)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [crypto.randomUUID(), saleId, item.productId, item.productName, item.productSku, item.quantity, item.unitPrice, item.taxRate, item.taxAmount, item.discountAmount, item.subtotal, item.total]
      )
      await client.query(
        `INSERT INTO inventory_movements (id, product_id, branch_id, from_branch_id, to_branch_id, type, quantity, reason, reference_id, user_id, created_at)
         VALUES ($1,$2,$3,NULL,NULL,'sale',$4,$5,$6,$7,NOW())`,
        [crypto.randomUUID(), item.productId, data.branchId, -Math.abs(item.quantity), `Venta ${folio}`, saleId, data.userId]
      )
      await client.query(
        `INSERT INTO product_stock (id, product_id, branch_id, quantity, updated_at)
         VALUES ($1,$2,$3,$4,NOW())
         ON CONFLICT (product_id, branch_id) DO UPDATE SET quantity = GREATEST(0, product_stock.quantity + $4), updated_at = NOW()`,
        [crypto.randomUUID(), item.productId, data.branchId, -Math.abs(item.quantity)]
      )
    }

    for (const payment of data.payments || []) {
      await client.query(
        `INSERT INTO sale_payments (id, sale_id, method, amount, reference, change_amount, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
        [crypto.randomUUID(), saleId, payment.method, payment.amount, payment.reference || '', payment.changeAmount || 0]
      )
    }

    const cashPayment = (data.payments || []).find((p: any) => p.method === 'cash')
    let cashMovement = null
    if (cashPayment) {
      const cm = await client.query(
        `INSERT INTO cash_movements (id, cash_session_id, type, amount, description, reference_id, user_id, created_at)
         VALUES ($1,$2,'sale',$3,$4,$5,$6,NOW()) RETURNING *`,
        [crypto.randomUUID(), data.cashSessionId, Number(cashPayment.amount) - Number(cashPayment.changeAmount || 0), `Venta ${folio}`, saleId, data.userId]
      )
      cashMovement = mapCashMovement(cm.rows[0])
    }

    await client.query('COMMIT')
    const itemsRes = await pool.query('SELECT * FROM sale_items WHERE sale_id = $1', [saleId])
    const paymentsRes = await pool.query('SELECT * FROM sale_payments WHERE sale_id = $1', [saleId])
    return NextResponse.json({ sale: mapSale(saleRow.rows[0]), items: itemsRes.rows.map(mapSaleItem), payments: paymentsRes.rows.map(mapSalePayment), cashMovement })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error(error)
    return NextResponse.json({ error: 'No se pudo crear la venta' }, { status: 500 })
  } finally {
    client.release()
  }
}
