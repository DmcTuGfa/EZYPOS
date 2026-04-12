'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useCashStore } from '@/lib/stores/cash-store'
import { useBranchStore } from '@/lib/stores/branch-store'
import { useAuthStore } from '@/lib/stores/auth-store'
import { apiFetch } from '@/lib/api/client'
import type { CashSession } from '@/lib/types'
import { formatCurrency, formatDateTime } from '@/lib/utils/format'
import { toast } from 'sonner'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
  Banknote,
  CreditCard,
  ArrowRightLeft,
  Ticket,
  History,
  Plus,
  Minus,
  AlertCircle,
} from 'lucide-react'

interface SessionSummary {
  totalSales: number
  salesCount: number
  byPaymentMethod: Record<'cash' | 'card' | 'transfer' | 'voucher', number>
  withdrawals: number
  deposits: number
  returns: number
  expectedCash: number
}

export default function CashRegisterPage() {
  const { user } = useAuthStore()
  const { currentBranch } = useBranchStore()
  const {
    currentSession,
    registers,
    loadRegisters,
    loadCurrentSession,
    openSession,
    closeSession,
    getSessionSummary,
    addMovement,
  } = useCashStore()

  const [openDialogOpen, setOpenDialogOpen] = useState(false)
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)
  const [movementDialogOpen, setMovementDialogOpen] = useState(false)
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)

  const [selectedRegister, setSelectedRegister] = useState('')
  const [openingAmount, setOpeningAmount] = useState('')
  const [closingAmount, setClosingAmount] = useState('')
  const [closingNotes, setClosingNotes] = useState('')
  const [movementType, setMovementType] = useState<'deposit' | 'withdrawal'>('deposit')
  const [movementAmount, setMovementAmount] = useState('')
  const [movementDescription, setMovementDescription] = useState('')
  const [sessionHistory, setSessionHistory] = useState<CashSession[]>([])
  const [summary, setSummary] = useState<SessionSummary | null>(null)
  const [isClosing, setIsClosing] = useState(false)
  const [isLoadingRegisters, setIsLoadingRegisters] = useState(false)

  // ── BUG FIX: al cambiar sucursal limpiar sesión y registros de inmediato ──
  useEffect(() => {
    if (!currentBranch) return

    // Limpiar estado anterior inmediatamente para evitar que admin vea
    // sesión de sucursal anterior mientras carga la nueva
    setSelectedRegister('')
    setSummary(null)

    const load = async () => {
      setIsLoadingRegisters(true)
      // Cargar registros Y sesión actual en paralelo
      await Promise.all([
        loadRegisters(currentBranch.id),
        // BUG FIX: condición correcta — ambos requeridos (era || antes)
        user ? loadCurrentSession(user.id, currentBranch.id) : Promise.resolve(),
      ])
      setIsLoadingRegisters(false)
    }
    void load()
  }, [currentBranch?.id]) // eslint-disable-line

  const loadHistory = useCallback(async () => {
    if (!currentBranch) { setSessionHistory([]); return }
    try {
      const data = await apiFetch<{ sessions: CashSession[] }>(
        `/api/cash/sessions?branchId=${currentBranch.id}`
      )
      const history = (data.sessions || [])
        .filter((s) => s.status === 'closed')
        .sort((a, b) => new Date(b.closedAt || 0).getTime() - new Date(a.closedAt || 0).getTime())
        .slice(0, 20)
      setSessionHistory(history)
    } catch { setSessionHistory([]) }
  }, [currentBranch])

  useEffect(() => { void loadHistory() }, [loadHistory, currentSession])

  useEffect(() => {
    const load = async () => {
      if (!currentSession) { setSummary(null); return }
      try {
        const data = await getSessionSummary()
        setSummary(data as SessionSummary | null)
      } catch { setSummary(null) }
    }
    void load()
  }, [currentSession, getSessionSummary])

  useEffect(() => {
    if (closeDialogOpen && summary) {
      setClosingAmount(String(Number(summary.expectedCash || 0).toFixed(2)))
    }
  }, [closeDialogOpen, summary])

  // ── Auto-seleccionar caja si solo hay una ──
  useEffect(() => {
    if (registers.length === 1 && !selectedRegister) {
      setSelectedRegister(registers[0].id)
    }
  }, [registers, selectedRegister])

  const handleOpenSession = async () => {
    if (!user || !currentBranch || !selectedRegister) {
      toast.error('Selecciona una caja para abrir')
      return
    }
    const amount = parseFloat(openingAmount) || 0
    try {
      const session = await openSession(selectedRegister, user.id, currentBranch.id, amount)
      if (session) {
        toast.success('Caja abierta exitosamente')
        setOpenDialogOpen(false)
        setOpeningAmount('')
        setSelectedRegister('')
        await Promise.all([
          loadCurrentSession(user.id, currentBranch.id),
          loadRegisters(currentBranch.id),
        ])
      }
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo abrir la caja')
    }
  }

  const handleCloseSession = async () => {
    if (!currentSession || !user || !currentBranch) return
    const amount = parseFloat(closingAmount)
    if (Number.isNaN(amount) || amount < 0) {
      toast.error('Ingresa un monto contado válido')
      return
    }
    setIsClosing(true)
    try {
      const latestSummary = await getSessionSummary()
      if (!latestSummary) { toast.error('No se pudo calcular el corte de caja'); return }
      setSummary(latestSummary as SessionSummary)
      const closed = await closeSession(amount, closingNotes)
      if (!closed) { toast.error('No se pudo cerrar la caja'); return }
      toast.success('Caja cerrada exitosamente')
      setCloseDialogOpen(false)
      setClosingAmount('')
      setClosingNotes('')
      await loadCurrentSession(user.id, currentBranch.id)
      await loadHistory()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al cerrar la caja')
    } finally {
      setIsClosing(false)
    }
  }

  const handleAddMovement = async () => {
    if (!user || !currentSession) return
    const amount = parseFloat(movementAmount)
    if (Number.isNaN(amount) || amount <= 0) { toast.error('Ingresa un monto válido'); return }
    const movement = await addMovement(
      movementType, amount,
      movementDescription || (movementType === 'deposit' ? 'Depósito en caja' : 'Retiro de caja'),
      user.id
    )
    if (movement) {
      toast.success(movementType === 'deposit' ? 'Depósito registrado' : 'Retiro registrado')
      setMovementDialogOpen(false)
      setMovementAmount('')
      setMovementDescription('')
      const data = await getSessionSummary()
      setSummary(data as SessionSummary | null)
    } else {
      toast.error('Error al registrar el movimiento')
    }
  }

  const getRegisterName = (registerId: string) =>
    registers.find((r) => r.id === registerId)?.name || 'Caja'

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold md:text-2xl">Corte de Caja</h1>
          <p className="text-sm text-muted-foreground">{currentBranch?.name || 'Selecciona una sucursal'}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setHistoryDialogOpen(true)}>
            <History className="h-4 w-4 mr-2" />Historial
          </Button>
          {!currentSession ? (
            <Button size="sm" onClick={async () => {
              if (currentBranch) {
                setIsLoadingRegisters(true)
                await loadRegisters(currentBranch.id)
                setIsLoadingRegisters(false)
              }
              setOpenDialogOpen(true)
            }} disabled={!currentBranch}>
              <Wallet className="h-4 w-4 mr-2" />Abrir Caja
            </Button>
          ) : (
            <Button size="sm" variant="destructive" onClick={() => setCloseDialogOpen(true)}>
              <XCircle className="h-4 w-4 mr-2" />Cerrar Caja
            </Button>
          )}
        </div>
      </div>

      {/* Sin sucursal seleccionada */}
      {!currentBranch && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Selecciona una sucursal para gestionar la caja.</p>
          </CardContent>
        </Card>
      )}

      {/* Caja abierta */}
      {currentBranch && currentSession && (
        <>
          <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <CardTitle className="text-base md:text-lg">Caja Abierta</CardTitle>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  {getRegisterName(currentSession.cashRegisterId)}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Abierta el {formatDateTime(currentSession.openedAt)} · Monto inicial: {formatCurrency(currentSession.openingAmount)}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Tarjetas de resumen — 2 cols en móvil, 4 en desktop */}
          {summary && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6 md:pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium">Ventas del Turno</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardHeader>
                <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                  <div className="text-lg font-bold md:text-2xl">{formatCurrency(summary.totalSales)}</div>
                  <p className="text-xs text-muted-foreground">{summary.salesCount} {summary.salesCount === 1 ? 'venta' : 'ventas'}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6 md:pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium">Efectivo Esperado</CardTitle>
                  <Banknote className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardHeader>
                <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                  <div className="text-lg font-bold md:text-2xl">{formatCurrency(summary.expectedCash)}</div>
                  <p className="text-xs text-muted-foreground">Apertura + efectivo</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6 md:pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium">Depósitos</CardTitle>
                  <Plus className="h-4 w-4 text-green-600 shrink-0" />
                </CardHeader>
                <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                  <div className="text-lg font-bold text-green-600 md:text-2xl">{formatCurrency(summary.deposits)}</div>
                  <p className="text-xs text-muted-foreground">Ingresos manuales</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6 md:pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium">Retiros</CardTitle>
                  <Minus className="h-4 w-4 text-red-600 shrink-0" />
                </CardHeader>
                <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                  <div className="text-lg font-bold text-red-600 md:text-2xl">{formatCurrency(summary.withdrawals)}</div>
                  <p className="text-xs text-muted-foreground">Salidas manuales</p>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Pagos por método */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Pagos por método</CardTitle>
                <CardDescription className="text-xs">Resumen del turno actual</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {summary ? (
                  <>
                    {[
                      { icon: Banknote, label: 'Efectivo', key: 'cash' },
                      { icon: CreditCard, label: 'Tarjeta', key: 'card' },
                      { icon: ArrowRightLeft, label: 'Transferencia', key: 'transfer' },
                      { icon: Ticket, label: 'Vale', key: 'voucher' },
                    ].map(({ icon: Icon, label, key }) => (
                      <div key={key} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span className="text-sm">{label}</span>
                        </div>
                        <span className="font-medium text-sm">
                          {formatCurrency(summary.byPaymentMethod[key as keyof typeof summary.byPaymentMethod])}
                        </span>
                      </div>
                    ))}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin información disponible.</p>
                )}
              </CardContent>
            </Card>

            {/* Acciones rápidas */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Acciones rápidas</CardTitle>
                <CardDescription className="text-xs">Movimientos manuales de caja</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" variant="outline" onClick={() => { setMovementType('deposit'); setMovementDialogOpen(true) }}>
                  <Plus className="h-4 w-4 mr-2" />Registrar depósito
                </Button>
                <Button className="w-full" variant="outline" onClick={() => { setMovementType('withdrawal'); setMovementDialogOpen(true) }}>
                  <Minus className="h-4 w-4 mr-2" />Registrar retiro
                </Button>
                <Button className="w-full" variant="destructive" onClick={() => setCloseDialogOpen(true)}>
                  <XCircle className="h-4 w-4 mr-2" />Cerrar caja
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Sin caja abierta */}
      {currentBranch && !currentSession && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sin caja abierta</CardTitle>
            <CardDescription>Abre una caja para iniciar tu turno</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              No tienes una caja abierta en {currentBranch.name}.
              {registers.length === 0 && !isLoadingRegisters && (
                <span className="block mt-1 text-amber-600">⚠ Esta sucursal no tiene cajas registradas.</span>
              )}
            </p>
            <Button onClick={async () => {
              if (currentBranch) {
                setIsLoadingRegisters(true)
                await loadRegisters(currentBranch.id)
                setIsLoadingRegisters(false)
              }
              setOpenDialogOpen(true)
            }} disabled={registers.length === 0 || isLoadingRegisters}>
              <Wallet className="h-4 w-4 mr-2" />
              {isLoadingRegisters ? 'Cargando...' : registers.length === 0 ? 'Sin cajas disponibles' : 'Abrir Caja'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Diálogo: Abrir Caja ── */}
      <Dialog open={openDialogOpen} onOpenChange={setOpenDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Abrir caja</DialogTitle>
            <DialogDescription>Selecciona la caja y define el monto inicial.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Caja</Label>
              {isLoadingRegisters ? (
                <p className="text-sm text-muted-foreground">Cargando cajas...</p>
              ) : registers.length === 0 ? (
                <p className="text-sm text-amber-600">Esta sucursal no tiene cajas registradas. Créalas en Configuración.</p>
              ) : (
                <Select value={selectedRegister} onValueChange={setSelectedRegister}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona una caja" />
                  </SelectTrigger>
                  <SelectContent>
                    {registers.map((register) => (
                      <SelectItem key={register.id} value={register.id}>
                        {register.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>Monto inicial</Label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setOpenDialogOpen(false)}>Cancelar</Button>
            <Button className="w-full sm:w-auto" onClick={handleOpenSession} disabled={!selectedRegister || isLoadingRegisters}>
              Abrir caja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Diálogo: Cerrar Caja ── */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cerrar caja</DialogTitle>
            <DialogDescription>Registra el monto contado al finalizar tu turno.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Monto contado</Label>
              <Input type="number" inputMode="decimal" step="0.01" value={closingAmount}
                onChange={(e) => setClosingAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea value={closingNotes} onChange={(e) => setClosingNotes(e.target.value)}
                placeholder="Observaciones del cierre" />
            </div>
            {summary && (
              <>
                <Separator />
                <div className="text-sm space-y-1.5 bg-muted/50 rounded-lg p-3">
                  <div className="flex justify-between">
                    <span>Efectivo esperado:</span>
                    <span className="font-medium">{formatCurrency(summary.expectedCash)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Monto contado:</span>
                    <span className="font-medium">{formatCurrency(parseFloat(closingAmount) || 0)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Diferencia:</span>
                    <span className={(parseFloat(closingAmount) || 0) - summary.expectedCash < 0 ? 'text-red-600' : 'text-green-600'}>
                      {formatCurrency((parseFloat(closingAmount) || 0) - summary.expectedCash)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setCloseDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" className="w-full sm:w-auto" onClick={handleCloseSession} disabled={isClosing}>
              {isClosing ? 'Cerrando...' : 'Confirmar cierre'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Diálogo: Movimiento ── */}
      <Dialog open={movementDialogOpen} onOpenChange={setMovementDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{movementType === 'deposit' ? 'Registrar depósito' : 'Registrar retiro'}</DialogTitle>
            <DialogDescription>Agrega un movimiento manual a la caja actual.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Monto</Label>
              <Input type="number" inputMode="decimal" step="0.01" value={movementAmount}
                onChange={(e) => setMovementAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea value={movementDescription} onChange={(e) => setMovementDescription(e.target.value)}
                placeholder="Describe el motivo del movimiento" />
            </div>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setMovementDialogOpen(false)}>Cancelar</Button>
            <Button className="w-full sm:w-auto" onClick={handleAddMovement}>
              {movementType === 'deposit' ? 'Guardar depósito' : 'Guardar retiro'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Diálogo: Historial ── */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Historial de cortes</DialogTitle>
            <DialogDescription>Últimos cierres de caja de {currentBranch?.name}.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Caja</TableHead>
                    <TableHead>Apertura</TableHead>
                    <TableHead>Cierre</TableHead>
                    <TableHead>Inicial</TableHead>
                    <TableHead>Contado</TableHead>
                    <TableHead>Diferencia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessionHistory.length > 0 ? sessionHistory.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="text-sm">{getRegisterName(session.cashRegisterId)}</TableCell>
                      <TableCell className="text-xs">{formatDateTime(session.openedAt)}</TableCell>
                      <TableCell className="text-xs">{session.closedAt ? formatDateTime(session.closedAt) : '-'}</TableCell>
                      <TableCell className="text-sm">{formatCurrency(session.openingAmount)}</TableCell>
                      <TableCell className="text-sm">{formatCurrency(session.closingAmount || 0)}</TableCell>
                      <TableCell className={`text-sm font-medium ${(session.difference || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(session.difference || 0)}
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-8">
                        No hay historial disponible.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
