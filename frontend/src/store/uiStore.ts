import { create } from 'zustand'

interface UIState {
  settingsOpen: boolean
  openSettings: () => void
  closeSettings: () => void
  toggleSettings: () => void
  leftOpen: boolean
  openLeft: () => void
  closeLeft: () => void
  toggleLeft: () => void
  leftWidth: number
  setLeftWidth: (width: number) => void
  rightWidth: number
  setRightWidth: (width: number) => void
  userSettingsOpen: boolean
  openUserSettings: () => void
  closeUserSettings: () => void
  toggleUserSettings: () => void
  promptGuidanceOpen: boolean
  openPromptGuidance: () => void
  closePromptGuidance: () => void
}

export const useUIStore = create<UIState>((set, get) => ({
  settingsOpen: false,
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  toggleSettings: () => set({ settingsOpen: !get().settingsOpen }),
  leftOpen: false,
  openLeft: () => set({ leftOpen: true }),
  closeLeft: () => set({ leftOpen: false }),
  toggleLeft: () => set({ leftOpen: !get().leftOpen }),
  leftWidth: 384, // default w-96
  setLeftWidth: (width: number) => set({ leftWidth: Math.max(280, Math.min(width, 600)) }),
  rightWidth: 480, // default
  setRightWidth: (width: number) => set({ rightWidth: Math.max(320, Math.min(width, 800)) }),
  userSettingsOpen: false,
  openUserSettings: () => set({ userSettingsOpen: true }),
  closeUserSettings: () => set({ userSettingsOpen: false }),
  toggleUserSettings: () => set({ userSettingsOpen: !get().userSettingsOpen }),
  promptGuidanceOpen: false,
  openPromptGuidance: () => set({ promptGuidanceOpen: true }),
  closePromptGuidance: () => set({ promptGuidanceOpen: false }),
}))
