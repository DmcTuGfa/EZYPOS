# Cambios aplicados a EZYPOS

## 1. Pantalla de inicio de sesión
- Se eliminó por completo la tarjeta de **Usuarios de Demostración** y la función `handleDemoLogin`.
- Ahora el acceso es únicamente con correo y contraseña de usuarios reales.

**Archivo:** `app/login/page.tsx`

---

## 2. Historial de cortes de caja (responsivo)
- En **celular** el historial ahora se muestra en tarjetas (caja, apertura, cierre, monto inicial, esperado, contado, diferencia y notas), sin scroll horizontal.
- En **escritorio** se conserva la tabla, ahora con la columna "Esperado" y montos alineados a la derecha.
- Se agregó el botón **Comprobantes del turno**, que abre la lista de ventas de la caja abierta con enlace/WhatsApp para cada ticket (útil cuando no se imprimió).

**Archivo:** `app/(auth)/cash-register/page.tsx`

---

## 3. Abonos de clientes + comprobante digital

### Base de datos
Nueva tabla `customer_payments` (se crea automáticamente al arrancar, no afecta datos existentes):

| Campo | Descripción |
|---|---|
| `folio` | Consecutivo `AB-000001` |
| `customer_id`, `branch_id`, `user_id` | Cliente, sucursal y quién lo cobró |
| `cash_session_id` | Caja donde entró (si fue efectivo) |
| `concept` | Ej. "Apartado de refrigerador" |
| `amount` | Monto del abono |
| `total_amount` | Total acordado (opcional, para calcular saldo) |
| `method`, `reference`, `notes`, `status` | Forma de pago y datos extra |

**Archivos:** `lib/server/setup.ts`, `lib/types/index.ts`, `lib/server/mappers.ts`

### API
- `GET/POST /api/customer-payments`
- `GET/PATCH /api/customer-payments/[id]`

> Si el abono es en **efectivo** y hay caja abierta, se registra automáticamente como **depósito** en el corte del turno.

### Pantalla de Clientes
- Botón **Abonar** por cliente (monto, concepto, total acordado, forma de pago, referencia, notas).
- Al guardar, aparece el comprobante con botones de **WhatsApp / Ver / Copiar enlace**.
- Botón **Abonos**: historial por cliente, cada uno con su enlace de comprobante.
- Columna con el total abonado por cliente.
- Vista en tarjetas para celular y tabla para escritorio.

**Bug corregido:** el formulario guardaba `address`, `colony`, `zipCode`, `regimenFiscal`, `usoCfdi`, pero la API espera `fiscalAddress`, `neighborhood`, `postalCode`, `taxRegime`, `cfdiUse`. **Los datos fiscales nunca se estaban guardando.** Ya quedó alineado.

**Archivo:** `app/(auth)/customers/page.tsx`

---

## 4. Comprobantes digitales (tickets con enlace)

Dos páginas públicas, sin sidebar, con formato de ticket de 80 mm:

- `/ticket/venta/[id]` — comprobante de venta (productos, subtotal, IVA, descuento, total, pagos, cambio).
- `/ticket/abono/[id]` — comprobante de abono (concepto, monto, total acordado, abonado acumulado, saldo pendiente).

Ambos incluyen: **Enviar por WhatsApp**, **Imprimir**, **Descargar PDF**, **Copiar enlace** y **Compartir**.

- El botón de WhatsApp usa el teléfono del cliente si lo tiene (agrega la lada 52 a números de 10 dígitos); si no, abre el selector de contacto.
- "Descargar PDF" usa el diálogo de impresión del navegador → *Guardar como PDF*.

**Archivos nuevos:**
- `app/ticket/layout.tsx`
- `app/ticket/venta/[id]/page.tsx`
- `app/ticket/abono/[id]/page.tsx`
- `components/ticket/ticket-actions.tsx`
- `components/ticket/ticket-paper.tsx`
- `components/ticket/ticket-link-buttons.tsx`
- Estilos de impresión en `app/globals.css`

### Dónde aparecen los enlaces
- **Clientes** → al registrar un abono y en el historial de abonos.
- **Historial de ventas** → botón por venta (móvil y escritorio) y dentro del detalle.
- **Detalle de venta** (`/sales/[id]`).
- **Punto de Venta** → el aviso "Ver ticket" al terminar la venta abre el comprobante.
- **Corte de caja** → "Comprobantes del turno".

---

## 5. Reporte de Ingresos y Egresos de productos

Nueva pantalla en **Administración → Ingresos y Egresos** (`/reports/products`).

Por producto muestra:
- **Entradas**: piezas recibidas y su costo.
- **Egresos por venta**: piezas vendidas, ingreso, costo de lo vendido, **utilidad** y **margen %**.
- **Salidas / mermas**: piezas y costo.
- **Stock actual** y **valor del inventario** (resaltado en rojo si está bajo el mínimo).

Filtros: rango de fechas, sucursal (actual / todas / específica), búsqueda por nombre o SKU y alternar "solo con movimiento".
Incluye tarjetas de totales y **exportación a CSV** (abre en Excel con acentos correctos).

**Archivos:** `app/api/reports/product-flow/route.ts`, `app/(auth)/reports/products/page.tsx`, `components/layout/app-sidebar.tsx`, `app/(auth)/reports/page.tsx`

---

## 6. Bugs adicionales corregidos en Historial de Ventas
- El detalle leía los productos de `db.saleItems.getBySaleId` (almacenamiento en memoria, siempre vacío). Ahora consulta `/api/sales/[id]` y muestra productos y pagos reales.
- Usaba `sale.discount` y `sale.tax`, que no existen en el modelo; los campos correctos son `discountAmount` y `taxAmount` (antes salía `NaN`).
- Los botones "Reimprimir" y "Facturar" no hacían nada; se reemplazaron por acciones reales de comprobante.
- La página ahora es responsiva (tarjetas en celular).

**Archivo:** `app/(auth)/sales/page.tsx`

---

## Notas de despliegue
- No requiere migración manual: la tabla nueva se crea sola con `CREATE TABLE IF NOT EXISTS` al primer arranque.
- No se agregaron dependencias nuevas.
- Verificado con `next build` (compila correctamente).
- Los comprobantes son páginas **públicas** por diseño, para que el cliente pueda abrir el enlace sin cuenta. El ID es un UUID, no adivinable. Si más adelante quieres que caduquen o pedir un código, se puede agregar un token con vencimiento.
