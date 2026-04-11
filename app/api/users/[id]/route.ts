import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { ensureDatabaseSetup } from '@/lib/server/setup'
import { pool } from '@/lib/server/db'
import { mapUser } from '@/lib/server/mappers'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureDatabaseSetup()
  const { id } = await params
  const data = await request.json()

  const current = await pool.query('SELECT * FROM users WHERE id = $1', [id])
  if (!current.rows[0]) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  const c = current.rows[0]

  // Solo re-hashear si viene una contraseña nueva y no vacía
  const passwordHash = (data.passwordHash && data.passwordHash.trim() !== '')
    ? await bcrypt.hash(data.passwordHash, 10)
    : c.password_hash

  // branchId: null explícito si viene null o 'none', undefined conserva el actual
  const branchId = data.branchId === null || data.branchId === 'none'
    ? null
    : (data.branchId !== undefined ? data.branchId : c.branch_id)

  const row = await pool.query(
    `UPDATE users SET
      email=$2, password_hash=$3, name=$4, role_id=$5,
      branch_id=$6, is_global_access=$7, is_active=$8, updated_at=NOW()
     WHERE id=$1 RETURNING *`,
    [
      id,
      String(data.email ?? c.email).toLowerCase(),
      passwordHash,
      data.name ?? c.name,
      data.roleId ?? c.role_id,
      branchId,
      data.isGlobalAccess ?? c.is_global_access,
      data.isActive ?? c.is_active,
    ]
  )
  return NextResponse.json({ user: mapUser(row.rows[0]) })
}
