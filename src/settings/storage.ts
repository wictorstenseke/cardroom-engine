import { DEFAULT_SETTINGS, type GameSettings } from './types'

const KEY = 'seven-stud-settings-v1'

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const p = JSON.parse(raw) as Partial<GameSettings>
    return {
      ...DEFAULT_SETTINGS,
      ...p,
      opponentCount: clamp(
        typeof p.opponentCount === 'number' ? p.opponentCount : DEFAULT_SETTINGS.opponentCount,
        1,
        6,
      ),
      handsPerLevel: clamp(
        typeof p.handsPerLevel === 'number' ? p.handsPerLevel : DEFAULT_SETTINGS.handsPerLevel,
        1,
        99,
      ),
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(s: GameSettings): void {
  localStorage.setItem(KEY, JSON.stringify(s))
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}
