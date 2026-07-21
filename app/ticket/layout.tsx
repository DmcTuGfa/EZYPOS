import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Comprobante',
  description: 'Comprobante digital',
}

export default function TicketLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-muted/40 py-6 print:bg-white print:py-0">{children}</div>
}
