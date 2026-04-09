import { NextResponse } from 'next/server'
import { ensureDatabaseSetup } from '@/lib/server/setup'
import { pool } from '@/lib/server/db'
import { mapCashMovement } from '@/lib/server/mappers'

export async function GET(request: Request) {
  await ensureDatabaseSetup()
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')
  const res = sessionId
    ? await pool.query('SELECT * FROM cash_movements WHERE cash_session_id = $1 ORDER BY created_at DESC', [sessionId])
    : await pool.query('SELECT * FROM cash_movements ORDER BY created_at DESC')
  return NextResponse.json({ movements: res.rows.map(mapCashMovement) })
}

export async function POST(request: Request) {
  await ensureDatabaseSetup()
  const data = await request.json()
  const row = await pool.query(
    `INSERT INTO cash_movements (id, cash_session_id, type, amount, description, reference_id, user_id, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,NOW()) RETURNING *`,
    [crypto.randomUUID(), data.cashSessionId, data.type, data.amount, data.description || '', data.referenceId || null, data.userId]
  )
  return NextResponse.json({ movement: mapCashMovement(row.rows[0]) })
}
