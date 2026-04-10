import { NextResponse } from 'next/server'
import { ensureDatabaseSetup } from '@/lib/server/setup'
import { pool } from '@/lib/server/db'
import { mapCashSession } from '@/lib/server/mappers'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureDatabaseSetup()
  const { id } = await params
  const data = await request.json()

  const closingAmount = Number(data?.closingAmount ?? 0)
  const expectedAmount = Number(data?.expectedAmount ?? 0)
  const notes = typeof data?.notes === 'string' ? data.notes : ''

  if (!Number.isFinite(closingAmount) || !Number.isFinite(expectedAmount)) {
    return NextResponse.json(
      { error: 'Montos inválidos para cierre de caja' },
      { status: 400 }
    )
  }

  const row = await pool.query(
    `
      UPDATE cash_sessions
      SET
        closing_amount = $2::numeric,
        expected_amount = $3::numeric,
        difference = ($2::numeric - $3::numeric),
        status = 'closed',
        notes = $4,
        closed_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [id, closingAmount, expectedAmount, notes]
  )

  if (!row.rows[0]) {
    return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })
  }

  return NextResponse.json({ session: mapCashSession(row.rows[0]) })
}
