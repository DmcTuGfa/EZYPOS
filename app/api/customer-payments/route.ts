import { NextResponse } from 'next/server'
import { ensureDatabaseSetup } from '@/lib/server/setup'
import { pool } from '@/lib/server/db'
import { mapCustomerPayment } from '@/lib/server/mappers'

export async function GET(request: Request) {
  await ensureDatabaseSetup()
  const { searchParams } = new URL(request.url)
  const customerId = searchParams.get('customerId')
  const branchId = searchParams.get('branchId')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const where: string[] = []
  const values: unknown[] = []
  if (customerId) { values.push(customerId); where.push(`customer_id = $${values.length}`) }
  if (branchId) { values.push(branchId); where.push(`branch_id = $${values.length}`) }
  if (from) { values.push(from); where.push(`created_at >= $${values.length}`) }
  if (to) { values.push(to); where.push(`created_at <= $${values.length}`) }

  const sql = `SELECT * FROM customer_payments ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC LIMIT 500`
  const res = await pool.query(sql, values)
  return NextResponse.json({ payments: res.rows.map(mapCustomerPayment) })
}

export async function POST(request: Request) {
  await ensureDatabaseSetup()
  const data = await request.json()

  if (!data.customerId || !data.branchId || !data.userId) {
    return NextResponse.json({ error: 'Faltan datos del abono' }, { status: 400 })
  }
  const amount = Number(data.amount || 0)
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'El monto del abono debe ser mayor a cero' }, { status: 400 })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const countRes = await client.query(`SELECT COUNT(*)::int AS count FROM customer_payments`)
    const folio = `AB-${String((countRes.rows[0]?.count || 0) + 1).padStart(6, '0')}`
    const id = crypto.randomUUID()
    const method = data.method || 'cash'

    const row = await client.query(
      `INSERT INTO customer_payments (id, folio, customer_id, branch_id, user_id, cash_session_id, concept, amount, total_amount, method, reference, notes, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'active',NOW()) RETURNING *`,
      [
        id,
        folio,
        data.customerId,
        data.branchId,
        data.userId,
        data.cashSessionId || null,
        data.concept || '',
        amount,
        data.totalAmount === null || data.totalAmount === undefined || data.totalAmount === '' ? null : Number(data.totalAmount),
        method,
        data.reference || '',
        data.notes || '',
      ]
    )

    // Si el abono fue en efectivo y hay caja abierta, entra al corte como depósito
    if (method === 'cash' && data.cashSessionId) {
      await client.query(
        `INSERT INTO cash_movements (id, cash_session_id, type, amount, description, reference_id, user_id, created_at)
         VALUES ($1,$2,'deposit',$3,$4,$5,$6,NOW())`,
        [crypto.randomUUID(), data.cashSessionId, amount, `Abono ${folio}`, id, data.userId]
      )
    }

    await client.query('COMMIT')
    return NextResponse.json({ payment: mapCustomerPayment(row.rows[0]) })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error(error)
    return NextResponse.json({ error: 'No se pudo registrar el abono' }, { status: 500 })
  } finally {
    client.release()
  }
}
