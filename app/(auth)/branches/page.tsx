"use client"

import { useEffect, useMemo, useState } from 'react'
import { Building2, MapPin, Phone, Plus, Store } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useBranchStore } from '@/lib/stores/branch-store'
import type { Branch } from '@/lib/types'

const emptyForm = { name: '', code: '', address: '', city: '', state: '', postalCode: '', phone: '' }

export default function BranchesPage() {
  const { branches, currentBranch, loadBranches, setCurrentBranchById, createBranch, updateBranch, deleteBranch } = useBranchStore()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Branch | null>(null)
  const [form, setForm] = useState(emptyForm)
  const allBranches = useMemo(() => branches, [branches])

  useEffect(() => { loadBranches() }, [loadBranches])

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

  const save = () => {
    if (!form.name || !form.code) return
    if (editing) updateBranch(editing.id, form)
    else createBranch({ ...form, isActive: true })
    setOpen(false)
    setEditing(null)
    setForm(emptyForm)
    loadBranches()
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sucursales</h1>
          <p className="text-muted-foreground">Administra las sucursales y selecciona la activa.</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm(emptyForm); setOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" /> Nueva sucursal
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {allBranches.map((branch) => (
          <Card key={branch.id} className={currentBranch?.id === branch.id ? 'border-primary' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Building2 className="h-5 w-5" /> {branch.name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">Código: {branch.code}</p>
                </div>
                {currentBranch?.id === branch.id && <Badge>Sucursal activa</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2 text-muted-foreground"><MapPin className="mt-0.5 h-4 w-4" /> <span>{branch.address}, {branch.city}, {branch.state}, CP {branch.postalCode}</span></div>
              <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4" /> <span>{branch.phone}</span></div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setCurrentBranchById(branch.id)}>
                  <Store className="mr-2 h-4 w-4" /> Activar
                </Button>
                <Button variant="outline" onClick={() => startEdit(branch)}>Editar</Button>
                <Button variant="destructive" onClick={() => { deleteBranch(branch.id); loadBranches() }}>Desactivar</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar sucursal' : 'Nueva sucursal'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2"><Label>Nombre</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Código</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></div>
            <div className="space-y-2"><Label>Teléfono</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Dirección</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="space-y-2"><Label>Ciudad</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div className="space-y-2"><Label>Estado</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
            <div className="space-y-2"><Label>Código postal</Label><Input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
