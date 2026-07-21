import { pool } from '@/lib/server/db'
import { DEFAULT_APP_SETTINGS, type AppSettings } from '@/lib/config/app-settings'

export const SETTINGS_KEY = 'app'

/** Lee la configuración del sistema. Si algo falla, regresa los valores por defecto. */
export async function readAppSettings(): Promise<AppSettings> {
  try {
    const res = await pool.query('SELECT value FROM app_settings WHERE key = $1', [SETTINGS_KEY])
    const stored = (res.rows[0]?.value || {}) as Partial<AppSettings>
    return { ...DEFAULT_APP_SETTINGS, ...stored }
  } catch {
    return DEFAULT_APP_SETTINGS
  }
}
