'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import { salesDB, cashSessionsDB, cashMovementsDB, cashRegistersDB } from '@/lib/db/local-storage'
import { formatCurrency, formatDateTime, formatPaymentMethod } from '@/lib/utils/format'
import { toast } from 'sonner'
import {
  Wallet,
  DollarSign,
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

export default function CashRegisterPage() {
  const router = useRouter()
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
  const [sessionHistory, setSessionHistory] = useState<ReturnType<typeof cashSessionsDB.getByBranch>>([])

  const summary = currentSession ? getSessionSummary() : null

  useEffect(() => {
    if (user) {
      loadCurrentSession(user.id)
    }
    if (currentBranch) {
      loadRegisters(currentBranch.id)
    }
  }, [user, currentBranch, loadCurrentSession, loadRegisters])

  useEffect(() => {
    if (currentBranch) {
      const history = cashSessionsDB.getByBranch(currentBranch.id)
        .filter((s) => s.status === 'closed')
        .sort((a, b) => new Date(b.closedAt || 0).getTime() - new Date(a.closedAt || 0).getTime())
        .slice(0, 20)
      setSessionHistory(history)
    }
  }, [currentBranch])

  const handleOpenSession = () => {
    if (!user || !currentBranch || !selectedRegister) {
      toast.error('Selecciona una caja para abrir')
      return
    }

    const amount = parseFloat(openingAmount) || 0

    const session = openSession(selectedRegister, user.id, currentBranch.id, amount)
    
    if (session) {
      toast.success('Caja abierta exitosamente')
      setOpenDialogOpen(false)
      setOpeningAmount('')
      setSelectedRegister('')
    } else {
      toast.error('No se pudo abrir la caja. Verifica que no tengas otra caja abierta.')
    }
  }

  const handleCloseSession = () => {
    if (!currentSession) return

    const amount = parseFloat(closingAmount) || 0
    const closed = closeSession(amount, closingNotes)

    if (closed) {
      toast.success('Caja cerrada exitosamente')
      setCloseDialogOpen(false)
      setClosingAmount('')
      setClosingNotes('')
      
      // Reload history
      if (currentBranch) {
        const history = cashSessionsDB.getByBranch(currentBranch.id)
          .filter((s) => s.status === 'closed')
          .sort((a, b) => new Date(b.closedAt || 0).getTime() - new Date(a.closedAt || 0).getTime())
          .slice(0, 20)
        setSessionHistory(history)
      }
    } else {
      toast.error('Error al cerrar la caja')
    }
  }

  const handleAddMovement = () => {
    if (!user || !currentSession) return

    const amount = parseFloat(movementAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Ingresa un monto válido')
      return
    }

    const movement = addMovement(
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
    } else {
      toast.error('Error al registrar el movimiento')
    }
  }

  const getRegisterName = (registerId: string) => {
    const register = cashRegistersDB.getById(registerId)
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
          {/* Session Status Card */}
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

          {/* Summary Cards */}
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
                    En caja
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
                  <p className="text-xs text-muted-foreground">
                    Ingresos extra
                  </p>
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
                  <p className="text-xs text-muted-foreground">
                    Salidas de efectivo
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Payment Methods Breakdown */}
          {summary && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Desglose por Método de Pago</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Banknote className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Efectivo</p>
                      <p className="text-lg font-semibold">{formatCurrency(summary.byPaymentMethod.cash)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <CreditCard className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Tarjeta</p>
                      <p className="text-lg font-semibold">{formatCurrency(summary.byPaymentMethod.card)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <ArrowRightLeft className="h-8 w-8 text-purple-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Transferencia</p>
                      <p className="text-lg font-semibold">{formatCurrency(summary.byPaymentMethod.transfer)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Ticket className="h-8 w-8 text-orange-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Vales</p>
                      <p className="text-lg font-semibold">{formatCurrency(summary.byPaymentMethod.voucher)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => { setMovementType('deposit'); setMovementDialogOpen(true) }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar Depósito
                </Button>
                <Button variant="outline" onClick={() => { setMovementType('withdrawal'); setMovementDialogOpen(true) }}>
                  <Minus className="h-4 w-4 mr-2" />
                  Registrar Retiro
                </Button>
                <Button variant="outline" onClick={() => router.push('/pos')}>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Ir a Punto de Venta
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        /* No Open Session */
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Wallet className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>No hay caja abierta</CardTitle>
            <CardDescription>
              Abre una caja para comenzar a realizar ventas y registrar movimientos de efectivo.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => setOpenDialogOpen(true)} size="lg">
              <Wallet className="h-4 w-4 mr-2" />
              Abrir Caja
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Open Session Dialog */}
      <Dialog open={openDialogOpen} onOpenChange={setOpenDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abrir Caja</DialogTitle>
            <DialogDescription>
              Selecciona una caja e ingresa el monto inicial de efectivo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
              <Label>Monto inicial en caja</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Ingresa el efectivo con el que inicias tu turno
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleOpenSession} disabled={!selectedRegister}>
              Abrir Caja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Session Dialog */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar Caja</DialogTitle>
            <DialogDescription>
              Cuenta el efectivo en caja e ingresa el monto real.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {summary && (
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Efectivo esperado:</span>
                  <span className="font-semibold">{formatCurrency(summary.expectedCash)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total ventas:</span>
                  <span>{formatCurrency(summary.totalSales)}</span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Monto real en caja</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={closingAmount}
                onChange={(e) => setClosingAmount(e.target.value)}
              />
            </div>
            {closingAmount && summary && (
              <div className={`p-3 rounded-lg ${
                parseFloat(closingAmount) === summary.expectedCash
                  ? 'bg-green-50 text-green-700 dark:bg-green-950/20'
                  : parseFloat(closingAmount) > summary.expectedCash
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/20'
                    : 'bg-red-50 text-red-700 dark:bg-red-950/20'
              }`}>
                <div className="flex items-center gap-2">
                  {parseFloat(closingAmount) === summary.expectedCash ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <span className="font-medium">
                    Diferencia: {formatCurrency(parseFloat(closingAmount) - summary.expectedCash)}
                  </span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Notas u observaciones</Label>
              <Textarea
                placeholder="Observaciones del turno..."
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCloseSession} variant="destructive">
              Cerrar Caja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Movement Dialog */}
      <Dialog open={movementDialogOpen} onOpenChange={setMovementDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {movementType === 'deposit' ? 'Registrar Depósito' : 'Registrar Retiro'}
            </DialogTitle>
            <DialogDescription>
              {movementType === 'deposit'
                ? 'Registra un ingreso de efectivo a la caja.'
                : 'Registra una salida de efectivo de la caja.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Monto</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={movementAmount}
                onChange={(e) => setMovementAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción (opcional)</Label>
              <Input
                placeholder={movementType === 'deposit' ? 'Ej: Cambio para caja' : 'Ej: Pago a proveedor'}
                value={movementDescription}
                onChange={(e) => setMovementDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMovementDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddMovement}>
              {movementType === 'deposit' ? 'Registrar Depósito' : 'Registrar Retiro'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Historial de Cortes</DialogTitle>
            <DialogDescription>
              Últimos cortes de caja de esta sucursal
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Caja</TableHead>
                  <TableHead className="text-right">Ventas</TableHead>
                  <TableHead className="text-right">Esperado</TableHead>
                  <TableHead className="text-right">Declarado</TableHead>
                  <TableHead className="text-right">Diferencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessionHistory.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-mono text-sm">
                      {formatDateTime(session.closedAt || session.openedAt)}
                    </TableCell>
                    <TableCell>{getRegisterName(session.cashRegisterId)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(
                        salesDB.getBySession(session.id)
                          .filter((s) => s.status === 'completed')
                          .reduce((sum, s) => sum + s.total, 0)
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(session.expectedAmount || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(session.closingAmount || 0)}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${
                      (session.difference || 0) === 0
                        ? 'text-green-600'
                        : (session.difference || 0) > 0
                          ? 'text-blue-600'
                          : 'text-red-600'
                    }`}>
                      {formatCurrency(session.difference || 0)}
                    </TableCell>
                  </TableRow>
                ))}
                {sessionHistory.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No hay cortes de caja registrados
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
