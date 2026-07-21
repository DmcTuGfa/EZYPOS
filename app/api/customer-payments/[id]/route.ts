import { NextResponse } from 'next/server'
import { ensureDatabaseSetup } from '@/lib/server/setup'
import { pool } from '@/lib/server/db'
import { mapCustomerPayment } from '@/lib/server/mappers'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureDatabaseSetup()
  const { id } = await params
  const res = await pool.query('SELECT * FROM customer_payments WHERE id = $1', [id])
  if (!res.rows[0]) return NextResponse.json({ error: 'Abono no encontrado' }, { status: 404 })
  return NextResponse.json({ payment: mapCustomerPayment(res.rows[0]) })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureDatabaseSetup()
  const { id } = await params
  const data = await request.json()
  const current = await pool.query('SELECT * FROM customer_payments WHERE id = $1', [id])
  if (!current.rows[0]) return NextResponse.json({ error: 'Abono no encontrado' }, { status: 404 })
  const c = current.rows[0]
  const res = await pool.query(
    `UPDATE customer_payments SET concept=$2, notes=$3, reference=$4, status=$5 WHERE id=$1 RETURNING *`,
    [id, data.concept ?? c.concept, data.notes ?? c.notes, data.reference ?? c.reference, data.status ?? c.status]
  )
  return NextResponse.json({ payment: mapCustomerPayment(res.rows[0]) })
}
