"use client"

import { useEffect, useMemo, useState } from 'react'
import { Building2, MapPin, Phone, Plus, Store, Wallet, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useBranchStore } from '@/lib/stores/branch-store'
import { useAuthStore } from '@/lib/stores/auth-store'
import { apiFetch } from '@/lib/api/client'
import { toast } from 'sonner'
import type { Branch, CashRegister } from '@/lib/types'

const emptyForm = { name: '', code: '', address: '', city: '', state: '', postalCode: '', phone: '' }

export default function BranchesPage() {
  const { branches, currentBranch, loadBranches, setCurrentBranchById, createBranch, updateBranch, deleteBranch } = useBranchStore()
  const { user } = useAuthStore()
  const isAdmin = user?.role.permissions.includes('*') || user?.isGlobalAccess

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Branch | null>(null)
  const [form, setForm] = useState(emptyForm)

  // Cajas por sucursal
  const [registers, setRegisters] = useState<Record<string, CashRegister[]>>({})
  const [expandedBranch, setExpandedBranch] = useState<string | null>(null)
  const [newRegisterName, setNewRegisterName] = useState<Record<string, string>>({})
  const [loadingRegisters, setLoadingRegisters] = useState<Record<string, boolean>>({})

  const allBranches = useMemo(() => branches, [branches])

  useEffect(() => { loadBranches() }, [loadBranches])

  const loadRegisters = async (branchId: string) => {
    setLoadingRegisters(p => ({ ...p, [branchId]: true }))
    try {
      const data = await apiFetch<{ registers: CashRegister[] }>(
        `/api/cash/registers?branchId=${branchId}&all=true`
      )
      setRegisters(p => ({ ...p, [branchId]: data.registers }))
    } catch {
      toast.error('Error al cargar cajas')
    } finally {
      setLoadingRegisters(p => ({ ...p, [branchId]: false }))
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
      setNewRegisterName(p => ({ ...p, [branchId]: '' }))
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
    setForm({ name: branch.name, code: branch.code, address: branch.address, city: branch.city, state: branch.state, postalCode: branch.postalCode, phone: branch.phone })
    setOpen(true)
  }

  const save = async () => {
    if (!form.name || !form.code) { toast.error('Nombre y código son obligatorios'); return }
    if (editing) await updateBranch(editing.id, form)
    else await createBranch({ ...form, isActive: true })
    setOpen(false)
    setEditing(null)
    setForm(emptyForm)
    loadBranches()
    toast.success(editing ? 'Sucursal actualizada' : 'Sucursal creada')
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">Sucursales</h1>
          <p className="text-sm text-muted-foreground">Administra sucursales y sus cajas registradoras.</p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setEditing(null); setForm(emptyForm); setOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" />Nueva sucursal
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {allBranches.map((branch) => (
          <Card key={branch.id} className={currentBranch?.id === branch.id ? 'border-primary' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <Building2 className="h-4 w-4 shrink-0" />{branch.name}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Código: {branch.code}</p>
                </div>
                {currentBranch?.id === branch.id && <Badge className="shrink-0">Activa</Badge>}
              </div>
            </CardHeader>

            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="text-xs">{branch.address}, {branch.city}, {branch.state} CP {branch.postalCode}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0" />
                <span className="text-xs">{branch.phone || 'Sin teléfono'}</span>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-2 pt-1 flex-wrap">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setCurrentBranchById(branch.id)}>
                  <Store className="mr-1.5 h-3.5 w-3.5" />Activar
                </Button>
                {isAdmin && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => startEdit(branch)}>Editar</Button>
                    <Button variant="destructive" size="sm" onClick={() => { deleteBranch(branch.id); loadBranches() }}>
                      Desactivar
                    </Button>
                  </>
                )}
              </div>

              {/* Sección de cajas — solo admin */}
              {isAdmin && (
                <>
                  <Separator />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between text-xs h-8"
                    onClick={() => handleToggleRegisters(branch.id)}
                  >
                    <span className="flex items-center gap-1.5">
                      <Wallet className="h-3.5 w-3.5" />
                      Cajas registradoras
                      {registers[branch.id] && (
                        <Badge variant="secondary" className="h-4 px-1.5 text-xs">
                          {registers[branch.id].filter(r => r.isActive).length}
                        </Badge>
                      )}
                    </span>
                    {expandedBranch === branch.id
                      ? <ChevronUp className="h-3.5 w-3.5" />
                      : <ChevronDown className="h-3.5 w-3.5" />
                    }
                  </Button>

                  {expandedBranch === branch.id && (
                    <div className="space-y-2 pt-1">
                      {loadingRegisters[branch.id] ? (
                        <p className="text-xs text-muted-foreground text-center py-2">Cargando...</p>
                      ) : (
                        <>
                          {/* Lista de cajas existentes */}
                          {(registers[branch.id] || []).length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-1">Sin cajas registradas</p>
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

                          {/* Agregar nueva caja */}
                          <div className="flex gap-2 pt-1">
                            <Input
                              placeholder="Nombre de la caja..."
                              value={newRegisterName[branch.id] || ''}
                              onChange={(e) => setNewRegisterName(p => ({ ...p, [branch.id]: e.target.value }))}
                              className="h-8 text-xs flex-1"
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

      {/* Diálogo crear/editar sucursal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
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
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button className="w-full sm:w-auto" onClick={save}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
