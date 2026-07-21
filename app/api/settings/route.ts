import { NextResponse } from 'next/server'
import { ensureDatabaseSetup } from '@/lib/server/setup'
import { pool } from '@/lib/server/db'
import { readAppSettings, SETTINGS_KEY } from '@/lib/server/settings'
import { DEFAULT_APP_SETTINGS, type AppSettings } from '@/lib/config/app-settings'

export async function GET() {
  await ensureDatabaseSetup()
  const settings = await readAppSettings()
  return NextResponse.json({ settings })
}

export async function PUT(request: Request) {
  await ensureDatabaseSetup()
  const data = await request.json()
  const current = await readAppSettings()

  const next: AppSettings = {
    businessName:
      String(data.businessName ?? current.businessName).trim().slice(0, 60) ||
      DEFAULT_APP_SETTINGS.businessName,
    tagline: String(data.tagline ?? current.tagline).trim().slice(0, 120),
    logoUrl: typeof data.logoUrl === 'string' ? data.logoUrl : current.logoUrl,
    ticketFooter: String(data.ticketFooter ?? current.ticketFooter).trim().slice(0, 200),
    invoicingEnabled: Boolean(data.invoicingEnabled ?? current.invoicingEnabled),
  }

  // El logo se guarda como data URL; se limita para no inflar la base de datos
  if (next.logoUrl && next.logoUrl.length > 400_000) {
    return NextResponse.json(
      { error: 'El logo es demasiado grande. Usa una imagen de menos de 300 KB.' },
      { status: 400 }
    )
  }

  await pool.query(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [SETTINGS_KEY, JSON.stringify(next)]
  )

  return NextResponse.json({ settings: next })
}
