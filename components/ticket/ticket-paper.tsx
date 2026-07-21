import type { ReactNode } from 'react'

export function TicketPaper({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto mb-4 w-full max-w-[420px] px-4">
      <div className="rounded-xl border bg-white p-5 text-[13px] leading-relaxed text-neutral-900 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
        {children}
      </div>
    </div>
  )
}

export function TicketRow({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className={`flex items-start justify-between gap-3 ${strong ? 'font-semibold' : ''}`}>
      <span className={strong ? '' : 'text-neutral-500'}>{label}</span>
      <span className="text-right">{value}</span>
    </div>
  )
}

export function TicketDivider() {
  return <div className="my-3 border-t border-dashed border-neutral-300" />
}
