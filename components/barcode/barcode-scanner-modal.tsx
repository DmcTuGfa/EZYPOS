'use client'

import { useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner'
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
  const handleScan = (code: string) => {
    onScan(code)
    onOpenChange(false)
  }

  const { isScanning, startScan, stopScan, videoRef, error } = useBarcodeScanner(handleScan)

  useEffect(() => {
    if (open) {
      startScan()
    } else {
      stopScan()
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) stopScan()
        onOpenChange(val)
      }}
    >
      <DialogContent className="max-w-sm p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <ScanLine className="h-4 w-4" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="relative bg-black aspect-[4/3] w-full overflow-hidden">
          {/* Video feed */}
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted
            playsInline
          />

          {/* Scan overlay */}
          {isScanning && (
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Corner guides */}
              <div className="relative w-52 h-36">
                <span className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl-md" />
                <span className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr-md" />
                <span className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl-md" />
                <span className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white rounded-br-md" />
                {/* Scan line animation */}
                <span className="absolute left-2 right-2 h-0.5 bg-red-400 opacity-75 animate-scan" />
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 px-6 text-center">
              <AlertCircle className="h-8 w-8 text-red-400" />
              <p className="text-white text-sm">{error}</p>
              <Button variant="secondary" size="sm" onClick={() => startScan()}>
                Reintentar
              </Button>
            </div>
          )}

          {/* Loading */}
          {!isScanning && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <p className="text-white text-sm">Iniciando cámara...</p>
            </div>
          )}
        </div>

        <div className="px-4 pb-4 pt-3 flex justify-between items-center">
          <p className="text-xs text-muted-foreground">Apunta al código de barras del producto</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              stopScan()
              onOpenChange(false)
            }}
          >
            <X className="h-4 w-4 mr-1" />
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
