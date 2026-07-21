import { NextResponse } from 'next/server'
import { ensureDatabaseSetup } from '@/lib/server/setup'
import { pool } from '@/lib/server/db'
import { mapBranch } from '@/lib/server/mappers'

/** Cuenta la información asociada a una sucursal para decidir si se puede borrar */
async function getBranchUsage(id: string) {
  const [sales, sessions, movements, registers, users, stock, payments] = await Promise.all([
    pool.query('SELECT COUNT(*)::int AS count FROM sales WHERE branch_id = $1', [id]),
    pool.query('SELECT COUNT(*)::int AS count FROM cash_sessions WHERE branch_id = $1', [id]),
    pool.query(
      'SELECT COUNT(*)::int AS count FROM inventory_movements WHERE branch_id = $1 OR from_branch_id = $1 OR to_branch_id = $1',
      [id]
    ),
    pool.query('SELECT COUNT(*)::int AS count FROM cash_registers WHERE branch_id = $1', [id]),
    pool.query('SELECT COUNT(*)::int AS count FROM users WHERE branch_id = $1', [id]),
    pool.query(
      'SELECT COUNT(*)::int AS count FROM product_stock WHERE branch_id = $1 AND quantity <> 0',
      [id]
    ),
    pool
      .query('SELECT COUNT(*)::int AS count FROM customer_payments WHERE branch_id = $1', [id])
      .catch(() => ({ rows: [{ count: 0 }] })),
  ])

  const usage = {
    sales: sales.rows[0]?.count || 0,
    cashSessions: sessions.rows[0]?.count || 0,
    inventoryMovements: movements.rows[0]?.count || 0,
    cashRegisters: registers.rows[0]?.count || 0,
    users: users.rows[0]?.count || 0,
    stock: stock.rows[0]?.count || 0,
    customerPayments: payments.rows[0]?.count || 0,
  }

  // Las cajas registradoras vacías no bloquean el borrado; todo lo demás sí
  const hasData =
    usage.sales > 0 ||
    usage.cashSessions > 0 ||
    usage.inventoryMovements > 0 ||
    usage.users > 0 ||
    usage.stock > 0 ||
    usage.customerPayments > 0

  return { usage, hasData }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureDatabaseSetup()
  const { id } = await params
  const branch = await pool.query('SELECT * FROM branches WHERE id = $1', [id])
  if (!branch.rows[0]) return NextResponse.json({ error: 'Sucursal no encontrada' }, { status: 404 })
  const { usage, hasData } = await getBranchUsage(id)
  return NextResponse.json({ branch: mapBranch(branch.rows[0]), usage, hasData })
}

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

/**
 * DELETE ?mode=deactivate (por defecto) → solo marca la sucursal como inactiva.
 * DELETE ?mode=permanent → borra la sucursal, pero SOLO si no tiene información asociada.
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureDatabaseSetup()
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode') || 'deactivate'

  const branch = await pool.query('SELECT * FROM branches WHERE id = $1', [id])
  if (!branch.rows[0]) return NextResponse.json({ error: 'Sucursal no encontrada' }, { status: 404 })

  const activeCount = await pool.query('SELECT COUNT(*)::int AS count FROM branches WHERE is_active = true')
  if ((activeCount.rows[0]?.count || 0) <= 1 && branch.rows[0].is_active) {
    return NextResponse.json(
      { error: 'No puedes eliminar la única sucursal activa. Crea otra antes de continuar.' },
      { status: 409 }
    )
  }

  const { usage, hasData } = await getBranchUsage(id)

  if (mode !== 'permanent') {
    await pool.query('UPDATE branches SET is_active=false, updated_at=NOW() WHERE id=$1', [id])
    return NextResponse.json({ ok: true, mode: 'deactivated', usage })
  }

  if (hasData) {
    return NextResponse.json(
      {
        error: 'Esta sucursal tiene información registrada, solo puede desactivarse para no perder datos.',
        usage,
        hasData,
      },
      { status: 409 }
    )
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('DELETE FROM product_stock WHERE branch_id = $1', [id])
    await client.query('DELETE FROM cash_registers WHERE branch_id = $1', [id])
    await client.query('DELETE FROM branches WHERE id = $1', [id])
    await client.query('COMMIT')
    return NextResponse.json({ ok: true, mode: 'deleted' })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error(error)
    return NextResponse.json(
      { error: 'No se pudo eliminar la sucursal. Puedes desactivarla para conservar la información.' },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}
