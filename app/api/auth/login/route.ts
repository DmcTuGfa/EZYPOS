import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { ensureDatabaseSetup } from '@/lib/server/setup'
import { pool } from '@/lib/server/db'
import { mapBranch, mapRole } from '@/lib/server/mappers'

export async function POST(request: Request) {
  await ensureDatabaseSetup()
  const { email, password } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Correo y contraseña son obligatorios' }, { status: 400 })
  }

  const userRes = await pool.query('SELECT * FROM users WHERE lower(email) = lower($1) LIMIT 1', [email])
  const user = userRes.rows[0]
  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  if (!user.is_active) return NextResponse.json({ error: 'Usuario inactivo' }, { status: 403 })

  const ok = await bcrypt.compare(password, user.password_hash)
  if (!ok) return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 })

  const roleRes = await pool.query('SELECT * FROM roles WHERE id = $1', [user.role_id])
  const branchRes = user.branch_id ? await pool.query('SELECT * FROM branches WHERE id = $1', [user.branch_id]) : { rows: [] as any[] }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: mapRole(roleRes.rows[0]),
      branch: branchRes.rows[0] ? mapBranch(branchRes.rows[0]) : null,
      isGlobalAccess: user.is_global_access,
    },
  })
}
