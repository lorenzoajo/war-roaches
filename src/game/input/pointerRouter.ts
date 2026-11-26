import type { Vec2 } from '../core/types'
import { aimFromDrag, isInAimZone, pinchZoom, type AimResult } from './gestures'

export type PointerIntent =
  | { kind: 'aim'; aim: AimResult }
  | { kind: 'aimRelease'; aim: AimResult }
  | { kind: 'pan'; dx: number; dy: number }
  | { kind: 'pinch'; zoom: number; center: Vec2 }
  | { kind: 'tap'; screen: Vec2 }

export interface PointerRouterOptions {
  getRoachScreen(): { pos: Vec2; radiusPx: number } | null
  canAim(): boolean
  getZoom(): number
  onIntent(i: PointerIntent): void
}

type Mode = 'none' | 'aim' | 'press' | 'pan' | 'pinch'

const TAP_MS = 250
const TAP_MOVE = 10

export class PointerRouter {
  private pointers = new Map<number, Vec2>()
  private mode: Mode = 'none'
  private downAt = 0
  private downPos: Vec2 = { x: 0, y: 0 }
  private last: Vec2 = { x: 0, y: 0 }
  private pinchStart = { dist: 0, zoom: 1 }
  private lastAim: AimResult | null = null

  constructor(
    private readonly el: HTMLElement,
    private readonly opts: PointerRouterOptions,
  ) {
    el.addEventListener('pointerdown', this.onDown)
    el.addEventListener('pointermove', this.onMove)
    el.addEventListener('pointerup', this.onUp)
    el.addEventListener('pointercancel', this.onUp)
  }

  destroy(): void {
    this.el.removeEventListener('pointerdown', this.onDown)
    this.el.removeEventListener('pointermove', this.onMove)
    this.el.removeEventListener('pointerup', this.onUp)
    this.el.removeEventListener('pointercancel', this.onUp)
  }

  private local(e: PointerEvent): Vec2 {
    const rect = this.el.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  private pinchInfo(): { dist: number; center: Vec2 } {
    const [a, b] = [...this.pointers.values()]
    if (!a || !b) return { dist: 0, center: { x: 0, y: 0 } }
    return { dist: Math.hypot(a.x - b.x, a.y - b.y), center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } }
  }

  private cancelAim(): void {
    if (this.mode === 'aim' && this.lastAim) this.opts.onIntent({ kind: 'aimRelease', aim: { ...this.lastAim, cancel: true } })
    this.lastAim = null
  }

  private onDown = (e: PointerEvent): void => {
    const p = this.local(e)
    this.pointers.set(e.pointerId, p)
    this.el.setPointerCapture?.(e.pointerId)
    if (this.pointers.size === 2) {
      this.cancelAim()
      this.mode = 'pinch'
      this.pinchStart = { dist: this.pinchInfo().dist, zoom: this.opts.getZoom() }
      return
    }
    if (this.pointers.size > 2) return
    this.downAt = performance.now()
    this.downPos = p
    this.last = p
    const roach = this.opts.getRoachScreen()
    if (roach && this.opts.canAim() && isInAimZone(p, roach.pos, roach.radiusPx)) {
      this.mode = 'aim'
      this.emitAim(p, 'aim')
    } else this.mode = 'press'
  }

  private emitAim(p: Vec2, kind: 'aim' | 'aimRelease'): void {
    const roach = this.opts.getRoachScreen()
    if (!roach) return
    const aim = aimFromDrag(roach.pos, p, roach.radiusPx)
    this.lastAim = aim
    this.opts.onIntent({ kind, aim } as PointerIntent)
  }

  private onMove = (e: PointerEvent): void => {
    if (!this.pointers.has(e.pointerId)) return
    const p = this.local(e)
    this.pointers.set(e.pointerId, p)
    switch (this.mode) {
      case 'aim':
        this.emitAim(p, 'aim')
        break
      case 'press':
        if (Math.hypot(p.x - this.downPos.x, p.y - this.downPos.y) > TAP_MOVE) this.mode = 'pan'
        break
      case 'pinch': {
        const info = this.pinchInfo()
        this.opts.onIntent({ kind: 'pinch', zoom: pinchZoom(this.pinchStart.dist, info.dist, this.pinchStart.zoom), center: info.center })
        break
      }
    }
    if (this.mode === 'pan') {
      this.opts.onIntent({ kind: 'pan', dx: p.x - this.last.x, dy: p.y - this.last.y })
    }
    this.last = p
  }

  private onUp = (e: PointerEvent): void => {
    if (!this.pointers.has(e.pointerId)) return
    const p = this.local(e)
    this.pointers.delete(e.pointerId)
    if (this.mode === 'aim') {
      this.emitAim(p, 'aimRelease')
      this.lastAim = null
      this.mode = 'none'
    } else if (this.mode === 'press' && performance.now() - this.downAt < TAP_MS) {
      this.opts.onIntent({ kind: 'tap', screen: p })
      this.mode = 'none'
    } else if (this.mode === 'pinch') {
      this.mode = this.pointers.size === 1 ? 'pan' : 'none'
      const rest = [...this.pointers.values()][0]
      if (rest) this.last = rest
    } else if (this.pointers.size === 0) this.mode = 'none'
  }
}
