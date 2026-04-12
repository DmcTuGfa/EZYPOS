'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppHeader } from '@/components/layout/app-header'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useBranchStore } from '@/lib/stores/branch-store'
import { Spinner } from '@/components/ui/spinner'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, isInitialized, initialize } = useAuthStore()
  const { loadBranches, setCurrentBranchById, currentBranch } = useBranchStore()

  useEffect(() => {
    if (!isInitialized) {
      initialize()
    }
  }, [initialize, isInitialized])

  useEffect(() => {
    if (isInitialized && !user) {
      router.push('/login')
    }
  }, [user, isInitialized, router])

  useEffect(() => {
    if (user) {
      loadBranches().then(() => {
        // Llamar después de que las sucursales cargaron
        if (user.branch) {
          setCurrentBranchById(user.branch.id)
        }
      })
    }
  }, [user, loadBranches, setCurrentBranchById])

  // Show loading state while checking auth
  if (!isInitialized || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-8 w-8" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
