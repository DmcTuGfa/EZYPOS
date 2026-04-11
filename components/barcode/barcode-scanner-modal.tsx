'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScanLine, X, AlertCircle } from 'lucide-react'

interface BarcodeScannerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScan: (code: string) => void
  title?: string
}

export function BarcodeScannerModal({
  open,
  onOpenChange,
  onScan,
  title = 'Escanear código de barras',
}: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const readerRef = useRef<any>(null)
  const activeRef = useRef(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stopScan = useCallback(() => {
    activeRef.current = false
    try { readerRef.current?.reset(); readerRef.current = null } catch {}
    setReady(false)
    setError(null)
  }, [])

  const startScan = useCallback(async () => {
    if (!videoRef.current) return
    setError(null)
    setReady(false)
    try {
      const { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } = await import('@zxing/library')

      const hints = new Map()
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.QR_CODE,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.ITF,
      ])
      hints.set(DecodeHintType.TRY_HARDER, true)

      const reader = new BrowserMultiFormatReader(hints)
      readerRef.current = reader
      activeRef.current = true

      // decodeFromConstraints es continuo — el callback se llama en cada frame
      reader.decodeFromConstraints(
        {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        videoRef.current,
        (result, _err) => {
          if (!activeRef.current) return
          if (result) {
            const code = result.getText()
            if (code) {
              stopScan()
              onScan(code)
              onOpenChange(false)
            }
          }
        }
      ).catch((e: any) => {
        if (!activeRef.current) return
        const msg = e?.message || String(e)
        if (msg.includes('Permission') || msg.includes('NotAllowed')) {
          setError('Permiso de cámara denegado. Actívalo en ajustes del navegador.')
        } else if (msg.includes('NotFound') || msg.includes('not found')) {
          setError('No se encontró cámara en este dispositivo.')
        } else if (msg.includes('NotReadable') || msg.includes('Could not start')) {
          setError('La cámara está en uso por otra app.')
        } else {
          setError(`Error: ${msg}`)
        }
      })

      // Marcar como listo cuando el video empieza a reproducir
      videoRef.current.onloadedmetadata = () => setReady(true)
      // Fallback: si ya tiene datos, marcar listo de inmediato
      if (videoRef.current.readyState >= 2) setReady(true)

    } catch (err: any) {
      setError(`Error: ${err?.message || err}`)
    }
  }, [onScan, onOpenChange, stopScan])

  // Iniciar/detener según open
  useEffect(() => {
    if (open) {
      // Delay para que React monte el <video> en el DOM
      const t = setTimeout(() => startScan(), 400)
      return () => clearTimeout(t)
    } else {
      stopScan()
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) stopScan(); onOpenChange(v) }}>
      <DialogContent className="max-w-[95vw] sm:max-w-sm p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <ScanLine className="h-4 w-4" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="relative bg-black w-full overflow-hidden" style={{ aspectRatio: '4/3' }}>
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted
            playsInline
            autoPlay
          />

          {/* Guías de encuadre — solo cuando la cámara está lista */}
          {ready && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-52 h-36">
                <span className="absolute top-0 left-0 w-7 h-7 border-t-[3px] border-l-[3px] border-white rounded-tl" />
                <span className="absolute top-0 right-0 w-7 h-7 border-t-[3px] border-r-[3px] border-white rounded-tr" />
                <span className="absolute bottom-0 left-0 w-7 h-7 border-b-[3px] border-l-[3px] border-white rounded-bl" />
                <span className="absolute bottom-0 right-0 w-7 h-7 border-b-[3px] border-r-[3px] border-white rounded-br" />
                <span className="absolute left-2 right-2 h-0.5 bg-red-500 opacity-90 animate-scan" />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 px-6 text-center">
              <AlertCircle className="h-8 w-8 text-red-400" />
              <p className="text-white text-sm leading-snug">{error}</p>
              <Button variant="secondary" size="sm" onClick={() => startScan()}>
                Reintentar
              </Button>
            </div>
          )}

          {/* Loading */}
          {!ready && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <p className="text-white text-sm">Iniciando cámara...</p>
            </div>
          )}
        </div>

        <div className="px-4 pb-4 pt-3 flex justify-between items-center">
          <p className="text-xs text-muted-foreground">Apunta al código del producto</p>
          <Button variant="ghost" size="sm" onClick={() => { stopScan(); onOpenChange(false) }}>
            <X className="h-4 w-4 mr-1" />
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Botón disparador — solo en dispositivos táctiles ────────────────────────
interface BarcodeScanButtonProps {
  onScan: (code: string) => void
  title?: string
  className?: string
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function BarcodeScanButton({ onScan, title, className, size = 'icon' }: BarcodeScanButtonProps) {
  const [open, setOpen] = useState(false)
  const [isTouch, setIsTouch] = useState(false)

  useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

  if (!isTouch) return null

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={size}
        className={className}
        onClick={() => setOpen(true)}
        title="Escanear código de barras"
      >
        <ScanLine className="h-4 w-4" />
      </Button>
      <BarcodeScannerModal
        open={open}
        onOpenChange={setOpen}
        onScan={onScan}
        title={title}
      />
    </>
  )
}
