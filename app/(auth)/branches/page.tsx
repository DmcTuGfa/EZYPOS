"use client"

import { useCallback, useEffect, useState } from 'react'
import {
  Building2,
  MapPin,
  Phone,
  Plus,
  Store,
  Wallet,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  RotateCcw,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useBranchStore } from '@/lib/stores/branch-store'
import { useAuthStore } from '@/lib/stores/auth-store'
import { apiFetch } from '@/lib/api/client'
import { toast } from 'sonner'
import type { Branch, CashRegister } from '@/lib/types'

const emptyForm = { name: '', code: '', address: '', city: '', state: '', postalCode: '', phone: '' }

interface BranchUsage {
  sales: number
  cashSessions: number
  inventoryMovements: number
  cashRegisters: number
  users: number
  stock: number
  customerPayments: number
}

const USAGE_LABELS: Array<{ key: keyof BranchUsage; label: string }> = [
  { key: 'sales', label: 'Ventas registradas' },
  { key: 'cashSessions', label: 'Cortes de caja' },
  { key: 'inventoryMovements', label: 'Movimientos de inventario' },
  { key: 'stock', label: 'Productos con existencia' },
  { key: 'customerPayments', label: 'Abonos de clientes' },
  { key: 'users', label: 'Usuarios asignados' },
  { key: 'cashRegisters', label: 'Cajas registradoras' },
]

export default function BranchesPage() {
  const { currentBranch, loadBranches, setCurrentBranchById, createBranch, updateBranch } = useBranchStore()
  const { user } = useAuthStore()
  const isAdmin = user?.role.permissions.includes('*') || user?.isGlobalAccess

  const [allBranches, setAllBranches] = useState<Branch[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Branch | null>(null)
  const [form, setForm] = useState(emptyForm)

  // Cajas por sucursal
  const [registers, setRegisters] = useState<Record<string, CashRegister[]>>({})
  const [expandedBranch, setExpandedBranch] = useState<string | null>(null)
  const [newRegisterName, setNewRegisterName] = useState<Record<string, string>>({})
  const [loadingRegisters, setLoadingRegisters] = useState<Record<string, boolean>>({})

  // Confirmación de baja
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null)
  const [usage, setUsage] = useState<BranchUsage | null>(null)
  const [hasData, setHasData] = useState(false)
  const [isCheckingUsage, setIsCheckingUsage] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const loadAllBranches = useCallback(async () => {
    try {
      const data = await apiFetch<{ branches: Branch[] }>('/api/branches?all=true')
      setAllBranches(data.branches || [])
    } catch {
      toast.error('No se pudieron cargar las sucursales')
    }
  }, [])

  useEffect(() => {
    void loadAllBranches()
    loadBranches()
  }, [loadAllBranches, loadBranches])

  const loadRegisters = async (branchId: string) => {
    setLoadingRegisters((p) => ({ ...p, [branchId]: true }))
    try {
      const data = await apiFetch<{ registers: CashRegister[] }>(
        `/api/cash/registers?branchId=${branchId}&all=true`
      )
      setRegisters((p) => ({ ...p, [branchId]: data.registers }))
    } catch {
      toast.error('Error al cargar cajas')
    } finally {
      setLoadingRegisters((p) => ({ ...p, [branchId]: false }))
    }
  }

  const handleToggleRegisters = async (branchId: string) => {
    if (expandedBranch === branchId) {
      setExpandedBranch(null)
      return
    }
    setExpandedBranch(branchId)
    await loadRegisters(branchId)
  }

  const handleAddRegister = async (branchId: string) => {
    const name = newRegisterName[branchId]?.trim()
    if (!name) { toast.error('Escribe un nombre para la caja'); return }
    try {
      await apiFetch('/api/cash/registers', {
        method: 'POST',
        body: JSON.stringify({ name, branchId }),
      })
      setNewRegisterName((p) => ({ ...p, [branchId]: '' }))
      await loadRegisters(branchId)
      toast.success(`Caja "${name}" creada`)
    } catch (e: any) {
      toast.error(e?.message || 'Error al crear la caja')
    }
  }

  const handleDeleteRegister = async (branchId: string, registerId: string, registerName: string) => {
    try {
      await apiFetch(`/api/cash/registers?id=${registerId}`, { method: 'DELETE' })
      await loadRegisters(branchId)
      toast.success(`Caja "${registerName}" desactivada`)
    } catch (e: any) {
      toast.error(e?.message || 'Error al desactivar la caja')
    }
  }

  const startEdit = (branch: Branch) => {
    setEditing(branch)
    setForm({
      name: branch.name,
      code: branch.code,
      address: branch.address,
      city: branch.city,
      state: branch.state,
      postalCode: branch.postalCode,
      phone: branch.phone,
    })
    setOpen(true)
  }

  const save = async () => {
    if (!form.name || !form.code) { toast.error('Nombre y código son obligatorios'); return }
    try {
      if (editing) await updateBranch(editing.id, form)
      else await createBranch({ ...form, isActive: true })
      setOpen(false)
      setEditing(null)
      setForm(emptyForm)
      await Promise.all([loadAllBranches(), loadBranches()])
      toast.success(editing ? 'Sucursal actualizada' : 'Sucursal creada')
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo guardar la sucursal')
    }
  }

  /** Abre la confirmación y consulta si la sucursal tiene información asociada */
  const askDelete = async (branch: Branch) => {
    setDeleteTarget(branch)
    setUsage(null)
    setHasData(false)
    setIsCheckingUsage(true)
    try {
      const data = await apiFetch<{ usage: BranchUsage; hasData: boolean }>(`/api/branches/${branch.id}`)
      setUsage(data.usage)
      setHasData(data.hasData)
    } catch {
      // Ante la duda, tratamos la sucursal como si tuviera datos
      setHasData(true)
    } finally {
      setIsCheckingUsage(false)
    }
  }

  const confirmDelete = async (mode: 'deactivate' | 'permanent') => {
    if (!deleteTarget) return
    setIsProcessing(true)
    try {
      await apiFetch(`/api/branches/${deleteTarget.id}?mode=${mode}`, { method: 'DELETE' })
      toast.success(
        mode === 'permanent'
          ? `Sucursal "${deleteTarget.name}" eliminada`
          : `Sucursal "${deleteTarget.name}" desactivada. Su información se conserva.`
      )
      setDeleteTarget(null)
      await Promise.all([loadAllBranches(), loadBranches()])
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo completar la operación')
    } finally {
      setIsProcessing(false)
    }
  }

  const reactivate = async (branch: Branch) => {
    try {
      await updateBranch(branch.id, { isActive: true })
      toast.success(`Sucursal "${branch.name}" reactivada`)
      await Promise.all([loadAllBranches(), loadBranches()])
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo reactivar la sucursal')
    }
  }

  const usageEntries = usage ? USAGE_LABELS.filter(({ key }) => usage[key] > 0) : []

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">Sucursales</h1>
          <p className="text-sm text-muted-foreground">Administra sucursales y sus cajas registradoras.</p>
        </div>
        {isAdmin && (
          <Button
            className="w-full sm:w-auto"
            onClick={() => { setEditing(null); setForm(emptyForm); setOpen(true) }}
          >
            <Plus className="mr-2 h-4 w-4" />Nueva sucursal
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {allBranches.map((branch) => (
          <Card
            key={branch.id}
            className={`${currentBranch?.id === branch.id ? 'border-primary' : ''} ${!branch.isActive ? 'opacity-70' : ''}`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <Building2 className="h-4 w-4 shrink-0" />
                    <span className="truncate">{branch.name}</span>
                  </CardTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">Código: {branch.code}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {currentBranch?.id === branch.id && <Badge>Activa</Badge>}
                  {!branch.isActive && <Badge variant="secondary">Desactivada</Badge>}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="text-xs">
                  {[branch.address, branch.city, branch.state].filter(Boolean).join(', ') || 'Sin dirección'}
                  {branch.postalCode ? ` CP ${branch.postalCode}` : ''}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0" />
                <span className="text-xs">{branch.phone || 'Sin teléfono'}</span>
              </div>

              {/* Botones de acción */}
              <div className="flex flex-wrap gap-2 pt-1">
                {branch.isActive ? (
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setCurrentBranchById(branch.id)}>
                    <Store className="mr-1.5 h-3.5 w-3.5" />Activar
                  </Button>
                ) : (
                  isAdmin && (
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => reactivate(branch)}>
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" />Reactivar
                    </Button>
                  )
                )}
                {isAdmin && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => startEdit(branch)}>Editar</Button>
                    {branch.isActive && (
                      <Button variant="destructive" size="sm" onClick={() => askDelete(branch)}>
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />Eliminar
                      </Button>
                    )}
                  </>
                )}
              </div>

              {/* Sección de cajas — solo admin */}
              {isAdmin && branch.isActive && (
                <>
                  <Separator />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-full justify-between text-xs"
                    onClick={() => handleToggleRegisters(branch.id)}
                  >
                    <span className="flex items-center gap-1.5">
                      <Wallet className="h-3.5 w-3.5" />
                      Cajas registradoras
                      {registers[branch.id] && (
                        <Badge variant="secondary" className="h-4 px-1.5 text-xs">
                          {registers[branch.id].filter((r) => r.isActive).length}
                        </Badge>
                      )}
                    </span>
                    {expandedBranch === branch.id
                      ? <ChevronUp className="h-3.5 w-3.5" />
                      : <ChevronDown className="h-3.5 w-3.5" />}
                  </Button>

                  {expandedBranch === branch.id && (
                    <div className="space-y-2 pt-1">
                      {loadingRegisters[branch.id] ? (
                        <p className="py-2 text-center text-xs text-muted-foreground">Cargando...</p>
                      ) : (
                        <>
                          {(registers[branch.id] || []).length === 0 ? (
                            <p className="py-1 text-center text-xs text-muted-foreground">Sin cajas registradas</p>
                          ) : (
                            <div className="space-y-1">
                              {(registers[branch.id] || []).map((reg) => (
                                <div key={reg.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-xs font-medium">{reg.name}</span>
                                    {!reg.isActive && (
                                      <Badge variant="secondary" className="h-4 px-1.5 text-xs">Inactiva</Badge>
                                    )}
                                  </div>
                                  {reg.isActive && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-destructive hover:text-destructive"
                                      onClick={() => handleDeleteRegister(branch.id, reg.id, reg.name)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex gap-2 pt-1">
                            <Input
                              placeholder="Nombre de la caja..."
                              value={newRegisterName[branch.id] || ''}
                              onChange={(e) => setNewRegisterName((p) => ({ ...p, [branch.id]: e.target.value }))}
                              className="h-8 flex-1 text-xs"
                              onKeyDown={(e) => e.key === 'Enter' && handleAddRegister(branch.id)}
                            />
                            <Button
                              size="sm"
                              className="h-8 px-3"
                              onClick={() => handleAddRegister(branch.id)}
                              disabled={!newRegisterName[branch.id]?.trim()}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Confirmación de baja de sucursal ── */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(value) => !value && setDeleteTarget(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Dar de baja sucursal
            </DialogTitle>
            <DialogDescription>
              ¿Seguro que deseas dar de baja la sucursal &quot;{deleteTarget?.name}&quot;?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {isCheckingUsage ? (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Revisando la información de la sucursal...
              </div>
            ) : hasData ? (
              <>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/20">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    Esta sucursal tiene información registrada
                  </p>
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                    Solo se puede <strong>desactivar</strong>. Así no se pierden ventas, cortes ni inventario,
                    y podrás reactivarla cuando quieras.
                  </p>
                </div>
                {usageEntries.length > 0 && (
                  <div className="space-y-1 rounded-lg border p-3 text-sm">
                    {usageEntries.map(({ key, label }) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium">{usage?.[key]}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-lg border p-3">
                <p className="text-sm">
                  Esta sucursal <strong>no tiene información registrada</strong>.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Puedes eliminarla por completo o solo desactivarla si piensas usarla más adelante.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setDeleteTarget(null)}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              variant={hasData ? 'destructive' : 'outline'}
              className="w-full sm:w-auto"
              onClick={() => confirmDelete('deactivate')}
              disabled={isProcessing || isCheckingUsage}
            >
              {isProcessing ? 'Procesando...' : 'Solo desactivar'}
            </Button>
            {!hasData && !isCheckingUsage && (
              <Button
                variant="destructive"
                className="w-full sm:w-auto"
                onClick={() => confirmDelete('permanent')}
                disabled={isProcessing}
              >
                {isProcessing ? 'Procesando...' : 'Eliminar definitivamente'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo crear/editar sucursal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-[95vw] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar sucursal' : 'Nueva sucursal'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Nombre</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre de la sucursal" />
            </div>
            <div className="space-y-2">
              <Label>Código</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="Ej: SUC1" />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="477 000 0000" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Dirección</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Calle y número" />
            </div>
            <div className="space-y-2">
              <Label>Ciudad</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Ciudad" />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="Estado" />
            </div>
            <div className="space-y-2">
              <Label>Código postal</Label>
              <Input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} placeholder="00000" />
            </div>
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button className="w-full sm:w-auto" onClick={save}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
