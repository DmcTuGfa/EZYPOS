import { NextResponse } from 'next/server'
import { ensureDatabaseSetup } from '@/lib/server/setup'
import { pool } from '@/lib/server/db'
import { mapProduct, mapProductStock } from '@/lib/server/mappers'

export async function GET() {
  await ensureDatabaseSetup()
  const [products, stock] = await Promise.all([
    pool.query('SELECT * FROM products WHERE is_active = true ORDER BY name'),
    pool.query('SELECT * FROM product_stock ORDER BY updated_at DESC'),
  ])
  return NextResponse.json({ products: products.rows.map(mapProduct), productStock: stock.rows.map(mapProductStock) })
}

export async function POST(request: Request) {
  await ensureDatabaseSetup()
  const data = await request.json()
  const id = data.id || crypto.randomUUID()
  const row = await pool.query(
    `INSERT INTO products (id, sku, barcode, name, description, category_id, sale_price, purchase_price, tax_rate, unit, sat_key, min_stock, is_active, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true,NOW(),NOW()) RETURNING *`,
    [id, data.sku, data.barcode || '', data.name, data.description || '', data.categoryId, data.salePrice || 0, data.purchasePrice || 0, data.taxRate || 0, data.unit || 'PZA', data.satKey || '', data.minStock || 0]
  )
  return NextResponse.json({ product: mapProduct(row.rows[0]) })
}
