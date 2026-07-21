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

---

# Segunda entrega

## 7. Dashboard con selector de fechas
Nuevo panel de filtros con:
- **Periodos rápidos:** Hoy, Ayer, Últimos 7 días, Este mes, Mes pasado, Este año.
- **Rango personalizado:** dos campos de fecha para ver un día específico o cualquier rango.
- **Alcance:** sucursal actual o todas las sucursales.

La gráfica ajusta sola su detalle según el rango: **por hora** si es un solo día, **por día** hasta ~70 días, y **por mes** en rangos largos (por ejemplo un año completo).

La comparación "vs anterior" ya no es contra ayer fijo: compara contra el periodo anterior del mismo tamaño (mes contra mes, año contra año, etc.).

**Bugs corregidos en el dashboard:**
- Leía existencias con `db.productStock.getAll()` (almacenamiento en memoria, siempre vacío), por lo que **todos los productos aparecían con stock bajo**.
- Los productos más vendidos salían de `db.saleItems.getBySaleId()`, también vacío, así que la lista **siempre estaba en blanco**.
- Las ventas no se filtraban por sucursal: el dashboard mezclaba todas.

Ahora todo se calcula en la base de datos con la nueva API `/api/reports/dashboard`, que agrega por rango de fechas y sucursal (sin los límites de 500 registros que tenía `/api/bootstrap`).

**Archivos:** `app/api/reports/dashboard/route.ts`, `app/(auth)/dashboard/page.tsx`

---

## 8. Sucursales: confirmación y protección de datos

### Confirmación antes de dar de baja
Antes el botón daba de baja la sucursal de inmediato, sin preguntar. Ahora abre un diálogo de confirmación que primero **revisa qué información tiene la sucursal**.

### Dos comportamientos según el contenido
- **Con información** (ventas, cortes, movimientos de inventario, abonos, usuarios asignados o productos con existencia): solo se permite **desactivar**. El diálogo muestra el desglose de lo que hay para que sepas por qué. La información se conserva completa.
- **Sin información**: puedes elegir entre **desactivar** o **eliminar definitivamente**.

También se bloquea dar de baja la **única sucursal activa**, para no dejar el sistema sin operación.

### Reactivar sucursales
Antes, al desactivar una sucursal desaparecía de la lista y no había forma de recuperarla desde la interfaz. Ahora la pantalla muestra también las desactivadas (atenuadas, con etiqueta "Desactivada") y un botón **Reactivar**.

**Archivos:** `app/api/branches/[id]/route.ts`, `app/api/branches/route.ts`, `app/(auth)/branches/page.tsx`

---

# Tercera entrega

## 9. Facturación desactivada (reversible)
- El módulo de facturación **no se eliminó, se apagó** con un interruptor (`invoicingEnabled`, apagado por defecto).
- "Facturación" desaparece del menú lateral mientras esté apagado.
- Si alguien entra directo a `/invoices`, ve una pantalla que explica que el módulo no está conectado a un PAC autorizado y que por eso **no emite CFDI válidos**, con botón a Configuración.
- Cuando se defina con qué negocios se implementará y se contrate el timbrado, se activa con un switch en Configuración (solo administradores).

**Archivos:** `app/(auth)/invoices/page.tsx`, `components/layout/app-sidebar.tsx`

## 10. Renombrado a EZYPOS
Se eliminó "VentaMX" de todo el sistema: título del navegador, menú lateral, pantalla de inicio, nombre del paquete, correos de ejemplo y README. El pie del login ahora dice "Powered by EZYPOS".

## 11. Nombre y logo configurables por negocio
Nueva tarjeta **Identidad del negocio** en Configuración (solo administradores):
- **Nombre del negocio** — se muestra en el login, el menú lateral y los comprobantes digitales.
- **Frase de la pantalla de inicio** — el texto bajo el nombre en el login.
- **Logo** — se sube desde el dispositivo (PNG/JPG, máx. 300 KB). Sustituye al ícono en login, menú y encabezado de los tickets. Botón para quitarlo y volver al ícono por defecto.
- **Mensaje al pie del ticket** — personalizable por negocio.
- **Switch de facturación** — para reactivar el módulo cuando esté listo.

Infraestructura: tabla `app_settings` (se crea sola), API `/api/settings` (GET/PUT), store `settings-store`. Si no se configura nada, el sistema muestra "EZYPOS" por defecto.

**Nota de alcance:** la configuración es una por instalación. Si en el futuro varios negocios comparten la misma base de datos, el nombre y logo deberán moverse a nivel sucursal.

**Archivos:** `lib/config/app-settings.ts`, `lib/server/settings.ts`, `app/api/settings/route.ts`, `lib/stores/settings-store.ts`, `lib/server/setup.ts`, `app/(auth)/settings/page.tsx`, `app/login/page.tsx`, `components/layout/app-sidebar.tsx`, `app/(auth)/layout.tsx`, `app/ticket/venta/[id]/page.tsx`, `app/ticket/abono/[id]/page.tsx`

