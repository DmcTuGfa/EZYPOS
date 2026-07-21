/**
 * Configuración de marca y módulos del sistema.
 * Los valores por defecto se usan mientras el negocio no personalice nada.
 */

export interface AppSettings {
  /** Nombre que se muestra en el login, el menú y los comprobantes */
  businessName: string
  /** Frase corta debajo del nombre en la pantalla de inicio */
  tagline: string
  /** Logo en formato data URL o enlace público. Vacío = se usa el ícono por defecto */
  logoUrl: string
  /** Mensaje al pie de los comprobantes */
  ticketFooter: string
  /** Módulo de facturación CFDI (desactivado hasta conectar un PAC real) */
  invoicingEnabled: boolean
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  businessName: 'EZYPOS',
  tagline: 'Sistema de Punto de Venta',
  logoUrl: '',
  ticketFooter: '¡Gracias por su compra!',
  invoicingEnabled: false,
}
