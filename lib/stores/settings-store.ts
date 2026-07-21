import { create } from 'zustand'
import { apiFetch } from '@/lib/api/client'
import { DEFAULT_APP_SETTINGS, type AppSettings } from '@/lib/config/app-settings'

interface SettingsState {
  settings: AppSettings
  isLoaded: boolean
  isSaving: boolean
  loadSettings: () => Promise<void>
  saveSettings: (data: Partial<AppSettings>) => Promise<AppSettings>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_APP_SETTINGS,
  isLoaded: false,
  isSaving: false,

  loadSettings: async () => {
    try {
      const data = await apiFetch<{ settings: AppSettings }>('/api/settings')
      set({ settings: { ...DEFAULT_APP_SETTINGS, ...data.settings }, isLoaded: true })
    } catch {
      set({ settings: DEFAULT_APP_SETTINGS, isLoaded: true })
    }
  },

  saveSettings: async (data) => {
    set({ isSaving: true })
    try {
      const res = await apiFetch<{ settings: AppSettings }>('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({ ...get().settings, ...data }),
      })
      const settings = { ...DEFAULT_APP_SETTINGS, ...res.settings }
      set({ settings, isLoaded: true })
      return settings
    } finally {
      set({ isSaving: false })
    }
  },
}))
