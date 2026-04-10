'use client'

import { useEffect } from 'react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useBranchStore } from '@/lib/stores/branch-store'
import { useCashStore } from '@/lib/stores/cash-store'
import { Building2 , Calculator} from 'lucide-react'
import { ModeToggle } from "@/components/mode-toggle"

const routeTitles: Record<string, { title: string; parent?: { title: string; href: string } }> = {
  '/pos': { title: 'Punto de Venta' },
  '/cash-register': { title: 'Corte de Caja' },
  '/dashboard': { title: 'Dashboard' },
  '/products': { title: 'Productos' },
  '/inventory': { title: 'Inventario' },
  '/customers': { title: 'Clientes' },
  '/sales': { title: 'Historial de Ventas' },
  '/invoices': { title: 'Facturación' },
  '/branches': { title: 'Sucursales' },
  '/users': { title: 'Usuarios' },
  '/reports': { title: 'Reportes' },
  '/settings': { title: 'Configuración' },
}

export function AppHeader() {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const { branches, currentBranch, loadBranches, setCurrentBranchById } = useBranchStore()
  const { currentSession, loadCurrentSession } = useCashStore()

  useEffect(() => {
    loadBranches()
  }, [loadBranches])

  useEffect(() => {
    if (user) {
      loadCurrentSession(user.id)
    }
  }, [user, loadCurrentSession])

  // Get the best matching route
  const getRouteInfo = () => {
    // Try exact match first
    if (routeTitles[pathname]) {
      return routeTitles[pathname]
    }
    
    // Try to find a parent match
    const segments = pathname.split('/').filter(Boolean)
    if (segments.length > 1) {
      const parentPath = '/' + segments[0]
      if (routeTitles[parentPath]) {
        return {
          title: 'Detalle',
          parent: {
            title: routeTitles[parentPath].title,
            href: parentPath,
          },
        }
      }
    }
    
    return { title: 'VentaMX' }
  }

  const routeInfo = getRouteInfo()

  const canChangeBranch = user?.isGlobalAccess || user?.role.name === 'admin'

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      
      <Breadcrumb className="flex-1">
        <BreadcrumbList>
          {routeInfo.parent && (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink href={routeInfo.parent.href}>
                  {routeInfo.parent.title}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          )}
          <BreadcrumbItem>
            <BreadcrumbPage>{routeInfo.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center gap-3">
        {/* Indicador de estado de caja */}
        {currentSession && (
          <Badge variant="secondary" className="hidden sm:flex gap-1.5">
            <span className="size-2 rounded-full bg-green-500 animate-pulse" />
            Caja Abierta
          </Badge>
        )}

        {/* Selector de sucursal */}
        {canChangeBranch && branches.length > 1 ? (
          <Select
            value={currentBranch?.id || ''}
            onValueChange={setCurrentBranchById}
          >
            <SelectTrigger className="w-[180px] h-9">
              <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Selecciona sucursal" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          currentBranch && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">{currentBranch.name}</span>
            </div>
          )
        )}
      </div>
      <div className="ml-auto flex items-center gap-2"><ModeToggle /></div>
</header>
  )
}