'use client'

import { useState, useEffect } from 'react'
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
import { formatCurrency, formatDateTime, formatPaymentMethod } from '@/lib/utils/format'
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

  useEffect(() => {
    if (currentBranch) {
      void loadRegisters(currentBranch.id)
    }
  }, [currentBranch, loadRegisters])

  useEffect(() => {
    if (user || currentBranch) {
      void loadCurrentSession(user?.id, currentBranch?.id)
    }
  }, [user, currentBranch, loadCurrentSession])

  useEffect(() => {
    const loadHistory = async () => {
      if (!currentBranch) {
        setSessionHistory([])
        return
      }

      try {
        const data = await apiFetch<{ sessions: CashSession[] }>(
          `/api/cash/sessions?branchId=${currentBranch.id}`
        )

        const history = (data.sessions || [])
          .filter((session) => session.status === 'closed')
          .sort(
            (a, b) =>
              new Date(b.closedAt || 0).getTime() - new Date(a.closedAt || 0).getTime()
          )
          .slice(0, 20)

        setSessionHistory(history)
      } catch {
        setSessionHistory([])
      }
    }

    void loadHistory()
  }, [currentBranch, currentSession])

  useEffect(() => {
    const loadSummary = async () => {
      if (!currentSession) {
        setSummary(null)
        return
      }

      try {
        const data = await getSessionSummary()
        setSummary(data as SessionSummary | null)
      } catch {
        setSummary(null)
      }
    }

    void loadSummary()
  }, [currentSession, getSessionSummary])

  const handleOpenSession = async () => {
    if (!user || !currentBranch || !selectedRegister) {
      toast.error('Selecciona una caja para abrir')
      return
    }

    const amount = parseFloat(openingAmount) || 0
    const session = await openSession(selectedRegister, user.id, currentBranch.id, amount)

    if (session) {
      toast.success('Caja abierta exitosamente')
      setOpenDialogOpen(false)
      setOpeningAmount('')
      setSelectedRegister('')
      await loadCurrentSession(user.id, currentBranch.id)
    } else {
      toast.error('No se pudo abrir la caja. Verifica que no tengas otra caja abierta.')
    }
  }

  const handleCloseSession = async () => {
    if (!currentSession || !user || !currentBranch) return

    const amount = parseFloat(closingAmount) || 0
    const closed = await closeSession(amount, closingNotes)

    if (closed) {
      toast.success('Caja cerrada exitosamente')
      setCloseDialogOpen(false)
      setClosingAmount('')
      setClosingNotes('')
      await loadCurrentSession(user.id, currentBranch.id)
    } else {
      toast.error('Error al cerrar la caja')
    }
  }

  const handleAddMovement = async () => {
    if (!user || !currentSession) return

    const amount = parseFloat(movementAmount)
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error('Ingresa un monto válido')
      return
    }

    const movement = await addMovement(
      movementType,
      amount,
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

  const getRegisterName = (registerId: string) => {
    const register = registers.find((item) => item.id === registerId)
    return register?.name || 'Caja'
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Corte de Caja</h1>
          <p className="text-muted-foreground">
            {currentBranch?.name || 'Selecciona una sucursal'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setHistoryDialogOpen(true)}>
            <History className="h-4 w-4 mr-2" />
            Historial
          </Button>
          {!currentSession ? (
            <Button onClick={() => setOpenDialogOpen(true)}>
              <Wallet className="h-4 w-4 mr-2" />
              Abrir Caja
            </Button>
          ) : (
            <Button variant="destructive" onClick={() => setCloseDialogOpen(true)}>
              <XCircle className="h-4 w-4 mr-2" />
              Cerrar Caja
            </Button>
          )}
        </div>
      </div>

      {currentSession ? (
        <>
          <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <CardTitle className="text-lg">Caja Abierta</CardTitle>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  {getRegisterName(currentSession.cashRegisterId)}
                </Badge>
              </div>
              <CardDescription>
                Abierta el {formatDateTime(currentSession.openedAt)} por {user?.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Monto inicial: {formatCurrency(currentSession.openingAmount)}
                </span>
              </div>
            </CardContent>
          </Card>

          {summary && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Ventas del Turno</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(summary.totalSales)}</div>
                  <p className="text-xs text-muted-foreground">
                    {summary.salesCount} {summary.salesCount === 1 ? 'venta' : 'ventas'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Efectivo Esperado</CardTitle>
                  <Banknote className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(summary.expectedCash)}</div>
                  <p className="text-xs text-muted-foreground">
                    Apertura + ventas en efectivo + depósitos - retiros
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Depósitos</CardTitle>
                  <Plus className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(summary.deposits)}
                  </div>
                  <p className="text-xs text-muted-foreground">Ingresos manuales a caja</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Retiros</CardTitle>
                  <Minus className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(summary.withdrawals)}
                  </div>
                  <p className="text-xs text-muted-foreground">Salidas manuales de caja</p>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Pagos por método</CardTitle>
                <CardDescription>Resumen del turno actual</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {summary ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4" />
                        <span>Efectivo</span>
                      </div>
                      <span className="font-medium">{formatCurrency(summary.byPaymentMethod.cash)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        <span>Tarjeta</span>
                      </div>
                      <span className="font-medium">{formatCurrency(summary.byPaymentMethod.card)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ArrowRightLeft className="h-4 w-4" />
                        <span>Transferencia</span>
                      </div>
                      <span className="font-medium">{formatCurrency(summary.byPaymentMethod.transfer)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Ticket className="h-4 w-4" />
                        <span>Vale</span>
                      </div>
                      <span className="font-medium">{formatCurrency(summary.byPaymentMethod.voucher)}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin información disponible.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Acciones rápidas</CardTitle>
                <CardDescription>Registra movimientos manuales en caja</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" variant="outline" onClick={() => {
                  setMovementType('deposit')
                  setMovementDialogOpen(true)
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar depósito
                </Button>
                <Button className="w-full" variant="outline" onClick={() => {
                  setMovementType('withdrawal')
                  setMovementDialogOpen(true)
                }}>
                  <Minus className="h-4 w-4 mr-2" />
                  Registrar retiro
                </Button>
                <Button className="w-full" variant="destructive" onClick={() => setCloseDialogOpen(true)}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Cerrar caja
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Sin caja abierta</CardTitle>
            <CardDescription>Abre una caja para iniciar tu turno</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              No tienes una caja abierta en esta sucursal.
            </p>
            <Button onClick={() => setOpenDialogOpen(true)}>
              <Wallet className="h-4 w-4 mr-2" />
              Abrir Caja
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={openDialogOpen} onOpenChange={setOpenDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abrir caja</DialogTitle>
            <DialogDescription>Selecciona la caja y define el monto inicial.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Caja</Label>
              <Select value={selectedRegister} onValueChange={setSelectedRegister}>
                <SelectTrigger>
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
            </div>

            <div className="space-y-2">
              <Label>Monto inicial</Label>
              <Input
                type="number"
                step="0.01"
                value={openingAmount}
                onChange={(event) => setOpeningAmount(event.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleOpenSession}>Abrir caja</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar caja</DialogTitle>
            <DialogDescription>
              Registra el monto contado al finalizar tu turno.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Monto contado</Label>
              <Input
                type="number"
                step="0.01"
                value={closingAmount}
                onChange={(event) => setClosingAmount(event.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={closingNotes}
                onChange={(event) => setClosingNotes(event.target.value)}
                placeholder="Observaciones del cierre"
              />
            </div>

            {summary && (
              <>
                <Separator />
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Efectivo esperado:</span>
                    <span className="font-medium">{formatCurrency(summary.expectedCash)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Monto contado:</span>
                    <span className="font-medium">
                      {formatCurrency(parseFloat(closingAmount) || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Diferencia:</span>
                    <span>
                      {formatCurrency((parseFloat(closingAmount) || 0) - summary.expectedCash)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleCloseSession}>
              Confirmar cierre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={movementDialogOpen} onOpenChange={setMovementDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {movementType === 'deposit' ? 'Registrar depósito' : 'Registrar retiro'}
            </DialogTitle>
            <DialogDescription>
              Agrega un movimiento manual a la caja actual.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Monto</Label>
              <Input
                type="number"
                step="0.01"
                value={movementAmount}
                onChange={(event) => setMovementAmount(event.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={movementDescription}
                onChange={(event) => setMovementDescription(event.target.value)}
                placeholder="Describe el motivo del movimiento"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMovementDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddMovement}>
              {movementType === 'deposit' ? 'Guardar depósito' : 'Guardar retiro'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Historial de cortes</DialogTitle>
            <DialogDescription>Últimos cierres de caja de la sucursal actual.</DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Caja</TableHead>
                  <TableHead>Apertura</TableHead>
                  <TableHead>Cierre</TableHead>
                  <TableHead>Inicial</TableHead>
                  <TableHead>Cierre</TableHead>
                  <TableHead>Diferencia</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessionHistory.length > 0 ? (
                  sessionHistory.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>{getRegisterName(session.cashRegisterId)}</TableCell>
                      <TableCell>{formatDateTime(session.openedAt)}</TableCell>
                      <TableCell>{session.closedAt ? formatDateTime(session.closedAt) : '-'}</TableCell>
                      <TableCell>{formatCurrency(session.openingAmount)}</TableCell>
                      <TableCell>{formatCurrency(session.closingAmount || 0)}</TableCell>
                      <TableCell>{formatCurrency(session.difference || 0)}</TableCell>
                      <TableCell>
                        <Badge variant={session.status === 'open' ? 'default' : 'secondary'}>
                          {session.status === 'open' ? 'Abierta' : 'Cerrada'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No hay historial disponible.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
