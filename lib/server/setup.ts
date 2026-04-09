
import bcrypt from 'bcryptjs'
import { pool } from '@/lib/server/db'
import { DEMO_BRANCHES, DEMO_CATEGORIES, DEMO_CASH_REGISTERS, DEMO_CUSTOMERS, DEMO_PRODUCTS, DEMO_PRODUCT_STOCK, DEMO_ROLES, DEMO_USERS } from '@/lib/data/demo-data'

let initialized = false
const shouldSeedDemo = process.env.SEED_DEMO === 'true'

function json(v: unknown) {
  return JSON.stringify(v)
}

export async function ensureDatabaseSetup() {
  if (initialized) return

  await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      address TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT '',
      postal_code TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role_id TEXT NOT NULL REFERENCES roles(id),
      branch_id TEXT NULL REFERENCES branches(id),
      is_global_access BOOLEAN NOT NULL DEFAULT FALSE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      sku TEXT NOT NULL UNIQUE,
      barcode TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      category_id TEXT NOT NULL REFERENCES categories(id),
      sale_price NUMERIC(12,2) NOT NULL DEFAULT 0,
      purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0,
      tax_rate NUMERIC(12,2) NOT NULL DEFAULT 0,
      unit TEXT NOT NULL DEFAULT 'PZA',
      sat_key TEXT NOT NULL DEFAULT '',
      min_stock INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS product_stock (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(product_id, branch_id)
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      rfc TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      fiscal_address TEXT NOT NULL DEFAULT '',
      neighborhood TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT '',
      postal_code TEXT NOT NULL DEFAULT '',
      tax_regime TEXT NOT NULL DEFAULT '',
      cfdi_use TEXT NOT NULL DEFAULT '',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS cash_registers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      branch_id TEXT NOT NULL REFERENCES branches(id),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS cash_sessions (
      id TEXT PRIMARY KEY,
      cash_register_id TEXT NOT NULL REFERENCES cash_registers(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      branch_id TEXT NOT NULL REFERENCES branches(id),
      opening_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      closing_amount NUMERIC(12,2),
      expected_amount NUMERIC(12,2),
      difference NUMERIC(12,2),
      status TEXT NOT NULL DEFAULT 'open',
      notes TEXT NOT NULL DEFAULT '',
      opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      closed_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS cash_movements (
      id TEXT PRIMARY KEY,
      cash_session_id TEXT NOT NULL REFERENCES cash_sessions(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      description TEXT NOT NULL DEFAULT '',
      reference_id TEXT,
      user_id TEXT NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      folio TEXT NOT NULL UNIQUE,
      branch_id TEXT NOT NULL REFERENCES branches(id),
      cash_session_id TEXT NOT NULL REFERENCES cash_sessions(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      customer_id TEXT NULL REFERENCES customers(id),
      subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
      tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      discount_type TEXT NULL,
      discount_value NUMERIC(12,2) NULL,
      total NUMERIC(12,2) NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'completed',
      invoice_status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT NOT NULL DEFAULT '',
      cancelled_at TIMESTAMPTZ NULL,
      cancelled_by TEXT NULL,
      cancel_reason TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      product_name TEXT NOT NULL,
      product_sku TEXT NOT NULL,
      quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
      unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
      tax_rate NUMERIC(12,2) NOT NULL DEFAULT 0,
      tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
      total NUMERIC(12,2) NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sale_payments (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      method TEXT NOT NULL,
      amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      reference TEXT NOT NULL DEFAULT '',
      change_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS inventory_movements (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id),
      branch_id TEXT NOT NULL REFERENCES branches(id),
      from_branch_id TEXT NULL REFERENCES branches(id),
      to_branch_id TEXT NULL REFERENCES branches(id),
      type TEXT NOT NULL,
      quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
      reason TEXT NOT NULL DEFAULT '',
      reference_id TEXT,
      user_id TEXT NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)

  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM roles')
  if (rows[0]?.count > 0) {
    initialized = true
    return
  }

  if (!shouldSeedDemo) {
    initialized = true
    return
  }

  for (const role of DEMO_ROLES) {
    await pool.query(
      'INSERT INTO roles (id, name, label, permissions, created_at) VALUES ($1,$2,$3,$4,$5)',
      [role.id, role.name, role.label, json(role.permissions), role.createdAt]
    )
  }

  for (const branch of DEMO_BRANCHES) {
    await pool.query(
      `INSERT INTO branches (id, name, code, address, city, state, postal_code, phone, is_active, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [branch.id, branch.name, branch.code, branch.address, branch.city, branch.state, branch.postalCode, branch.phone, branch.isActive, branch.createdAt, branch.updatedAt]
    )
  }

  for (const user of DEMO_USERS) {
    const hash = await bcrypt.hash(user.passwordHash, 10)
    await pool.query(
      `INSERT INTO users (id, email, password_hash, name, role_id, branch_id, is_global_access, is_active, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [user.id, user.email.toLowerCase(), hash, user.name, user.roleId, user.branchId, user.isGlobalAccess, user.isActive, user.createdAt, user.updatedAt]
    )
  }

  for (const category of DEMO_CATEGORIES) {
    await pool.query(
      'INSERT INTO categories (id, name, description, is_active, created_at) VALUES ($1,$2,$3,$4,$5)',
      [category.id, category.name, category.description, category.isActive, category.createdAt]
    )
  }

  for (const product of DEMO_PRODUCTS) {
    await pool.query(
      `INSERT INTO products (id, sku, barcode, name, description, category_id, sale_price, purchase_price, tax_rate, unit, sat_key, min_stock, is_active, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [product.id, product.sku, product.barcode, product.name, product.description, product.categoryId, product.salePrice, product.purchasePrice, product.taxRate, product.unit, product.satKey, product.minStock, product.isActive, product.createdAt, product.updatedAt]
    )
  }

  for (const stock of DEMO_PRODUCT_STOCK) {
    await pool.query(
      'INSERT INTO product_stock (id, product_id, branch_id, quantity, updated_at) VALUES ($1,$2,$3,$4,$5)',
      [stock.id, stock.productId, stock.branchId, stock.quantity, stock.updatedAt]
    )
  }

  for (const customer of DEMO_CUSTOMERS) {
    await pool.query(
      `INSERT INTO customers (id, name, rfc, email, phone, fiscal_address, neighborhood, city, state, postal_code, tax_regime, cfdi_use, is_active, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [customer.id, customer.name, customer.rfc, customer.email, customer.phone, customer.fiscalAddress, customer.neighborhood, customer.city, customer.state, customer.postalCode, customer.taxRegime, customer.cfdiUse, customer.isActive, customer.createdAt, customer.updatedAt]
    )
  }

  for (const register of DEMO_CASH_REGISTERS) {
    await pool.query(
      'INSERT INTO cash_registers (id, name, branch_id, is_active, created_at) VALUES ($1,$2,$3,$4,$5)',
      [register.id, register.name, register.branchId, register.isActive, register.createdAt]
    )
  }

  initialized = true
}
