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
  const streamRef = useRef<MediaStream | null>(null)
  const readerRef = useRef<any>(null)
  const activeRef = useRef(false)

  const stopScan = useCallback(() => {
    activeRef.current = false
    try { readerRef.current?.reset() } catch {}
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
      const { BrowserMultiFormatReader } = await import('@zxing/library')
      const reader = new BrowserMultiFormatReader()
      readerRef.current = reader

      // Pedir directamente la cámara trasera sin listar dispositivos
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })
      streamRef.current = stream

      if (!videoRef.current) {
        stream.getTracks().forEach(t => t.stop())
        return
      }

      videoRef.current.srcObject = stream
      await videoRef.current.play()
      activeRef.current = true
      setIsScanning(true)

      // Loop de detección frame por frame
      const decode = async () => {
        if (!activeRef.current || !videoRef.current) return
        try {
          const result = await reader.decodeFromVideoElement(videoRef.current)
          if (result && activeRef.current) {
            onScan(result.getText())
            stopScan()
            return
          }
        } catch (e: any) {
          // NotFoundException es normal — no hay código en este frame, continuar
          const name = e?.name || e?.constructor?.name || ''
          if (name !== 'NotFoundException' && !String(e).includes('No MultiFormat')) {
            // Error real — detener
            setError(`Error de detección: ${e?.message || e}`)
            stopScan()
            return
          }
        }
        if (activeRef.current) {
          requestAnimationFrame(decode)
        }
      }
      requestAnimationFrame(decode)

    } catch (err: any) {
      const msg = err?.message || String(err)
      if (msg.includes('Permission') || msg.includes('NotAllowed') || msg.includes('permission')) {
        setError('Permiso de cámara denegado. Actívalo en ajustes del navegador.')
      } else if (msg.includes('NotFound') || msg.includes('DevicesNotFound') || msg.includes('Requested device not found')) {
        setError('No se encontró cámara en este dispositivo.')
      } else if (msg.includes('NotReadableError') || msg.includes('Could not start')) {
        setError('La cámara está siendo usada por otra app. Ciérrala e intenta de nuevo.')
      } else {
        setError(`Error de cámara: ${msg}`)
      }
      stopScan()
    }
  }, [onScan, stopScan])

  useEffect(() => {
    return () => { stopScan() }
  }, [stopScan])

  return { isScanning, startScan, stopScan, videoRef, error }
}
