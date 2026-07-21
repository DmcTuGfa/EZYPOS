"use client"

import { useEffect, useState } from "react"
import { Save, Settings, UserRound, Store, Upload, X, FileText } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuthStore } from "@/lib/stores/auth-store"
import { useUsersStore } from "@/lib/stores/users-store"
import { useSettingsStore } from "@/lib/stores/settings-store"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

export default function SettingsPage() {
  const { user, updateCurrentUser } = useAuthStore()
  const { updateUser } = useUsersStore()
  const { settings, loadSettings, saveSettings, isSaving } = useSettingsStore()

  const isAdmin = user?.role?.permissions?.includes("*") || user?.isGlobalAccess

  const [branding, setBranding] = useState({
    businessName: "",
    tagline: "",
    logoUrl: "",
    ticketFooter: "",
    invoicingEnabled: false,
  })

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [passwordHash, setPasswordHash] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  useEffect(() => {
    setBranding({
      businessName: settings.businessName,
      tagline: settings.tagline,
      logoUrl: settings.logoUrl,
      ticketFooter: settings.ticketFooter,
      invoicingEnabled: settings.invoicingEnabled,
    })
  }, [settings])

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Selecciona un archivo de imagen")
      return
    }
    if (file.size > 300 * 1024) {
      toast.error("El logo debe pesar menos de 300 KB")
      return
    }
    const reader = new FileReader()
    reader.onload = () => setBranding((prev) => ({ ...prev, logoUrl: String(reader.result || "") }))
    reader.onerror = () => toast.error("No se pudo leer la imagen")
    reader.readAsDataURL(file)
  }

  const handleSaveBranding = async () => {
    if (!branding.businessName.trim()) {
      toast.error("El nombre del negocio es obligatorio")
      return
    }
    try {
      await saveSettings(branding)
      toast.success("Configuración del negocio guardada")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar")
    }
  }

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
        <p className="text-muted-foreground">Personaliza el sistema y administra tu cuenta.</p>
      </div>

      {isAdmin && (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Identidad del negocio
            </CardTitle>
            <CardDescription>
              El nombre y el logo aparecen en la pantalla de inicio de sesión, en el menú lateral y
              en los comprobantes digitales.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="businessName">Nombre del negocio</Label>
              <Input
                id="businessName"
                value={branding.businessName}
                onChange={(e) => setBranding({ ...branding, businessName: e.target.value })}
                placeholder="Ej. Abarrotes La Esquina"
                maxLength={60}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagline">Frase de la pantalla de inicio</Label>
              <Input
                id="tagline"
                value={branding.tagline}
                onChange={(e) => setBranding({ ...branding, tagline: e.target.value })}
                placeholder="Sistema de Punto de Venta"
                maxLength={120}
              />
            </div>

            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
                  {branding.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={branding.logoUrl} alt="Logo" className="max-h-16 max-w-16 object-contain" />
                  ) : (
                    <Store className="h-7 w-7 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <label className="cursor-pointer">
                      <Upload className="mr-2 h-4 w-4" />
                      Subir logo
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    </label>
                  </Button>
                  {branding.logoUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setBranding({ ...branding, logoUrl: "" })}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Quitar
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                PNG o JPG de menos de 300 KB. Se recomienda fondo transparente y forma cuadrada.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ticketFooter">Mensaje al pie del ticket</Label>
              <Textarea
                id="ticketFooter"
                value={branding.ticketFooter}
                onChange={(e) => setBranding({ ...branding, ticketFooter: e.target.value })}
                placeholder="¡Gracias por su compra!"
                rows={2}
                maxLength={200}
              />
            </div>

            <Separator />

            <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
              <div className="space-y-1">
                <p className="flex items-center gap-2 font-medium">
                  <FileText className="h-4 w-4" />
                  Módulo de facturación CFDI
                </p>
                <p className="text-xs text-muted-foreground">
                  Desactivado por ahora. El módulo aún no se conecta a un PAC autorizado, así que
                  no emite CFDI válidos ante el SAT. Actívalo solo cuando ya esté conectado el
                  servicio de timbrado del negocio.
                </p>
              </div>
              <Switch
                checked={branding.invoicingEnabled}
                onCheckedChange={(checked) => setBranding({ ...branding, invoicingEnabled: checked })}
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveBranding} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Guardando..." : "Guardar configuración"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
