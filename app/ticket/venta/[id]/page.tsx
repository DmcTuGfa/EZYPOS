import { notFound } from 'next/navigation'
import { pool } from '@/lib/server/db'
import { ensureDatabaseSetup } from '@/lib/server/setup'
import { TicketActions } from '@/components/ticket/ticket-actions'
import { TicketDivider, TicketPaper, TicketRow } from '@/components/ticket/ticket-paper'
import { formatCurrency, formatDateTime } from '@/lib/utils/format'
import { readAppSettings } from '@/lib/server/settings'

export const dynamic = 'force-dynamic'

const METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  voucher: 'Vale',
  mixed: 'Mixto',
}

async function getSale(id: string) {
  await ensureDatabaseSetup()
  const saleRes = await pool.query(
    `SELECT s.*,
            c.name AS customer_name, c.phone AS customer_phone, c.rfc AS customer_rfc,
            b.name AS branch_name, b.address AS branch_address, b.city AS branch_city,
            b.state AS branch_state, b.phone AS branch_phone,
            u.name AS user_name
     FROM sales s
     JOIN branches b ON b.id = s.branch_id
     LEFT JOIN customers c ON c.id = s.customer_id
     LEFT JOIN users u ON u.id = s.user_id
     WHERE s.id = $1 OR s.folio = $1`,
    [id]
  )
  const sale = saleRes.rows[0]
  if (!sale) return null

  const [items, payments] = await Promise.all([
    pool.query('SELECT * FROM sale_items WHERE sale_id = $1 ORDER BY id', [sale.id]),
    pool.query('SELECT * FROM sale_payments WHERE sale_id = $1 ORDER BY created_at', [sale.id]),
  ])

  return { sale, items: items.rows, payments: payments.rows }
}

export default async function VentaTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [data, settings] = await Promise.all([getSale(id), readAppSettings()])
  if (!data) notFound()

  const { sale, items, payments } = data
  const num = (v: unknown) => Number(v || 0)
  const cancelled = sale.status === 'cancelled'
  const change = payments.reduce((sum: number, p: any) => sum + num(p.change_amount), 0)

  return (
    <>
      <TicketPaper>
        <div className="text-center">
          {settings.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={settings.logoUrl}
              alt={settings.businessName}
              className="mx-auto mb-2 h-14 w-auto max-w-[180px] object-contain"
            />
          )}
          <p className="text-base font-bold uppercase tracking-wide">{settings.businessName}</p>
          <p className="text-xs font-medium text-neutral-600">{sale.branch_name}</p>
          {sale.branch_address && <p className="text-xs text-neutral-500">{sale.branch_address}</p>}
          {(sale.branch_city || sale.branch_state) && (
            <p className="text-xs text-neutral-500">
              {[sale.branch_city, sale.branch_state].filter(Boolean).join(', ')}
            </p>
          )}
          {sale.branch_phone && <p className="text-xs text-neutral-500">Tel. {sale.branch_phone}</p>}
          <p className="mt-3 text-sm font-semibold uppercase">Comprobante de venta</p>
          <p className="font-mono text-xs text-neutral-500">{sale.folio}</p>
          {cancelled && (
            <p className="mt-2 rounded border border-red-300 bg-red-50 py-1 text-xs font-semibold text-red-600">
              VENTA CANCELADA
            </p>
          )}
        </div>

        <TicketDivider />

        <div className="space-y-1">
          <TicketRow label="Fecha" value={formatDateTime(sale.created_at)} />
          <TicketRow label="Cliente" value={sale.customer_name || 'Público general'} />
          {sale.customer_rfc && <TicketRow label="RFC" value={sale.customer_rfc} />}
          <TicketRow label="Atendió" value={sale.user_name || '—'} />
        </div>

        <TicketDivider />

        <div className="space-y-2">
          {items.map((item: any) => (
            <div key={item.id} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{item.product_name}</p>
                <p className="text-xs text-neutral-500">
                  {num(item.quantity)} x {formatCurrency(num(item.unit_price))}
                  {num(item.discount_amount) > 0 && ` · desc. ${formatCurrency(num(item.discount_amount))}`}
                </p>
              </div>
              <span className="whitespace-nowrap">{formatCurrency(num(item.total))}</span>
            </div>
          ))}
        </div>

        <TicketDivider />

        <div className="space-y-1">
          <TicketRow label="Subtotal" value={formatCurrency(num(sale.subtotal))} />
          {num(sale.discount_amount) > 0 && (
            <TicketRow label="Descuento" value={`-${formatCurrency(num(sale.discount_amount))}`} />
          )}
          <TicketRow label="IVA" value={formatCurrency(num(sale.tax_amount))} />
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-semibold">Total</span>
            <span className="text-xl font-bold">{formatCurrency(num(sale.total))}</span>
          </div>
        </div>

        <TicketDivider />

        <div className="space-y-1">
          <p className="text-xs uppercase text-neutral-500">Pagos</p>
          {payments.map((p: any) => (
            <TicketRow key={p.id} label={METHOD_LABELS[p.method] || p.method} value={formatCurrency(num(p.amount))} />
          ))}
          {change > 0 && <TicketRow label="Cambio" value={formatCurrency(change)} />}
        </div>

        {sale.notes && (
          <>
            <TicketDivider />
            <p className="text-xs text-neutral-500">Notas</p>
            <p className="text-xs">{sale.notes}</p>
          </>
        )}

        <TicketDivider />

        {settings.ticketFooter && (
          <p className="text-center text-xs text-neutral-500">{settings.ticketFooter}</p>
        )}
        <p className="text-center text-xs text-neutral-500">Documento sin validez fiscal.</p>
      </TicketPaper>

      <TicketActions
        message={`Ticket de compra ${sale.folio} por ${formatCurrency(num(sale.total))} — ${settings.businessName}`}
        phone={sale.customer_phone}
      />
    </>
  )
}
