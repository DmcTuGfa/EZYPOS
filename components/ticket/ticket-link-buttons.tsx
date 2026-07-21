'use client'

import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Copy, ExternalLink, MessageCircle } from 'lucide-react'

interface TicketLinkButtonsProps {
  /** Ruta pública del comprobante, ej: /ticket/venta/abc123 */
  path: string
  /** Texto que acompaña al enlace en WhatsApp */
  message: string
  /** Teléfono del cliente (opcional) */
  phone?: string
  size?: 'sm' | 'default'
  className?: string
}

function cleanPhone(phone?: string) {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (!digits) return ''
  return digits.length === 10 ? `52${digits}` : digits
}

export function buildTicketUrl(path: string) {
  if (typeof window === 'undefined') return path
  return `${window.location.origin}${path}`
}

export function TicketLinkButtons({ path, message, phone, size = 'sm', className }: TicketLinkButtonsProps) {
  const url = () => buildTicketUrl(path)

  const openTicket = () => window.open(path, '_blank')

  const sendWhatsApp = () => {
    const text = encodeURIComponent(`${message}\n${url()}`)
    const to = cleanPhone(phone)
    window.open(to ? `https://wa.me/${to}?text=${text}` : `https://wa.me/?text=${text}`, '_blank')
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url())
      toast.success('Enlace copiado')
    } catch {
      toast.error('No se pudo copiar el enlace')
    }
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className || ''}`}>
      <Button size={size} variant="outline" onClick={openTicket}>
        <ExternalLink className="mr-2 h-4 w-4" />
        Ver comprobante
      </Button>
      <Button size={size} onClick={sendWhatsApp} className="bg-[#25D366] text-white hover:bg-[#1eb955]">
        <MessageCircle className="mr-2 h-4 w-4" />
        WhatsApp
      </Button>
      <Button size={size} variant="outline" onClick={copyLink}>
        <Copy className="mr-2 h-4 w-4" />
        Copiar enlace
      </Button>
    </div>
  )
}
