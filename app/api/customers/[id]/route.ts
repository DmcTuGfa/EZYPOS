import { NextResponse } from 'next/server'
import { ensureDatabaseSetup } from '@/lib/server/setup'
import { pool } from '@/lib/server/db'
import { mapCustomer } from '@/lib/server/mappers'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureDatabaseSetup()
  const { id } = await params
  const data = await request.json()
  const current = await pool.query('SELECT * FROM customers WHERE id = $1', [id])
  if (!current.rows[0]) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
  const c = current.rows[0]
  const row = await pool.query(
    `UPDATE customers SET name=$2, rfc=$3, email=$4, phone=$5, fiscal_address=$6, neighborhood=$7, city=$8, state=$9, postal_code=$10, tax_regime=$11, cfdi_use=$12, is_active=$13, updated_at=NOW() WHERE id=$1 RETURNING *`,
    [id, data.name ?? c.name, data.rfc ?? c.rfc, data.email ?? c.email, data.phone ?? c.phone, data.fiscalAddress ?? c.fiscal_address, data.neighborhood ?? c.neighborhood, data.city ?? c.city, data.state ?? c.state, data.postalCode ?? c.postal_code, data.taxRegime ?? c.tax_regime, data.cfdiUse ?? c.cfdi_use, data.isActive ?? c.is_active]
  )
  return NextResponse.json({ customer: mapCustomer(row.rows[0]) })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureDatabaseSetup()
  const { id } = await params
  await pool.query('UPDATE customers SET is_active=false, updated_at=NOW() WHERE id=$1', [id])
  return NextResponse.json({ ok: true })
}
