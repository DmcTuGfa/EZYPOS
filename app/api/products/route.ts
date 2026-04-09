
import { NextResponse } from 'next/server'
import { ensureDatabaseSetup } from '@/lib/server/setup'
import { pool } from '@/lib/server/db'
import { mapProduct, mapProductStock } from '@/lib/server/mappers'

async function resolveCategoryId(inputCategoryId?: string | null) {
  if (inputCategoryId) return inputCategoryId
  const fallback = await pool.query('SELECT id FROM categories WHERE is_active = true ORDER BY name LIMIT 1')
  return fallback.rows[0]?.id ?? null
}

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
  const categoryId = await resolveCategoryId(data.categoryId ?? null)
  if (!categoryId) {
    return NextResponse.json({ error: 'No hay categorías disponibles. Crea una categoría primero.' }, { status: 400 })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const row = await client.query(
      `INSERT INTO products (id, sku, barcode, name, description, category_id, sale_price, purchase_price, tax_rate, unit, sat_key, min_stock, is_active, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),NOW()) RETURNING *`,
      [
        id,
        data.sku,
        data.barcode || '',
        data.name,
        data.description || '',
        categoryId,
        Number(data.salePrice || 0),
        Number(data.purchasePrice ?? data.costPrice ?? 0),
        Number(data.taxRate || 0),
        (data.unit || 'PZA').toUpperCase(),
        data.satKey ?? data.satCode ?? '',
        Number(data.minStock || 0),
        data.isActive ?? true,
      ]
    )

    if (data.branchId && data.initialStock != null) {
      await client.query(
        `INSERT INTO product_stock (id, product_id, branch_id, quantity, updated_at)
         VALUES ($1,$2,$3,$4,NOW())
         ON CONFLICT (product_id, branch_id)
         DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = NOW()`,
        [crypto.randomUUID(), id, data.branchId, Number(data.initialStock || 0)]
      )
    }

    await client.query('COMMIT')
    return NextResponse.json({ product: mapProduct(row.rows[0]) })
  } catch (error: any) {
    await client.query('ROLLBACK')
    const message = error?.code === '23505' ? 'Ya existe un producto con ese SKU' : 'No se pudo guardar el producto'
    return NextResponse.json({ error: message }, { status: 400 })
  } finally {
    client.release()
  }
}
