import { NextResponse } from 'next/server'
import { ensureDatabaseSetup } from '@/lib/server/setup'
import { pool } from '@/lib/server/db'
import { mapBranch, mapCashMovement, mapCashRegister, mapCashSession, mapCategory, mapCustomer, mapProduct, mapProductStock, mapRole, mapSale, mapSaleItem, mapSalePayment, mapUser } from '@/lib/server/mappers'

export async function GET() {
  await ensureDatabaseSetup()
  const [roles, users, branches, categories, products, productStock, customers, cashRegisters, cashSessions, cashMovements, sales, saleItems, salePayments, inventoryMovements] = await Promise.all([
    pool.query('SELECT * FROM roles ORDER BY label'),
    pool.query('SELECT * FROM users ORDER BY created_at'),
    pool.query('SELECT * FROM branches WHERE is_active = true ORDER BY name'),
    pool.query('SELECT * FROM categories WHERE is_active = true ORDER BY name'),
    pool.query('SELECT * FROM products WHERE is_active = true ORDER BY name'),
    pool.query('SELECT * FROM product_stock ORDER BY updated_at DESC'),
    pool.query('SELECT * FROM customers WHERE is_active = true ORDER BY name'),
    pool.query('SELECT * FROM cash_registers WHERE is_active = true ORDER BY name'),
    pool.query('SELECT * FROM cash_sessions ORDER BY opened_at DESC LIMIT 200'),
    pool.query('SELECT * FROM cash_movements ORDER BY created_at DESC LIMIT 500'),
    pool.query(`SELECT s.*, COALESCE((SELECT sp.method FROM sale_payments sp WHERE sp.sale_id = s.id ORDER BY sp.created_at ASC LIMIT 1), 'mixed') as payment_method FROM sales s ORDER BY created_at DESC LIMIT 500`),
    pool.query('SELECT * FROM sale_items ORDER BY id DESC LIMIT 2000'),
    pool.query('SELECT * FROM sale_payments ORDER BY created_at DESC LIMIT 2000'),
    pool.query('SELECT * FROM inventory_movements ORDER BY created_at DESC LIMIT 1000'),
  ])

  return NextResponse.json({
    roles: roles.rows.map(mapRole),
    users: users.rows.map(mapUser),
    branches: branches.rows.map(mapBranch),
    categories: categories.rows.map(mapCategory),
    products: products.rows.map(mapProduct),
    productStock: productStock.rows.map(mapProductStock),
    customers: customers.rows.map(mapCustomer),
    cashRegisters: cashRegisters.rows.map(mapCashRegister),
    cashSessions: cashSessions.rows.map(mapCashSession),
    cashMovements: cashMovements.rows.map(mapCashMovement),
    sales: sales.rows.map(mapSale),
    saleItems: saleItems.rows.map(mapSaleItem),
    salePayments: salePayments.rows.map(mapSalePayment),
    inventoryMovements: inventoryMovements.rows,
  })
}
