"use client"

import { useEffect, useMemo, useState } from 'react'
import { Plus, UserCog } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useBranchStore } from '@/lib/stores/branch-store'
import { useUsersStore } from '@/lib/stores/users-store'
import { formatUserRole } from '@/lib/utils/format'
import type { User } from '@/lib/types'

const emptyForm = { name: '', email: '', passwordHash: '', roleId: '', branchId: 'none', isGlobalAccess: false, isActive: true }

export default function UsersPage() {
  const { users, roles, loadUsers, loadRoles, createUser, updateUser, toggleUserStatus } = useUsersStore()
  const { branches, loadBranches } = useBranchStore()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { loadUsers(); loadRoles(); loadBranches() }, [loadUsers, loadRoles, loadBranches])

  const usersView = useMemo(() => users.map((user) => ({
    ...user,
    roleName: roles.find((role) => role.id === user.roleId)?.name || '',
    branchName: branches.find((branch) => branch.id === user.branchId)?.name || 'Global',
  })), [users, roles, branches])

  const save = () => {
    if (!form.name || !form.email || !form.roleId) return
    const payload = {
      ...form,
      branchId: form.branchId === 'none' ? null : form.branchId,
    }
    if (editing) updateUser(editing.id, payload)
    else createUser(payload)
    setOpen(false)
    setEditing(null)
    setForm(emptyForm)
  }

  const edit = (user: User) => {
    setEditing(user)
    setForm({
      name: user.name,
      email: user.email,
      passwordHash: '',
      roleId: user.roleId,
      branchId: user.branchId || 'none',
      isGlobalAccess: user.isGlobalAccess,
      isActive: user.isActive,
    })
    setOpen(true)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
          <p className="text-muted-foreground">Altas, edición y activación de accesos.</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm(emptyForm); setOpen(true) }}><Plus className="mr-2 h-4 w-4" /> Nuevo usuario</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><UserCog className="h-5 w-5" /> Gestión de usuarios</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Estatus</TableHead>
                  <TableHead className="w-[180px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersView.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{formatUserRole(user.roleName)}</TableCell>
                    <TableCell>{user.branchName}</TableCell>
                    <TableCell>{user.isActive ? <Badge>Activo</Badge> : <Badge variant="secondary">Inactivo</Badge>}</TableCell>
                    <TableCell className="space-x-2">
                      <Button variant="outline" size="sm" onClick={() => edit(user)}>Editar</Button>
                      <Button variant={user.isActive ? 'destructive' : 'default'} size="sm" onClick={() => toggleUserStatus(user.id)}>
                        {user.isActive ? 'Desactivar' : 'Activar'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2"><Label>Nombre</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Correo</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value.toLowerCase() })} /></div>
            <div className="space-y-2"><Label>Contraseña {editing && <span className="text-xs text-muted-foreground font-normal">(dejar vacío para no cambiar)</span>}</Label><Input type="password" value={form.passwordHash} placeholder={editing ? "••••••••" : "Contraseña"} onChange={(e) => setForm({ ...form, passwordHash: e.target.value })} /></div>
            <div className="space-y-2"><Label>Rol</Label>
              <Select value={form.roleId} onValueChange={(value) => setForm({ ...form, roleId: value })}>
                <SelectTrigger><SelectValue placeholder="Selecciona rol" /></SelectTrigger>
                <SelectContent>{roles.map((role) => <SelectItem key={role.id} value={role.id}>{role.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Sucursal</Label>
              <Select value={form.branchId} onValueChange={(value) => setForm({ ...form, branchId: value })}>
                <SelectTrigger><SelectValue placeholder="Sucursal" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin sucursal / global</SelectItem>
                  {branches.map((branch) => <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
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
