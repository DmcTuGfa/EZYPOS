import { notFound } from 'next/navigation'
import { pool } from '@/lib/server/db'
import { ensureDatabaseSetup } from '@/lib/server/setup'
import { TicketActions } from '@/components/ticket/ticket-actions'
import { TicketDivider, TicketPaper, TicketRow } from '@/components/ticket/ticket-paper'
import { formatCurrency, formatDateTime } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'

const METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  voucher: 'Vale',
}

async function getPayment(id: string) {
  await ensureDatabaseSetup()
  const res = await pool.query(
    `SELECT cp.*,
            c.name AS customer_name, c.phone AS customer_phone, c.rfc AS customer_rfc,
            b.name AS branch_name, b.address AS branch_address, b.city AS branch_city,
            b.state AS branch_state, b.phone AS branch_phone,
            u.name AS user_name
     FROM customer_payments cp
     JOIN customers c ON c.id = cp.customer_id
     JOIN branches b ON b.id = cp.branch_id
     LEFT JOIN users u ON u.id = cp.user_id
     WHERE cp.id = $1`,
    [id]
  )
  const payment = res.rows[0]
  if (!payment) return null

  // Historial del mismo cliente y concepto para calcular el acumulado
  const history = await pool.query(
    `SELECT amount, created_at FROM customer_payments
     WHERE customer_id = $1 AND concept = $2 AND status = 'active' AND created_at <= $3
     ORDER BY created_at`,
    [payment.customer_id, payment.concept, payment.created_at]
  )

  return { payment, history: history.rows }
}

export default async function AbonoTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getPayment(id)
  if (!data) notFound()

  const { payment, history } = data
  const amount = Number(payment.amount || 0)
  const totalAmount = payment.total_amount == null ? null : Number(payment.total_amount)
  const accumulated = history.reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0)
  const pending = totalAmount != null ? Math.max(0, totalAmount - accumulated) : null
  const cancelled = payment.status === 'cancelled'

  return (
    <>
      <TicketPaper>
        <div className="text-center">
          <p className="text-base font-bold uppercase tracking-wide">{payment.branch_name}</p>
          {payment.branch_address && <p className="text-xs text-neutral-500">{payment.branch_address}</p>}
          {(payment.branch_city || payment.branch_state) && (
            <p className="text-xs text-neutral-500">
              {[payment.branch_city, payment.branch_state].filter(Boolean).join(', ')}
            </p>
          )}
          {payment.branch_phone && <p className="text-xs text-neutral-500">Tel. {payment.branch_phone}</p>}
          <p className="mt-3 text-sm font-semibold uppercase">Comprobante de abono</p>
          <p className="font-mono text-xs text-neutral-500">{payment.folio}</p>
          {cancelled && (
            <p className="mt-2 rounded border border-red-300 bg-red-50 py-1 text-xs font-semibold text-red-600">
              COMPROBANTE CANCELADO
            </p>
          )}
        </div>

        <TicketDivider />

        <div className="space-y-1">
          <TicketRow label="Fecha" value={formatDateTime(payment.created_at)} />
          <TicketRow label="Cliente" value={payment.customer_name} />
          {payment.customer_rfc && <TicketRow label="RFC" value={payment.customer_rfc} />}
          <TicketRow label="Atendió" value={payment.user_name || '—'} />
          <TicketRow label="Forma de pago" value={METHOD_LABELS[payment.method] || payment.method} />
          {payment.reference && <TicketRow label="Referencia" value={payment.reference} />}
        </div>

        <TicketDivider />

        <div className="space-y-1">
          <p className="text-xs uppercase text-neutral-500">Concepto</p>
          <p className="font-medium">{payment.concept || 'Abono a cuenta'}</p>
        </div>

        <TicketDivider />

        <div className="space-y-1">
          <div className="flex items-baseline justify-between">
            <span className="font-semibold">Abono recibido</span>
            <span className="text-xl font-bold">{formatCurrency(amount)}</span>
          </div>
          {totalAmount != null && (
            <>
              <TicketRow label="Total acordado" value={formatCurrency(totalAmount)} />
              <TicketRow label="Abonado a la fecha" value={formatCurrency(accumulated)} />
              <TicketRow label="Saldo pendiente" value={formatCurrency(pending || 0)} strong />
            </>
          )}
          {totalAmount == null && history.length > 1 && (
            <TicketRow label="Abonado acumulado" value={formatCurrency(accumulated)} />
          )}
        </div>

        {payment.notes && (
          <>
            <TicketDivider />
            <p className="text-xs text-neutral-500">Notas</p>
            <p className="text-xs">{payment.notes}</p>
          </>
        )}

        <TicketDivider />

        <p className="text-center text-xs text-neutral-500">
          Conserve este comprobante. Documento sin validez fiscal.
        </p>
      </TicketPaper>

      <TicketActions
        message={`Comprobante de abono ${payment.folio} por ${formatCurrency(amount)} — ${payment.branch_name}`}
        phone={payment.customer_phone}
      />
    </>
  )
}
