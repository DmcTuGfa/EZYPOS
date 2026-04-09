import { NextResponse } from 'next/server'
import { ensureDatabaseSetup } from '@/lib/server/setup'
import { pool } from '@/lib/server/db'
import { mapCategory } from '@/lib/server/mappers'

export async function GET() {
  await ensureDatabaseSetup()
  const res = await pool.query('SELECT * FROM categories WHERE is_active = true ORDER BY name')
  return NextResponse.json({ categories: res.rows.map(mapCategory) })
}
