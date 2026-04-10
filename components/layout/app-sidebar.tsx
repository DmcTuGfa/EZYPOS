'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useBranchStore } from '@/lib/stores/branch-store'
import { useCashStore } from '@/lib/stores/cash-store'
import { getInitials } from '@/lib/utils/format'
import { toast } from 'sonner'
import {
  Store,
  ShoppingCart,
  LayoutDashboard,
  Package,
  Boxes,
  Users,
  FileText,
  Receipt,
  Building2,
  UserCog,
  BarChart3,
  Settings,
  LogOut,
  ChevronUp,
  Wallet,
  CircleDot,
, Calculator} from 'lucide-react'

const mainNavItems = [
  {
    title: 'Punto de Venta',
    url: '/pos',
    icon: ShoppingCart,
    permission: 'pos',
  },
  {
    title: 'Caja',
    url: '/cash-register',
    icon: Wallet,
    permission: 'cash',
  },
]

const catalogNavItems = [
  {
    title: 'Productos',
    url: '/products',
    icon: Package,
    permission: 'products.view',
  },
  {
    title: 'Inventario',
    url: '/inventory',
    icon: Boxes,
    permission: 'inventory',
  },
  {
    title: 'Clientes',
    url: '/customers',
    icon: Users,
    permission: 'customers',
  },
]

const salesNavItems = [
  {
    title: 'Historial de Ventas',
    url: '/sales',
    icon: Receipt,
    permission: 'sales.view',
  },
  {
    title: 'Facturación',
    url: '/invoices',
    icon: FileText,
    permission: 'invoices',
  },
]

const adminNavItems = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboard,
    permission: 'dashboard',
  },
  {
    title: 'Reportes',
    url: '/reports',
    icon: BarChart3,
    permission: 'reports',
  },
  {
    title: 'Sucursales',
    url: '/branches',
    icon: Building2,
    permission: 'branches',
  },
  {
    title: 'Usuarios',
    url: '/users',
    icon: UserCog,
    permission: 'users',
  },
  {
    title: 'Configuración',
    url: '/settings',
    icon: Settings,
    permission: 'settings',
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout, hasPermission } = useAuthStore()
  const { currentBranch } = useBranchStore()
  const { currentSession } = useCashStore()

  const handleLogout = () => {
    if (currentSession) {
      toast.error('Debes cerrar caja antes de cerrar sesión')
      router.push('/cash-register')
      return
    }
    logout()
    router.push('/login')
  }

  const canView = (permission: string) => {
    if (permission === 'settings') return true
    if (user?.role.permissions.includes('*')) return true
    return hasPermission(permission) || hasPermission(permission.split('.')[0])
  }

  const filterItems = (items: typeof mainNavItems) => {
    return items.filter((item) => canView(item.permission))
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/pos">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Store className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">VentaMX</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {currentBranch?.name || 'Sin sucursal'}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Estado de Caja */}
        <SidebarGroup>
          <SidebarGroupContent>
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/50">
              <CircleDot 
                className={`size-3 ${currentSession ? 'text-green-500' : 'text-muted-foreground'}`} 
              />
              <span className="text-xs truncate group-data-[collapsible=icon]:hidden">
                {currentSession ? 'Caja Abierta' : 'Caja Cerrada'}
              </span>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Navegación Principal */}
        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filterItems(mainNavItems).map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Catálogos */}
        {filterItems(catalogNavItems).length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Catálogos</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filterItems(catalogNavItems).map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.url || pathname.startsWith(item.url + '/')}
                      tooltip={item.title}
                    >
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Ventas */}
        {filterItems(salesNavItems).length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Ventas</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filterItems(salesNavItems).map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.url || pathname.startsWith(item.url + '/')}
                      tooltip={item.title}
                    >
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Administración */}
        {filterItems(adminNavItems).length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Administración</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filterItems(adminNavItems).map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.url || pathname.startsWith(item.url + '/')}
                      tooltip={item.title}
                    >
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="size-8">
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      {user ? getInitials(user.name) : 'US'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user?.name || 'Usuario'}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user?.role.label || 'Sin rol'}
                    </span>
                  </div>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                side="top"
                align="end"
                sideOffset={4}
              >
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings className="mr-2 size-4" />
                    Configuración
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 size-4" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
