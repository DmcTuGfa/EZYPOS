
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { ensureDatabaseSetup } from '@/lib/server/setup'
import { pool } from '@/lib/server/db'
import { mapUser } from '@/lib/server/mappers'
export async function GET() { await ensureDatabaseSetup(); const res = await pool.query('SELECT * FROM users ORDER BY created_at DESC'); return NextResponse.json({ users: res.rows.map(mapUser) }) }
export async function POST(request: Request) { await ensureDatabaseSetup(); const data = await request.json(); const id = data.id || crypto.randomUUID(); const passwordHash = data.passwordHash ? await bcrypt.hash(data.passwordHash, 10) : await bcrypt.hash('123456', 10); const row = await pool.query(`INSERT INTO users (id, email, password_hash, name, role_id, branch_id, is_global_access, is_active, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW()) RETURNING *`, [id, String(data.email || '').toLowerCase(), passwordHash, data.name, data.roleId, data.branchId || null, data.isGlobalAccess || false, data.isActive ?? true]); return NextResponse.json({ user: mapUser(row.rows[0]) }) }
