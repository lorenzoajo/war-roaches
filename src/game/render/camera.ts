import { WORLD_H, WORLD_W } from '../core/constants'
import type { Vec2 } from '../core/types'
import { MAX_ZOOM, MIN_ZOOM } from '../input/gestures'

const BOUNDS = { minX: -200, maxX: WORLD_W + 200, minY: -400, maxY: WORLD_H }
const SHAKE_DECAY = 6

/** View center in world coords + zoom; pure math, no Pixi. */
export class Camera {
  x = WORLD_W / 2
  y = WORLD_H / 2
  zoom = 1
  viewW = 1
  viewH = 1
  private trauma = 0
  private t = 0

  setViewport(w: number, h: number): void {
    this.viewW = Math.max(1, w)
    this.viewH = Math.max(1, h)
  }

  follow(target: Vec2, dt: number, sharpness = 6): void {
    const k = 1 - Math.exp(-sharpness * dt)
    this.x += (target.x - this.x) * k
    this.y += (target.y - this.y) * k
    this.clamp()
  }

  pan(dxScreen: number, dyScreen: number): void {
    this.x -= dxScreen / this.zoom
    this.y -= dyScreen / this.zoom
    this.clamp()
  }

  setZoom(z: number, anchorScreen?: Vec2): void {
    const anchor = anchorScreen ?? { x: this.viewW / 2, y: this.viewH / 2 }
    const before = this.screenToWorld(anchor)
    this.zoom = Math.min(MAX_ZOOM, Math.max(Math.max(MIN_ZOOM, this.minZoomToFit()), z))
    const after = this.screenToWorld(anchor)
    this.x += before.x - after.x
    this.y += before.y - after.y
    this.clamp()
  }

  shake(intensity: number): void {
    this.trauma = Math.min(24, Math.max(this.trauma, intensity))
  }

  /** Advances shake; returns the screen-space offset to apply this frame. */
  update(dt: number): Vec2 {
    this.t += dt
    if (this.trauma <= 0) return { x: 0, y: 0 }
    const off = { x: Math.sin(this.t * 53) * this.trauma, y: Math.cos(this.t * 41) * this.trauma }
    this.trauma = Math.max(0, this.trauma - SHAKE_DECAY * dt * Math.max(1, this.trauma / 2))
    return off
  }

  clamp(): void {
    const hw = this.viewW / 2 / this.zoom, hh = this.viewH / 2 / this.zoom
    const fit = (v: number, lo: number, hi: number, half: number): number =>
      hi - lo < half * 2 ? (lo + hi) / 2 : Math.min(hi - half, Math.max(lo + half, v))
    this.x = fit(this.x, BOUNDS.minX, BOUNDS.maxX, hw)
    this.y = fit(this.y, BOUNDS.minY, BOUNDS.maxY, hh)
  }

  worldToScreen(p: Vec2): Vec2 {
    return { x: (p.x - this.x) * this.zoom + this.viewW / 2, y: (p.y - this.y) * this.zoom + this.viewH / 2 }
  }

  screenToWorld(p: Vec2): Vec2 {
    return { x: (p.x - this.viewW / 2) / this.zoom + this.x, y: (p.y - this.viewH / 2) / this.zoom + this.y }
  }

  minZoomToFit(): number {
    return Math.min(this.viewW / (BOUNDS.maxX - BOUNDS.minX), this.viewH / (BOUNDS.maxY - BOUNDS.minY))
  }
}
