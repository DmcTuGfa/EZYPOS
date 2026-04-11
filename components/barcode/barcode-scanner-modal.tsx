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

export function BarcodeScannerModal({ open, onOpenChange, onScan, title = 'Escanear código de barras' }: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const activeRef = useRef(false)
  const detectorRef = useRef<any>(null)
  const zxingRef = useRef<any>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDetected = useCallback((code: string) => {
    if (!activeRef.current || !code) return
    activeRef.current = false
    stopStream()
    onScan(code)
    onOpenChange(false)
  }, [onScan, onOpenChange]) // eslint-disable-line

  const stopStream = () => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    if (videoRef.current) videoRef.current.srcObject = null
  }

  const stopScan = useCallback(() => {
    activeRef.current = false
    stopStream()
    setReady(false)
    setError(null)
  }, [])

  // ── Detección con BarcodeDetector nativo (Chrome Android) ──
  const loopNative = useCallback(() => {
    if (!activeRef.current || !videoRef.current || !detectorRef.current) return
    const video = videoRef.current
    if (video.readyState < 2) { rafRef.current = requestAnimationFrame(loopNative); return }

    detectorRef.current.detect(video)
      .then((barcodes: any[]) => {
        if (!activeRef.current) return
        if (barcodes.length > 0 && barcodes[0].rawValue) {
          handleDetected(barcodes[0].rawValue)
        } else {
          rafRef.current = requestAnimationFrame(loopNative)
        }
      })
      .catch(() => {
        if (activeRef.current) rafRef.current = requestAnimationFrame(loopNative)
      })
  }, [handleDetected])

  // ── Detección con zxing sobre canvas (fallback universal) ──
  const loopZxing = useCallback(() => {
    if (!activeRef.current || !videoRef.current || !canvasRef.current || !zxingRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    if (video.readyState < 2) { rafRef.current = requestAnimationFrame(loopZxing); return }

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    try {
      const result = zxingRef.current.decodeFromImageData(imageData)
      if (result) {
        handleDetected(result)
      } else {
        rafRef.current = requestAnimationFrame(loopZxing)
      }
    } catch {
      rafRef.current = requestAnimationFrame(loopZxing)
    }
  }, [handleDetected])

  const startScan = useCallback(async () => {
    setError(null)
    setReady(false)
    if (!videoRef.current) return

    try {
      // 1. Obtener stream de cámara trasera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      activeRef.current = true
      setReady(true)

      // 2. Intentar BarcodeDetector nativo primero
      if ('BarcodeDetector' in window) {
        try {
          detectorRef.current = new (window as any).BarcodeDetector({
            formats: ['ean_13','ean_8','code_128','code_39','qr_code','upc_a','upc_e','itf','data_matrix']
          })
          loopNative()
          return
        } catch {
          // BarcodeDetector disponible pero falló — caer a zxing
        }
      }

      // 3. Fallback: zxing leyendo canvas frame a frame
      const { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat, RGBLuminanceSource, BinaryBitmap, HybridBinarizer } = await import('@zxing/library')
      const hints = new Map()
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39, BarcodeFormat.QR_CODE, BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E, BarcodeFormat.ITF,
      ])
      hints.set(DecodeHintType.TRY_HARDER, true)

      const reader = new BrowserMultiFormatReader(hints)

      // Guardar función de decodificación manual en ref
      zxingRef.current = {
        decodeFromImageData: (imageData: ImageData) => {
          try {
            const len = imageData.width * imageData.height
            const luminances = new Uint8ClampedArray(len)
            for (let i = 0; i < len; i++) {
              const r = imageData.data[i * 4]
              const g = imageData.data[i * 4 + 1]
              const b = imageData.data[i * 4 + 2]
              luminances[i] = (r * 299 + g * 587 + b * 114) / 1000
            }
            const source = new RGBLuminanceSource(luminances, imageData.width, imageData.height)
            const bitmap = new BinaryBitmap(new HybridBinarizer(source))
            const result = reader.decodeBitmap(bitmap)
            return result?.getText() || null
          } catch {
            return null
          }
        }
      }
      loopZxing()

    } catch (err: any) {
      const msg = err?.message || String(err)
      if (msg.includes('Permission') || msg.includes('NotAllowed')) {
        setError('Permiso de cámara denegado. Actívalo en ajustes del navegador.')
      } else if (msg.includes('NotFound') || msg.includes('not found')) {
        setError('No se encontró cámara.')
      } else {
        setError(`Error: ${msg}`)
      }
    }
  }, [loopNative, loopZxing])

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => startScan(), 350)
      return () => clearTimeout(t)
    } else {
      stopScan()
    }
  }, [open]) // eslint-disable-line

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
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline autoPlay />
          {/* Canvas oculto para zxing fallback */}
          <canvas ref={canvasRef} className="hidden" />

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

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 px-6 text-center">
              <AlertCircle className="h-8 w-8 text-red-400" />
              <p className="text-white text-sm leading-snug">{error}</p>
              <Button variant="secondary" size="sm" onClick={() => startScan()}>Reintentar</Button>
            </div>
          )}

          {!ready && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <p className="text-white text-sm">Iniciando cámara...</p>
            </div>
          )}
        </div>

        <div className="px-4 pb-4 pt-3 flex justify-between items-center">
          <p className="text-xs text-muted-foreground">Apunta al código del producto</p>
          <Button variant="ghost" size="sm" onClick={() => { stopScan(); onOpenChange(false) }}>
            <X className="h-4 w-4 mr-1" />Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Botón disparador — solo en dispositivos táctiles ───────────────────────
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
      <Button type="button" variant="outline" size={size} className={className}
        onClick={() => setOpen(true)} title="Escanear código de barras">
        <ScanLine className="h-4 w-4" />
      </Button>
      <BarcodeScannerModal open={open} onOpenChange={setOpen} onScan={onScan} title={title} />
    </>
  )
}
