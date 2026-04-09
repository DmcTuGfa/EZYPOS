
import { NextResponse } from 'next/server'
import { ensureDatabaseSetup } from '@/lib/server/setup'
import { pool } from '@/lib/server/db'
import { mapProductStock } from '@/lib/server/mappers'
export async function GET(request: Request) { await ensureDatabaseSetup(); const { searchParams } = new URL(request.url); const branchId = searchParams.get('branchId'); const res = branchId ? await pool.query('SELECT * FROM product_stock WHERE branch_id = $1 ORDER BY updated_at DESC', [branchId]) : await pool.query('SELECT * FROM product_stock ORDER BY updated_at DESC'); return NextResponse.json({ productStock: res.rows.map(mapProductStock) }) }
