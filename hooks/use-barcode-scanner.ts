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
  const activeRef = useRef(false) // usamos ref para el loop, no state

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
      // Importamos zxing dinámicamente para no romper SSR
      const { BrowserMultiFormatReader, NotFoundException } = await import('@zxing/library')

      const reader = new BrowserMultiFormatReader()
      readerRef.current = reader

      // Pedir cámara trasera
      const devices = await BrowserMultiFormatReader.listVideoInputDevices()
      // Preferir cámara trasera (environment)
      const back = devices.find(d =>
        d.label.toLowerCase().includes('back') ||
        d.label.toLowerCase().includes('rear') ||
        d.label.toLowerCase().includes('trasera') ||
        d.label.toLowerCase().includes('environment')
      ) || devices[devices.length - 1] // último suele ser trasera en móvil

      if (!back) {
        setError('No se encontró cámara en este dispositivo.')
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: back.deviceId }, facingMode: 'environment' },
      })
      streamRef.current = stream

      if (!videoRef.current) return
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      activeRef.current = true
      setIsScanning(true)

      // Loop de detección
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
          // NotFoundException es normal cuando no hay código en frame — continuamos
          if (!(e instanceof NotFoundException)) {
            // error real, detener
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
      const msg = err?.message || 'Error al acceder a la cámara'
      if (msg.includes('Permission') || msg.includes('permission') || msg.includes('NotAllowed')) {
        setError('Permiso de cámara denegado. Actívalo en la configuración de tu navegador.')
      } else if (msg.includes('NotFound') || msg.includes('DevicesNotFound')) {
        setError('No se encontró cámara en este dispositivo.')
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
