'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

export interface UseBarcodeScanner {
  isScanning: boolean
  startScan: () => Promise<void>
  stopScan: () => void
  videoRef: React.RefObject<HTMLVideoElement | null>
  error: string | null
}

export function useBarcodeScanner(onScan: (code: string) => void): UseBarcodeScanner {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const readerRef = useRef<any>(null)
  const activeRef = useRef(false)

  const stopScan = useCallback(() => {
    activeRef.current = false
    try {
      readerRef.current?.reset()
      readerRef.current = null
    } catch {}
    setIsScanning(false)
  }, [])

  const startScan = useCallback(async () => {
    setError(null)
    if (!videoRef.current) return

    try {
      const { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } = await import('@zxing/library')

      // Hints para mejorar detección de todos los formatos comunes
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
        BarcodeFormat.DATA_MATRIX,
      ])
      hints.set(DecodeHintType.TRY_HARDER, true)

      const reader = new BrowserMultiFormatReader(hints)
      readerRef.current = reader
      activeRef.current = true

      // Este método maneja el stream internamente y llama el callback en cada detección
      await reader.decodeFromConstraints(
        {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        videoRef.current,
        (result, err) => {
          if (!activeRef.current) return
          if (result) {
            const code = result.getText()
            if (code) {
              onScan(code)
              stopScan()
            }
          }
          // err aquí es NotFoundException en cada frame sin código — ignorar
        }
      )

      setIsScanning(true)
    } catch (err: any) {
      const msg = err?.message || String(err)
      if (msg.includes('Permission') || msg.includes('NotAllowed')) {
        setError('Permiso de cámara denegado. Actívalo en ajustes del navegador.')
      } else if (msg.includes('NotFound') || msg.includes('not found')) {
        setError('No se encontró cámara en este dispositivo.')
      } else if (msg.includes('NotReadable') || msg.includes('Could not start')) {
        setError('La cámara está en uso por otra app. Ciérrala e intenta de nuevo.')
      } else {
        setError(`Error: ${msg}`)
      }
      stopScan()
    }
  }, [onScan, stopScan])

  useEffect(() => {
    return () => { stopScan() }
  }, [stopScan])

  return { isScanning, startScan, stopScan, videoRef, error }
}
