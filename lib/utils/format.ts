// ===========================================
// UTILIDADES DE FORMATO
// ===========================================

/**
 * Formatea un número como moneda mexicana (MXN)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Formatea un número con separadores de miles
 */
export function formatNumber(num: number, decimals = 0): string {
  return new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)
}

/**
 * Formatea un porcentaje
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`
}

/**
 * Formatea una fecha en formato corto
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

/**
 * Formatea una fecha con hora
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

/**
 * Formatea solo la hora
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

/**
 * Formatea una fecha en formato largo
 */
export function formatDateLong(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
}

/**
 * Formatea un RFC mexicano (añade guiones para mejor legibilidad)
 */
export function formatRFC(rfc: string): string {
  if (!rfc) return ''
  // RFCs de personas morales tienen 12 caracteres, físicas 13
  return rfc.toUpperCase()
}

/**
 * Formatea un código postal mexicano
 */
export function formatPostalCode(cp: string): string {
  if (!cp) return ''
  return cp.padStart(5, '0')
}

/**
 * Formatea un número de teléfono mexicano
 */
export function formatPhone(phone: string): string {
  if (!phone) return ''
  // Eliminar todo excepto números
  const cleaned = phone.replace(/\D/g, '')
  
  // Formato: XX XXXX XXXX o XXX XXX XXXX
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 6)} ${cleaned.slice(6)}`
  }
  
  return phone
}

/**
 * Trunca un texto si excede el límite
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 3)}...`
}

/**
 * Capitaliza la primera letra de cada palabra
 */
export function capitalizeWords(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Genera un folio con formato específico
 */
export function generateFolio(prefix: string, number: number, padding = 6): string {
  return `${prefix}-${String(number).padStart(padding, '0')}`
}

/**
 * Obtiene las iniciales de un nombre
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n.charAt(0).toUpperCase())
    .join('')
}

/**
 * Formatea el método de pago para mostrar
 */
export function formatPaymentMethod(method: string): string {
  const methods: Record<string, string> = {
    cash: 'Efectivo',
    card: 'Tarjeta',
    transfer: 'Transferencia',
    voucher: 'Vales',
  }
  return methods[method] || method
}

/**
 * Formatea el estado de una venta
 */
export function formatSaleStatus(status: string): string {
  const statuses: Record<string, string> = {
    completed: 'Completada',
    cancelled: 'Cancelada',
    invoiced: 'Facturada',
  }
  return statuses[status] || status
}

/**
 * Formatea el estado de facturación
 */
export function formatInvoiceStatus(status: string): string {
  const statuses: Record<string, string> = {
    pending: 'Pendiente',
    invoiced: 'Facturada',
    not_required: 'No requiere',
    stamped: 'Timbrada',
    cancelled: 'Cancelada',
  }
  return statuses[status] || status
}

/**
 * Formatea el tipo de movimiento de inventario
 */
export function formatMovementType(type: string): string {
  const types: Record<string, string> = {
    entry: 'Entrada',
    exit: 'Salida',
    adjustment: 'Ajuste',
    transfer: 'Traspaso',
    sale: 'Venta',
    return: 'Devolución',
  }
  return types[type] || type
}

/**
 * Formatea el rol de usuario
 */
export function formatUserRole(role: string): string {
  const roles: Record<string, string> = {
    admin: 'Administrador',
    branch_admin: 'Admin. Sucursal',
    supervisor: 'Supervisor',
    cashier: 'Cajero',
  }
  return roles[role] || role
}
