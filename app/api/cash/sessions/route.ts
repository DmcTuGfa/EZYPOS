import { NextResponse } from 'next/server'
import { ensureDatabaseSetup } from '@/lib/server/setup'
import { pool } from '@/lib/server/db'
import { mapCashSession } from '@/lib/server/mappers'

export async function GET(request: Request) {
  await ensureDatabaseSetup()
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const branchId = searchParams.get('branchId')

  if (userId && branchId) {
    const userSession = await pool.query(
      `SELECT * FROM cash_sessions
       WHERE user_id = $1 AND branch_id = $2 AND status = 'open'
       ORDER BY opened_at DESC
       LIMIT 1`,
      [userId, branchId]
    )

    if (userSession.rows[0]) {
      return NextResponse.json({ session: mapCashSession(userSession.rows[0]) })
    }

    const branchSession = await pool.query(
      `SELECT * FROM cash_sessions
       WHERE branch_id = $1 AND status = 'open'
       ORDER BY opened_at DESC
       LIMIT 1`,
      [branchId]
    )

    return NextResponse.json({ session: branchSession.rows[0] ? mapCashSession(branchSession.rows[0]) : null })
  }

  if (userId) {
    const res = await pool.query(
      `SELECT * FROM cash_sessions
       WHERE user_id = $1 AND status = 'open'
       ORDER BY opened_at DESC
       LIMIT 1`,
      [userId]
    )
    return NextResponse.json({ session: res.rows[0] ? mapCashSession(res.rows[0]) : null })
  }

  if (branchId) {
    const res = await pool.query(
      `SELECT * FROM cash_sessions
       WHERE branch_id = $1
       ORDER BY opened_at DESC`,
      [branchId]
    )
    return NextResponse.json({ sessions: res.rows.map(mapCashSession) })
  }

  const res = await pool.query('SELECT * FROM cash_sessions ORDER BY opened_at DESC')
  return NextResponse.json({ sessions: res.rows.map(mapCashSession) })
}

export async function POST(request: Request) {
  await ensureDatabaseSetup()
  const data = await request.json()

  const existingUser = await pool.query(
    `SELECT id FROM cash_sessions WHERE user_id = $1 AND status = 'open' LIMIT 1`,
    [data.userId]
  )
  if (existingUser.rows[0]) {
    return NextResponse.json({ error: 'El usuario ya tiene una caja abierta' }, { status: 400 })
  }

  const existingRegister = await pool.query(
    `SELECT id FROM cash_sessions WHERE cash_register_id = $1 AND status = 'open' LIMIT 1`,
    [data.cashRegisterId]
  )
  if (existingRegister.rows[0]) {
    return NextResponse.json({ error: 'La caja ya está abierta' }, { status: 400 })
  }

  const id = crypto.randomUUID()
  const row = await pool.query(
    `INSERT INTO cash_sessions (
      id,
      cash_register_id,
      user_id,
      branch_id,
      opening_amount,
      closing_amount,
      expected_amount,
      difference,
      status,
      notes,
      opened_at,
      closed_at
    )
    VALUES ($1,$2,$3,$4,$5,NULL,NULL,NULL,'open',$6,NOW(),NULL)
    RETURNING *`,
    [id, data.cashRegisterId, data.userId, data.branchId, data.openingAmount || 0, data.notes || '']
  )

  return NextResponse.json({ session: mapCashSession(row.rows[0]) })
}
