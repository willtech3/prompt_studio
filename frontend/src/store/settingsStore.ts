import { create } from 'zustand'

type ProviderID = 'openai' | 'anthropic' | 'google' | 'xai' | 'deepseek'

interface SettingsState {
  enabledProviders: Record<ProviderID, boolean>
  font: 'system' | 'inter' | 'mono'
  toggleProvider: (id: ProviderID) => void
  setFont: (font: SettingsState['font']) => void
}

const defaultState: SettingsState = {
  enabledProviders: {
    openai: true,
    anthropic: true,
    google: true,
    xai: true,
    deepseek: true,
  },
  font: 'system',
  toggleProvider: () => {},
  setFont: () => {},
}

function load(): SettingsState {
  try {
    const raw = localStorage.getItem('ps:settings')
    if (!raw) return defaultState
    const parsed = JSON.parse(raw)
    return { ...defaultState, ...parsed }
  } catch {
    return defaultState
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...load(),
  toggleProvider: (id) => set((s) => {
    const next = { ...s.enabledProviders, [id]: !s.enabledProviders[id] }
    const out = { ...s, enabledProviders: next }
    try { localStorage.setItem('ps:settings', JSON.stringify({ enabledProviders: next, font: s.font })) } catch {}
    return out
  }),
  setFont: (font) => set((s) => {
    try { localStorage.setItem('ps:settings', JSON.stringify({ enabledProviders: s.enabledProviders, font })) } catch {}
    // apply live font choice (basic MVP)
    if (font === 'mono') document.documentElement.style.setProperty('--app-font', 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace')
    else if (font === 'inter') document.documentElement.style.setProperty('--app-font', 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Noto Sans, "Apple Color Emoji", "Segoe UI Emoji"')
    else document.documentElement.style.removeProperty('--app-font')
    return { ...s, font }
  }),
}))

