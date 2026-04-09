import { NextResponse } from 'next/server'
import { ensureDatabaseSetup } from '@/lib/server/setup'
import { pool } from '@/lib/server/db'
import { mapCustomer } from '@/lib/server/mappers'

export async function GET() {
  await ensureDatabaseSetup()
  const res = await pool.query('SELECT * FROM customers WHERE is_active = true ORDER BY name')
  return NextResponse.json({ customers: res.rows.map(mapCustomer) })
}

export async function POST(request: Request) {
  await ensureDatabaseSetup()
  const data = await request.json()
  const id = data.id || crypto.randomUUID()
  const row = await pool.query(
    `INSERT INTO customers (id, name, rfc, email, phone, fiscal_address, neighborhood, city, state, postal_code, tax_regime, cfdi_use, is_active, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true,NOW(),NOW()) RETURNING *`,
    [id, data.name, data.rfc || '', data.email || '', data.phone || '', data.fiscalAddress || '', data.neighborhood || '', data.city || '', data.state || '', data.postalCode || '', data.taxRegime || '', data.cfdiUse || '']
  )
  return NextResponse.json({ customer: mapCustomer(row.rows[0]) })
}
