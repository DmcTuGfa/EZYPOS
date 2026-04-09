import { NextResponse } from 'next/server'
import { ensureDatabaseSetup } from '@/lib/server/setup'
import { pool } from '@/lib/server/db'
import { mapBranch } from '@/lib/server/mappers'

export async function GET() {
  await ensureDatabaseSetup()
  const res = await pool.query('SELECT * FROM branches WHERE is_active = true ORDER BY name')
  return NextResponse.json({ branches: res.rows.map(mapBranch) })
}

export async function POST(request: Request) {
  await ensureDatabaseSetup()
  const data = await request.json()
  const id = data.id || crypto.randomUUID()
  const row = await pool.query(
    `INSERT INTO branches (id, name, code, address, city, state, postal_code, phone, is_active, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,NOW(),NOW()) RETURNING *`,
    [id, data.name, data.code, data.address || '', data.city || '', data.state || '', data.postalCode || '', data.phone || '']
  )
  return NextResponse.json({ branch: mapBranch(row.rows[0]) })
}
