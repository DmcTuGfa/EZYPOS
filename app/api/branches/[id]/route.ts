import { NextResponse } from 'next/server'
import { ensureDatabaseSetup } from '@/lib/server/setup'
import { pool } from '@/lib/server/db'
import { mapBranch } from '@/lib/server/mappers'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureDatabaseSetup()
  const { id } = await params
  const data = await request.json()
  const current = await pool.query('SELECT * FROM branches WHERE id = $1', [id])
  if (!current.rows[0]) return NextResponse.json({ error: 'Sucursal no encontrada' }, { status: 404 })
  const c = current.rows[0]
  const row = await pool.query(
    `UPDATE branches SET name=$2, code=$3, address=$4, city=$5, state=$6, postal_code=$7, phone=$8, is_active=$9, updated_at=NOW() WHERE id=$1 RETURNING *`,
    [id, data.name ?? c.name, data.code ?? c.code, data.address ?? c.address, data.city ?? c.city, data.state ?? c.state, data.postalCode ?? c.postal_code, data.phone ?? c.phone, data.isActive ?? c.is_active]
  )
  return NextResponse.json({ branch: mapBranch(row.rows[0]) })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureDatabaseSetup()
  const { id } = await params
  await pool.query('UPDATE branches SET is_active=false, updated_at=NOW() WHERE id=$1', [id])
  return NextResponse.json({ ok: true })
}
