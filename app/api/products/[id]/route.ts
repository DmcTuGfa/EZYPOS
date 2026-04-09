
import { NextResponse } from 'next/server'
import { ensureDatabaseSetup } from '@/lib/server/setup'
import { pool } from '@/lib/server/db'
import { mapProduct } from '@/lib/server/mappers'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureDatabaseSetup()
  const { id } = await params
  const res = await pool.query('SELECT * FROM products WHERE id = $1 LIMIT 1', [id])
  if (!res.rows[0]) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
  return NextResponse.json({ product: mapProduct(res.rows[0]) })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureDatabaseSetup()
  const { id } = await params
  const data = await request.json()
  const current = await pool.query('SELECT * FROM products WHERE id = $1', [id])
  if (!current.rows[0]) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
  const c = current.rows[0]
  const row = await pool.query(
    `UPDATE products SET sku=$2, barcode=$3, name=$4, description=$5, category_id=$6, sale_price=$7, purchase_price=$8, tax_rate=$9, unit=$10, sat_key=$11, min_stock=$12, is_active=$13, updated_at=NOW() WHERE id=$1 RETURNING *`,
    [
      id,
      data.sku ?? c.sku,
      data.barcode ?? c.barcode,
      data.name ?? c.name,
      data.description ?? c.description,
      data.categoryId ?? c.category_id,
      Number(data.salePrice ?? c.sale_price),
      Number(data.purchasePrice ?? data.costPrice ?? c.purchase_price),
      Number(data.taxRate ?? c.tax_rate),
      (data.unit ?? c.unit ?? 'PZA').toUpperCase(),
      data.satKey ?? data.satCode ?? c.sat_key,
      Number(data.minStock ?? c.min_stock),
      data.isActive ?? c.is_active,
    ]
  )
  return NextResponse.json({ product: mapProduct(row.rows[0]) })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureDatabaseSetup()
  const { id } = await params
  await pool.query('UPDATE products SET is_active=false, updated_at=NOW() WHERE id=$1', [id])
  return NextResponse.json({ ok: true })
}
