import { HeldDirections } from './heldDirections'

export type KeyAction = 'pause' | 'start'

export interface KeyboardHandlers {
  move(dir: -1 | 0 | 1): void
  jump(pressed: boolean): void
  action(a: KeyAction): void
}

export interface KeyLike {
  code: string
  repeat: boolean
}

const WALK: Record<string, { id: number; dir: -1 | 1 }> = {
  ArrowLeft: { id: 1, dir: -1 },
  KeyA: { id: 2, dir: -1 },
  ArrowRight: { id: 3, dir: 1 },
  KeyD: { id: 4, dir: 1 },
}
const JUMP = new Set(['ArrowUp', 'KeyW', 'Space'])
const ACTIONS: Record<string, KeyAction> = { Escape: 'pause', KeyP: 'pause', Enter: 'start', Space: 'start' }

/** Keyboard → game input. Space both jumps and starts a turn; the caller decides which applies. */
export class KeyboardInput {
  private readonly walk = new HeldDirections()
  private readonly jumpKeys = new Set<string>()

  constructor(private readonly h: KeyboardHandlers) {}

  keydown(e: KeyLike): boolean {
    let handled = false
    const w = WALK[e.code]
    if (w) {
      if (!e.repeat) this.h.move(this.walk.press(w.id, w.dir))
      handled = true
    }
    if (JUMP.has(e.code)) {
      if (!e.repeat && !this.jumpKeys.has(e.code)) {
        this.jumpKeys.add(e.code)
        this.h.jump(true)
      }
      handled = true
    }
    const a = ACTIONS[e.code]
    if (a) {
      if (!e.repeat) this.h.action(a)
      handled = true
    }
    return handled
  }

  keyup(e: KeyLike): boolean {
    const w = WALK[e.code]
    if (w) this.h.move(this.walk.release(w.id))
    if (JUMP.has(e.code) && this.jumpKeys.delete(e.code) && this.jumpKeys.size === 0) this.h.jump(false)
    return !!w || JUMP.has(e.code)
  }

  reset(): void {
    for (const w of Object.values(WALK)) this.walk.release(w.id)
    this.jumpKeys.clear()
    this.h.move(0)
    this.h.jump(false)
  }
}
