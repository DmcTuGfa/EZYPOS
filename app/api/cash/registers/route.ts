import { NextResponse } from 'next/server'
import { ensureDatabaseSetup } from '@/lib/server/setup'
import { pool } from '@/lib/server/db'
import { mapCashRegister } from '@/lib/server/mappers'

export async function GET(request: Request) {
  await ensureDatabaseSetup()
  const { searchParams } = new URL(request.url)
  const branchId = searchParams.get('branchId')
  const res = branchId
    ? await pool.query('SELECT * FROM cash_registers WHERE is_active = true AND branch_id = $1 ORDER BY name', [branchId])
    : await pool.query('SELECT * FROM cash_registers WHERE is_active = true ORDER BY name')
  return NextResponse.json({ registers: res.rows.map(mapCashRegister) })
}
