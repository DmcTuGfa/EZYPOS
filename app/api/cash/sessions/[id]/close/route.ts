import { NextResponse } from 'next/server'
import { ensureDatabaseSetup } from '@/lib/server/setup'
import { pool } from '@/lib/server/db'
import { mapCashSession } from '@/lib/server/mappers'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureDatabaseSetup()
  const { id } = await params
  const data = await request.json()
  const row = await pool.query(
    `UPDATE cash_sessions SET closing_amount=$2, expected_amount=$3, difference=$2-$3, status='closed', notes=$4, closed_at=NOW() WHERE id=$1 RETURNING *`,
    [id, data.closingAmount, data.expectedAmount, data.notes || '']
  )
  if (!row.rows[0]) return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })
  return NextResponse.json({ session: mapCashSession(row.rows[0]) })
}
