import { reactive } from 'vue'
import { sfx } from '../game/audio/sfx'
import type { MapId, MatchConfig } from '../game/core/types'
import { logger } from '../lib/logger'

export type Screen = 'menu' | 'setup' | 'match'
export type SetupChoice = Omit<MatchConfig, 'seed'>

const SETUP_KEY = 'wr.setup'

function loadSetup(): SetupChoice {
  const fallback: SetupChoice = { mapId: 'pizza', players: 2, turnTime: 45 }
  try {
    const raw = localStorage.getItem(SETUP_KEY)
    if (!raw) return fallback
    const v = JSON.parse(raw) as Partial<SetupChoice>
    const maps: MapId[] = ['sink', 'pizza', 'sofa', 'moon', 'cake']
    return {
      mapId: v.mapId && maps.includes(v.mapId) ? v.mapId : fallback.mapId,
      players: v.players === 3 || v.players === 4 ? v.players : 2,
      turnTime: v.turnTime === 30 || v.turnTime === 60 ? v.turnTime : 45,
    }
  } catch (err) {
    logger.warn('could not read saved setup', { error: String(err) })
    return fallback
  }
}

export const store = reactive({
  screen: 'menu' as Screen,
  setup: loadSetup(),
  config: { ...loadSetup(), seed: 1 } as MatchConfig,
  muted: sfx.isMuted(),
  matchKey: 0,
  portrait: false,
})

export function go(screen: Screen): void {
  store.screen = screen
}

export function startMatch(choice: SetupChoice): void {
  store.setup = { ...choice }
  try {
    localStorage.setItem(SETUP_KEY, JSON.stringify(choice))
  } catch (err) {
    logger.warn('could not save setup', { error: String(err) })
  }
  store.config = { ...choice, seed: Math.floor(Math.random() * 2 ** 31) }
  store.matchKey++
  store.screen = 'match'
}

export function toggleMute(): void {
  store.muted = !store.muted
  sfx.setMuted(store.muted)
  if (!store.muted) sfx.unlock()
}

/** Fullscreen + landscape lock; both are best-effort and unsupported on some browsers. */
export async function enterImmersive(): Promise<void> {
  sfx.unlock()
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen({ navigationUI: 'hide' })
  } catch (err) {
    logger.warn('fullscreen unavailable', { error: String(err) })
  }
  try {
    const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }
    await o.lock?.('landscape')
  } catch (err) {
    logger.warn('orientation lock unavailable', { error: String(err) })
  }
}
