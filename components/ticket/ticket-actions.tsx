'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Check, Copy, Download, MessageCircle, Printer, Share2 } from 'lucide-react'

interface TicketActionsProps {
  /** Texto base que acompaña al enlace al compartir */
  message: string
  /** Teléfono del cliente (opcional) para abrir el chat directo */
  phone?: string
}

function cleanPhone(phone?: string) {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (!digits) return ''
  // Números mexicanos de 10 dígitos → agregar lada país
  return digits.length === 10 ? `52${digits}` : digits
}

export function TicketActions({ message, phone }: TicketActionsProps) {
  const [copied, setCopied] = useState(false)

  const getUrl = () => (typeof window === 'undefined' ? '' : window.location.href)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getUrl())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* noop */
    }
  }

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`${message}\n${getUrl()}`)
    const to = cleanPhone(phone)
    window.open(to ? `https://wa.me/${to}?text=${text}` : `https://wa.me/?text=${text}`, '_blank')
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: message, text: message, url: getUrl() })
        return
      } catch {
        /* usuario canceló */
      }
    }
    void handleCopy()
  }

  return (
    <div className="no-print mx-auto w-full max-w-[420px] px-4 pb-8">
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={handleWhatsApp} className="col-span-2 bg-[#25D366] text-white hover:bg-[#1eb955]">
          <MessageCircle className="mr-2 h-4 w-4" />
          Enviar por WhatsApp
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Imprimir
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          <Download className="mr-2 h-4 w-4" />
          Descargar PDF
        </Button>
        <Button variant="outline" onClick={handleCopy}>
          {copied ? <Check className="mr-2 h-4 w-4 text-green-600" /> : <Copy className="mr-2 h-4 w-4" />}
          {copied ? 'Copiado' : 'Copiar enlace'}
        </Button>
        <Button variant="outline" onClick={handleShare}>
          <Share2 className="mr-2 h-4 w-4" />
          Compartir
        </Button>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Para guardar como PDF elige &quot;Guardar como PDF&quot; en el destino de impresión.
      </p>
    </div>
  )
}
