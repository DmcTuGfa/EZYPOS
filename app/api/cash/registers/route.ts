import { NextResponse } from 'next/server'
import { ensureDatabaseSetup } from '@/lib/server/setup'
import { pool } from '@/lib/server/db'
import { mapCashRegister } from '@/lib/server/mappers'

export async function GET(request: Request) {
  await ensureDatabaseSetup()
  const { searchParams } = new URL(request.url)
  const branchId = searchParams.get('branchId')
  const all = searchParams.get('all') // incluir inactivas
  const baseWhere = all ? '' : 'WHERE is_active = true'
  const res = branchId
    ? await pool.query(
        `SELECT * FROM cash_registers WHERE ${all ? '' : 'is_active = true AND '}branch_id = $1 ORDER BY name`,
        [branchId]
      )
    : await pool.query(
        `SELECT * FROM cash_registers ${baseWhere} ORDER BY name`
      )
  return NextResponse.json({ registers: res.rows.map(mapCashRegister) })
}

export async function POST(request: Request) {
  await ensureDatabaseSetup()
  const data = await request.json()
  if (!data.name || !data.branchId) {
    return NextResponse.json({ error: 'Nombre y sucursal son obligatorios' }, { status: 400 })
  }
  const id = crypto.randomUUID()
  const row = await pool.query(
    `INSERT INTO cash_registers (id, name, branch_id, is_active, created_at)
     VALUES ($1, $2, $3, true, NOW()) RETURNING *`,
    [id, data.name.trim(), data.branchId]
  )
  return NextResponse.json({ register: mapCashRegister(row.rows[0]) })
}

export async function DELETE(request: Request) {
  await ensureDatabaseSetup()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  // Verificar que no tenga sesión abierta
  const open = await pool.query(
    `SELECT id FROM cash_sessions WHERE cash_register_id = $1 AND status = 'open' LIMIT 1`,
    [id]
  )
  if (open.rows[0]) {
    return NextResponse.json({ error: 'No se puede desactivar una caja con sesión abierta' }, { status: 400 })
  }
  await pool.query(`UPDATE cash_registers SET is_active = false WHERE id = $1`, [id])
  return NextResponse.json({ ok: true })
}
