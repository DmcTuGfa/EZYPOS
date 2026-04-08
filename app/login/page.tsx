'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Store, AlertCircle, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoading, error, clearError, user, initialize, isInitialized } = useAuthStore()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (!isInitialized) {
      initialize()
    }
  }, [initialize, isInitialized])

  useEffect(() => {
    if (user) {
      router.push('/pos')
    }
  }, [user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    
    const success = await login(email, password)
    if (success) {
      router.push('/pos')
    }
  }

  const handleDemoLogin = async (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail)
    setPassword(demoPassword)
    clearError()
    
    const success = await login(demoEmail, demoPassword)
    if (success) {
      router.push('/pos')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo y Título */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground">
              <Store className="w-7 h-7" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">VentaMX</h1>
          <p className="text-muted-foreground text-sm">Sistema de Punto de Venta</p>
        </div>

        {/* Card de Login */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Iniciar Sesión</CardTitle>
            <CardDescription>
              Ingresa tus credenciales para acceder al sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Tu contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="sr-only">
                      {showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    </span>
                  </Button>
                </div>
              </div>
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Spinner className="mr-2" />
                    Iniciando sesión...
                  </>
                ) : (
                  'Iniciar Sesión'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Usuarios Demo */}
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Usuarios de Demostración</CardTitle>
            <CardDescription className="text-xs">
              Haz clic para iniciar sesión automáticamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-left h-auto py-2"
              onClick={() => handleDemoLogin('admin@ventamx.com', 'admin123')}
              disabled={isLoading}
            >
              <div className="flex flex-col items-start">
                <span className="font-medium">Administrador</span>
                <span className="text-xs text-muted-foreground">admin@ventamx.com</span>
              </div>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-left h-auto py-2"
              onClick={() => handleDemoLogin('supervisor@ventamx.com', 'supervisor123')}
              disabled={isLoading}
            >
              <div className="flex flex-col items-start">
                <span className="font-medium">Supervisor</span>
                <span className="text-xs text-muted-foreground">supervisor@ventamx.com</span>
              </div>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-left h-auto py-2"
              onClick={() => handleDemoLogin('cajero@ventamx.com', 'cajero123')}
              disabled={isLoading}
            >
              <div className="flex flex-col items-start">
                <span className="font-medium">Cajero</span>
                <span className="text-xs text-muted-foreground">cajero@ventamx.com</span>
              </div>
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          VentaMX v1.0 - Sistema POS para México
        </p>
      </div>
    </div>
  )
}
