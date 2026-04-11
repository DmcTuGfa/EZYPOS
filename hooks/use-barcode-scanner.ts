'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

interface UseBarcodeScanner {
  isScanning: boolean
  startScan: () => Promise<void>
  stopScan: () => void
  videoRef: React.RefObject<HTMLVideoElement | null>
  error: string | null
}

declare global {
  interface Window {
    BarcodeDetector: new (options?: { formats: string[] }) => {
      detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>
    }
  }
}

export function useBarcodeScanner(onScan: (code: string) => void): UseBarcodeScanner {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const detectorRef = useRef<InstanceType<typeof window.BarcodeDetector> | null>(null)

  const stopScan = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsScanning(false)
  }, [])

  const startScan = useCallback(async () => {
    setError(null)
    try {
      if (!('BarcodeDetector' in window)) {
        setError('Tu navegador no soporta detección de códigos de barras. Intenta con Chrome en Android.')
        return
      }
      if (!detectorRef.current) {
        detectorRef.current = new window.BarcodeDetector({
          formats: [
            'ean_13', 'ean_8', 'code_128', 'code_39',
            'qr_code', 'upc_a', 'upc_e', 'itf',
          ],
        })
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setIsScanning(true)

        const detect = async () => {
          if (!videoRef.current || !detectorRef.current || !isScanning) return
          try {
            const barcodes = await detectorRef.current.detect(videoRef.current)
            if (barcodes.length > 0) {
              const code = barcodes[0].rawValue
              onScan(code)
              stopScan()
              return
            }
          } catch {
            // detection error, continue loop
          }
          animFrameRef.current = requestAnimationFrame(detect)
        }
        animFrameRef.current = requestAnimationFrame(detect)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al acceder a la cámara'
      setError(msg)
      stopScan()
    }
  }, [onScan, stopScan, isScanning])

  useEffect(() => {
    return () => {
      stopScan()
    }
  }, [stopScan])

  return { isScanning, startScan, stopScan, videoRef, error }
}
