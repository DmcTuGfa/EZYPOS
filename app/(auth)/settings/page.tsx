"use client"

import { useEffect, useState } from "react"
import { Save, Settings, UserRound } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuthStore } from "@/lib/stores/auth-store"
import { useUsersStore } from "@/lib/stores/users-store"
import { toast } from "sonner"

export default function SettingsPage() {
  const { user, updateCurrentUser } = useAuthStore()
  const { updateUser } = useUsersStore()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [passwordHash, setPasswordHash] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setName(user.name || "")
      setEmail(user.email || "")
      setPasswordHash("")
      setConfirmPassword("")
    }
  }, [user])

  const handleSave = async () => {
    if (!user) return
    if (!name.trim() || !email.trim()) {
      toast.error("Nombre y correo son obligatorios")
      return
    }
    if (passwordHash && passwordHash !== confirmPassword) {
      toast.error("Las contraseñas no coinciden")
      return
    }

    setSaving(true)
    try {
      const updated = await updateUser(user.id, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        ...(passwordHash ? { passwordHash } : {}),
      } as any)

      if (!updated) {
        toast.error("No se pudo actualizar la cuenta")
        return
      }

      updateCurrentUser({
        ...user,
        ...updated,
        name: updated.name,
        email: updated.email,
      } as any)

      setPasswordHash("")
      setConfirmPassword("")
      toast.success("Cuenta actualizada")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar cambios")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">Actualiza tu nombre, correo y contraseña.</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Cuenta de usuario
          </CardTitle>
          <CardDescription>
            Esta sección está disponible desde el panel general y desde el menú del usuario.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <div className="rounded-full bg-primary/10 p-3">
              <UserRound className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">{user?.name || "Usuario"}</p>
              <p className="text-sm text-muted-foreground">{user?.role?.label || ""}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre completo" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@empresa.com" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="password">Nueva contraseña</Label>
              <Input id="password" type="password" value={passwordHash} onChange={(e) => setPasswordHash(e.target.value)} placeholder="Opcional" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repite la contraseña" />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
