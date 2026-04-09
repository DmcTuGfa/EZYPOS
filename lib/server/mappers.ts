
import type { Branch, CashMovement, CashRegister, CashSession, Category, Customer, Product, ProductStock, Role, Sale, SaleItem, SalePayment, User } from '@/lib/types'

const d = (value: string | Date | null) => value ? new Date(value) : null
const n = (value: unknown) => Number(value || 0)

export function mapRole(r: any): Role {
  return { id: r.id, name: r.name, label: r.label, permissions: Array.isArray(r.permissions) ? r.permissions : JSON.parse(r.permissions || '[]'), createdAt: new Date(r.created_at) }
}
export function mapBranch(r: any): Branch {
  return { id:r.id, name:r.name, code:r.code, address:r.address||'', city:r.city||'', state:r.state||'', postalCode:r.postal_code||'', phone:r.phone||'', isActive:r.is_active, createdAt:new Date(r.created_at), updatedAt:new Date(r.updated_at) }
}
export function mapUser(r: any): User {
  return { id:r.id, email:r.email, passwordHash:r.password_hash||'', name:r.name, roleId:r.role_id, branchId:r.branch_id, isGlobalAccess:r.is_global_access, isActive:r.is_active, createdAt:new Date(r.created_at), updatedAt:new Date(r.updated_at) }
}
export function mapCategory(r: any): Category {
  return { id:r.id, name:r.name, description:r.description||'', isActive:r.is_active, createdAt:new Date(r.created_at) }
}
export function mapProduct(r: any): Product {
  return { id:r.id, sku:r.sku, barcode:r.barcode||'', name:r.name, description:r.description||'', categoryId:r.category_id, salePrice:n(r.sale_price), purchasePrice:n(r.purchase_price), taxRate:n(r.tax_rate), unit:r.unit, satKey:r.sat_key||'', minStock:Number(r.min_stock||0), isActive:r.is_active, createdAt:new Date(r.created_at), updatedAt:new Date(r.updated_at) }
}
export function mapProductStock(r: any): ProductStock {
  return { id:r.id, productId:r.product_id, branchId:r.branch_id, quantity:n(r.quantity), updatedAt:new Date(r.updated_at) }
}
export function mapCustomer(r: any): Customer {
  return { id:r.id, name:r.name, rfc:r.rfc||'', email:r.email||'', phone:r.phone||'', fiscalAddress:r.fiscal_address||'', neighborhood:r.neighborhood||'', city:r.city||'', state:r.state||'', postalCode:r.postal_code||'', taxRegime:r.tax_regime||'', cfdiUse:r.cfdi_use||'', isActive:r.is_active, createdAt:new Date(r.created_at), updatedAt:new Date(r.updated_at) }
}
export function mapCashRegister(r: any): CashRegister {
  return { id:r.id, name:r.name, branchId:r.branch_id, isActive:r.is_active, createdAt:new Date(r.created_at) }
}
export function mapCashSession(r: any): CashSession {
  return { id:r.id, cashRegisterId:r.cash_register_id, userId:r.user_id, branchId:r.branch_id, openingAmount:n(r.opening_amount), closingAmount:r.closing_amount==null?null:n(r.closing_amount), expectedAmount:r.expected_amount==null?null:n(r.expected_amount), difference:r.difference==null?null:n(r.difference), status:r.status, notes:r.notes||'', openedAt:new Date(r.opened_at), closedAt:d(r.closed_at) }
}
export function mapCashMovement(r: any): CashMovement {
  return { id:r.id, cashSessionId:r.cash_session_id, type:r.type, amount:n(r.amount), description:r.description||'', referenceId:r.reference_id, userId:r.user_id, createdAt:new Date(r.created_at) }
}
export function mapSale(r: any): Sale {
  return { id:r.id, folio:r.folio, branchId:r.branch_id, cashSessionId:r.cash_session_id, userId:r.user_id, customerId:r.customer_id, subtotal:n(r.subtotal), taxAmount:n(r.tax_amount), discountAmount:n(r.discount_amount), discountType:r.discount_type, discountValue:r.discount_value==null?null:n(r.discount_value), total:n(r.total), status:r.status, invoiceStatus:r.invoice_status, notes:r.notes||'', cancelledAt:d(r.cancelled_at), cancelledBy:r.cancelled_by, cancelReason:r.cancel_reason||'', createdAt:new Date(r.created_at), paymentMethod:r.payment_method } as Sale & { paymentMethod?: string }
}
export function mapSaleItem(r: any): SaleItem {
  return { id:r.id, saleId:r.sale_id, productId:r.product_id, productName:r.product_name, productSku:r.product_sku, quantity:n(r.quantity), unitPrice:n(r.unit_price), taxRate:n(r.tax_rate), taxAmount:n(r.tax_amount), discountAmount:n(r.discount_amount), subtotal:n(r.subtotal), total:n(r.total) }
}
export function mapSalePayment(r: any): SalePayment {
  return { id:r.id, saleId:r.sale_id, method:r.method, amount:n(r.amount), reference:r.reference||'', changeAmount:n(r.change_amount), createdAt:new Date(r.created_at) }
}
