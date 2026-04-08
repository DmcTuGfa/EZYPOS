// ===========================================
// TIPOS BASE DEL SISTEMA POS VENTAMX
// ===========================================

// --- ENUMS Y CONSTANTES ---

export type UserRole = 'admin' | 'branch_admin' | 'supervisor' | 'cashier'

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'voucher'

export type SaleStatus = 'completed' | 'cancelled' | 'invoiced'

export type InvoiceStatus = 'pending' | 'invoiced' | 'not_required'

export type CashSessionStatus = 'open' | 'closed'

export type MovementType = 'entry' | 'exit' | 'adjustment' | 'transfer' | 'sale' | 'return'

export type CashMovementType = 'sale' | 'withdrawal' | 'deposit' | 'return'

export type DiscountType = 'percentage' | 'fixed'

export type InvoiceFiscalStatus = 'pending' | 'stamped' | 'cancelled'

// --- INTERFACES PRINCIPALES ---

export interface Role {
  id: string
  name: string
  label: string
  permissions: string[]
  createdAt: Date
}

export interface User {
  id: string
  email: string
  passwordHash: string
  name: string
  roleId: string
  role?: Role
  branchId: string | null
  branch?: Branch
  isGlobalAccess: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Branch {
  id: string
  name: string
  code: string
  address: string
  city: string
  state: string
  postalCode: string
  phone: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Category {
  id: string
  name: string
  description: string
  isActive: boolean
  createdAt: Date
}

export interface Product {
  id: string
  sku: string
  barcode: string
  name: string
  description: string
  categoryId: string
  category?: Category
  salePrice: number
  purchasePrice: number
  taxRate: number
  unit: string
  satKey: string
  minStock: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ProductStock {
  id: string
  productId: string
  branchId: string
  quantity: number
  updatedAt: Date
}

export interface InventoryMovement {
  id: string
  productId: string
  product?: Product
  branchId: string
  branch?: Branch
  fromBranchId: string | null
  toBranchId: string | null
  type: MovementType
  quantity: number
  reason: string
  referenceId: string | null
  userId: string
  user?: User
  createdAt: Date
}

export interface Customer {
  id: string
  name: string
  rfc: string
  email: string
  phone: string
  fiscalAddress: string
  neighborhood: string
  city: string
  state: string
  postalCode: string
  taxRegime: string
  cfdiUse: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CashRegister {
  id: string
  name: string
  branchId: string
  branch?: Branch
  isActive: boolean
  createdAt: Date
}

export interface CashSession {
  id: string
  cashRegisterId: string
  cashRegister?: CashRegister
  userId: string
  user?: User
  branchId: string
  branch?: Branch
  openingAmount: number
  closingAmount: number | null
  expectedAmount: number | null
  difference: number | null
  status: CashSessionStatus
  notes: string
  openedAt: Date
  closedAt: Date | null
}

export interface CashMovement {
  id: string
  cashSessionId: string
  type: CashMovementType
  amount: number
  description: string
  referenceId: string | null
  userId: string
  user?: User
  createdAt: Date
}

export interface Sale {
  id: string
  folio: string
  branchId: string
  branch?: Branch
  cashSessionId: string
  cashSession?: CashSession
  userId: string
  user?: User
  customerId: string | null
  customer?: Customer
  subtotal: number
  taxAmount: number
  discountAmount: number
  discountType: DiscountType | null
  discountValue: number | null
  total: number
  status: SaleStatus
  invoiceStatus: InvoiceStatus
  notes: string
  cancelledAt: Date | null
  cancelledBy: string | null
  cancelReason: string
  createdAt: Date
  items?: SaleItem[]
  payments?: SalePayment[]
}

export interface SaleItem {
  id: string
  saleId: string
  productId: string
  product?: Product
  productName: string
  productSku: string
  quantity: number
  unitPrice: number
  taxRate: number
  taxAmount: number
  discountAmount: number
  subtotal: number
  total: number
}

export interface SalePayment {
  id: string
  saleId: string
  method: PaymentMethod
  amount: number
  reference: string
  changeAmount: number
  createdAt: Date
}

export interface Invoice {
  id: string
  saleId: string
  sale?: Sale
  internalFolio: string
  uuid: string | null
  customerId: string
  customer?: Customer
  issuerRfc: string
  issuerName: string
  issuerRegime: string
  issuerPostalCode: string
  receiverRfc: string
  receiverName: string
  receiverRegime: string
  receiverPostalCode: string
  cfdiUse: string
  subtotal: number
  taxAmount: number
  total: number
  status: InvoiceFiscalStatus
  xmlContent: string | null
  pdfUrl: string | null
  stampedAt: Date | null
  cancelledAt: Date | null
  cancelReason: string
  createdAt: Date
}

export interface Settings {
  id: string
  key: string
  value: Record<string, unknown>
  updatedAt: Date
}

export interface BusinessSettings {
  businessName: string
  logo: string
  rfc: string
  taxRegime: string
  postalCode: string
  address: string
  phone: string
  email: string
  defaultTaxRate: number
  currency: string
  ticketFooter: string
  invoiceSeries: string
  currentInvoiceFolio: number
  saleSeries: string
  currentSaleFolio: number
}

export interface AuditLog {
  id: string
  userId: string
  user?: User
  action: string
  entityType: string
  entityId: string | null
  oldValues: Record<string, unknown> | null
  newValues: Record<string, unknown> | null
  ipAddress: string
  createdAt: Date
}

// --- TIPOS DE CARRITO ---

export interface CartItem {
  productId: string
  product: Product
  quantity: number
  unitPrice: number
  taxRate: number
  discountAmount: number
}

export interface CartDiscount {
  type: DiscountType
  value: number
}

// --- TIPOS DE AUTH ---

export interface AuthUser {
  id: string
  email: string
  name: string
  role: Role
  branch: Branch | null
  isGlobalAccess: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}

// --- TIPOS DE REPORTES ---

export interface DailySalesReport {
  date: string
  totalSales: number
  totalAmount: number
  totalTax: number
  totalDiscount: number
  byPaymentMethod: Record<PaymentMethod, number>
  byBranch: Record<string, number>
}

export interface ProductSalesReport {
  productId: string
  productName: string
  productSku: string
  quantitySold: number
  totalAmount: number
}

// --- REGIMENES FISCALES SAT ---

export const TAX_REGIMES = [
  { code: '601', name: 'General de Ley Personas Morales' },
  { code: '603', name: 'Personas Morales con Fines no Lucrativos' },
  { code: '605', name: 'Sueldos y Salarios e Ingresos Asimilados a Salarios' },
  { code: '606', name: 'Arrendamiento' },
  { code: '607', name: 'Régimen de Enajenación o Adquisición de Bienes' },
  { code: '608', name: 'Demás ingresos' },
  { code: '610', name: 'Residentes en el Extranjero sin Establecimiento Permanente en México' },
  { code: '611', name: 'Ingresos por Dividendos (socios y accionistas)' },
  { code: '612', name: 'Personas Físicas con Actividades Empresariales y Profesionales' },
  { code: '614', name: 'Ingresos por intereses' },
  { code: '615', name: 'Régimen de los ingresos por obtención de premios' },
  { code: '616', name: 'Sin obligaciones fiscales' },
  { code: '620', name: 'Sociedades Cooperativas de Producción' },
  { code: '621', name: 'Incorporación Fiscal' },
  { code: '622', name: 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras' },
  { code: '623', name: 'Opcional para Grupos de Sociedades' },
  { code: '624', name: 'Coordinados' },
  { code: '625', name: 'Régimen de las Actividades Empresariales con ingresos por Plataformas' },
  { code: '626', name: 'Régimen Simplificado de Confianza' },
] as const

// --- USOS DE CFDI ---

export const CFDI_USES = [
  { code: 'G01', name: 'Adquisición de mercancías' },
  { code: 'G02', name: 'Devoluciones, descuentos o bonificaciones' },
  { code: 'G03', name: 'Gastos en general' },
  { code: 'I01', name: 'Construcciones' },
  { code: 'I02', name: 'Mobiliario y equipo de oficina por inversiones' },
  { code: 'I03', name: 'Equipo de transporte' },
  { code: 'I04', name: 'Equipo de computo y accesorios' },
  { code: 'I05', name: 'Dados, troqueles, moldes, matrices y herramental' },
  { code: 'I06', name: 'Comunicaciones telefónicas' },
  { code: 'I07', name: 'Comunicaciones satelitales' },
  { code: 'I08', name: 'Otra maquinaria y equipo' },
  { code: 'D01', name: 'Honorarios médicos, dentales y gastos hospitalarios' },
  { code: 'D02', name: 'Gastos médicos por incapacidad o discapacidad' },
  { code: 'D03', name: 'Gastos funerales' },
  { code: 'D04', name: 'Donativos' },
  { code: 'D05', name: 'Intereses reales efectivamente pagados por créditos hipotecarios' },
  { code: 'D06', name: 'Aportaciones voluntarias al SAR' },
  { code: 'D07', name: 'Primas por seguros de gastos médicos' },
  { code: 'D08', name: 'Gastos de transportación escolar obligatoria' },
  { code: 'D09', name: 'Depósitos en cuentas para el ahorro' },
  { code: 'D10', name: 'Pagos por servicios educativos (colegiaturas)' },
  { code: 'P01', name: 'Por definir' },
  { code: 'S01', name: 'Sin efectos fiscales' },
  { code: 'CP01', name: 'Pagos' },
  { code: 'CN01', name: 'Nómina' },
] as const

// --- ESTADOS DE MÉXICO ---

export const MEXICAN_STATES = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche',
  'Chiapas', 'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima',
  'Durango', 'Estado de México', 'Guanajuato', 'Guerrero', 'Hidalgo',
  'Jalisco', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca',
  'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa',
  'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'
] as const

// --- UNIDADES DE MEDIDA ---

export const UNITS_OF_MEASURE = [
  { code: 'PZA', name: 'Pieza' },
  { code: 'KG', name: 'Kilogramo' },
  { code: 'LT', name: 'Litro' },
  { code: 'MT', name: 'Metro' },
  { code: 'CJA', name: 'Caja' },
  { code: 'PAQ', name: 'Paquete' },
  { code: 'SRV', name: 'Servicio' },
  { code: 'HR', name: 'Hora' },
] as const
