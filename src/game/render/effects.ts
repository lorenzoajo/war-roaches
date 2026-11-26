import { Container, Sprite, Text, Texture } from 'pixi.js'
import { AdvancedBloomFilter, ShockwaveFilter } from 'pixi-filters'
import type { Vec2 } from '../core/types'
import type { MapTheme } from '../maps/mapDef'
import type { Camera } from './camera'
import { mix } from './color'

interface Particle {
  sprite: Sprite
  vx: number
  vy: number
  life: number
  maxLife: number
  gravity: number
  drag: number
  s0: number
  s1: number
  a0: number
  active: boolean
}

interface FloatingText {
  text: Text
  life: number
  y0: number
}

const MAX_PARTICLES = 800
const DOT_SIZE = 32

function dotTexture(): Texture {
  const c = document.createElement('canvas')
  c.width = c.height = DOT_SIZE
  const ctx = c.getContext('2d')
  if (ctx) {
    const g = ctx.createRadialGradient(DOT_SIZE / 2, DOT_SIZE / 2, 0, DOT_SIZE / 2, DOT_SIZE / 2, DOT_SIZE / 2)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.6, 'rgba(255,255,255,0.95)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, DOT_SIZE, DOT_SIZE)
  }
  return Texture.from(c)
}

export interface SpawnOpts {
  color: number
  speed: [number, number]
  angle?: [number, number]
  life: [number, number]
  size: [number, number]
  endScale?: number
  gravity?: number
  drag?: number
  alpha?: number
  additive?: boolean
}

/** Pooled particles, screen shake, bloom on the fx layer and a shockwave on the world. */
export class Effects {
  private readonly pool: Particle[] = []
  private readonly texts: FloatingText[] = []
  private readonly tex = dotTexture()
  private readonly shockwave: ShockwaveFilter
  private shockTime = -1
  private shockPos: Vec2 = { x: 0, y: 0 }
  private readonly trailClock = new Map<number, number>()

  constructor(
    private readonly world: Container,
    private readonly fx: Container,
    private readonly camera: Camera,
    private readonly theme: MapTheme,
  ) {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const sprite = new Sprite(this.tex)
      sprite.anchor.set(0.5)
      sprite.visible = false
      fx.addChild(sprite)
      this.pool.push({ sprite, vx: 0, vy: 0, life: 0, maxLife: 1, gravity: 0, drag: 0, s0: 1, s1: 1, a0: 1, active: false })
    }
    fx.filters = [new AdvancedBloomFilter({ threshold: 0.4, bloomScale: 1.2, brightness: 1, blur: 6, quality: 4 })]
    this.shockwave = new ShockwaveFilter({ center: { x: 0, y: 0 }, amplitude: 18, wavelength: 90, speed: 520, brightness: 1.15, radius: 260, time: 0 })
  }

  private rand(a: number, b: number): number {
    return a + Math.random() * (b - a)
  }

  spawn(pos: Vec2, count: number, o: SpawnOpts): void {
    for (let n = 0; n < count; n++) {
      const p = this.pool.find((q) => !q.active)
      if (!p) return
      const ang = o.angle ? this.rand(o.angle[0], o.angle[1]) : this.rand(0, Math.PI * 2)
      const sp = this.rand(o.speed[0], o.speed[1])
      p.active = true
      p.vx = Math.cos(ang) * sp
      p.vy = Math.sin(ang) * sp
      p.maxLife = p.life = this.rand(o.life[0], o.life[1])
      p.gravity = o.gravity ?? 0
      p.drag = o.drag ?? 0
      p.s0 = this.rand(o.size[0], o.size[1]) / DOT_SIZE
      p.s1 = p.s0 * (o.endScale ?? 0.2)
      p.a0 = o.alpha ?? 1
      const s = p.sprite
      s.visible = true
      s.tint = o.color
      s.blendMode = o.additive ? 'add' : 'normal'
      s.position.set(pos.x, pos.y)
      s.scale.set(p.s0)
      s.alpha = p.a0
    }
  }

  explosion(pos: Vec2, radius: number): void {
    const k = radius / 55
    this.spawn(pos, 1, { color: 0xffffff, speed: [0, 0], life: [0.15, 0.15], size: [radius * 2.6, radius * 2.6], endScale: 1.3, additive: true })
    this.spawn(pos, Math.round(16 * k), { color: 0xffc23f, speed: [40, 160 * k], life: [0.25, 0.5], size: [radius * 0.5, radius * 0.9], endScale: 0.1, drag: 3, additive: true })
    this.spawn(pos, Math.round(10 * k), { color: 0xff6a2a, speed: [30, 120 * k], life: [0.3, 0.6], size: [radius * 0.4, radius * 0.7], endScale: 0.1, drag: 3, additive: true })
    const debris = this.theme.debris
    for (const c of debris) this.spawn(pos, Math.round((14 * k * 3) / debris.length) + 6, { color: c, speed: [150, 420 * k], angle: [-Math.PI * 0.95, -Math.PI * 0.05], life: [0.6, 1.2], size: [4, 9], endScale: 0.7, gravity: 700 })
    this.spawn(pos, Math.round(8 * k), { color: mix(0x666666, this.theme.sky[1], 0.3), speed: [10, 40], angle: [-Math.PI, 0], life: [0.8, 1.4], size: [radius * 0.5, radius * 0.9], endScale: 1.6, gravity: -40, alpha: 0.55 })
    this.camera.shake(Math.min(20, radius / 8))
    this.startShockwave(pos)
  }

  private startShockwave(pos: Vec2): void {
    this.shockTime = 0
    this.shockPos = { ...pos }
    if (!this.world.filters || (Array.isArray(this.world.filters) && this.world.filters.length === 0)) this.world.filters = [this.shockwave]
  }

  splash(pos: Vec2): void {
    const c = mix(this.theme.hazard, 0xffffff, 0.35)
    this.spawn(pos, 22, { color: c, speed: [120, 320], angle: [-Math.PI * 0.85, -Math.PI * 0.15], life: [0.5, 0.9], size: [5, 10], endScale: 0.5, gravity: 800 })
  }

  dust(pos: Vec2): void {
    this.spawn(pos, 8, { color: 0xd8cfc0, speed: [20, 70], angle: [-Math.PI, 0], life: [0.4, 0.7], size: [6, 12], endScale: 1.5, alpha: 0.6, drag: 2 })
  }

  poof(pos: Vec2, color: number): void {
    this.spawn(pos, 18, { color, speed: [60, 160], life: [0.4, 0.8], size: [8, 14], endScale: 0.2, drag: 2 })
    this.spawn(pos, 10, { color: 0xffffff, speed: [30, 90], life: [0.5, 0.9], size: [10, 18], endScale: 1.4, alpha: 0.7, drag: 2 })
  }

  sparkle(pos: Vec2, color: number): void {
    this.spawn(pos, 14, { color, speed: [40, 140], life: [0.3, 0.6], size: [4, 8], endScale: 0.1, additive: true })
  }

  trail(id: number, pos: Vec2, color: number, dt: number): void {
    const t = (this.trailClock.get(id) ?? 0) + dt
    if (t < 0.02) {
      this.trailClock.set(id, t)
      return
    }
    this.trailClock.set(id, 0)
    this.spawn(pos, 1, { color, speed: [0, 10], life: [0.25, 0.4], size: [5, 8], endScale: 0.1, alpha: 0.7 })
  }

  floatText(pos: Vec2, label: string, color: number): void {
    const text = new Text({
      text: label,
      style: { fontFamily: 'system-ui, sans-serif', fontSize: 32, fontWeight: '900', fill: color, stroke: { color: 0x2a1a2e, width: 6 } },
    })
    text.anchor.set(0.5)
    text.scale.set(0.5)
    text.position.set(pos.x, pos.y - 30)
    this.fx.addChild(text)
    this.texts.push({ text, life: 1.2, y0: pos.y - 30 })
  }

  damageNumber(pos: Vec2, amount: number, heal: boolean): void {
    this.floatText(pos, heal ? `+${amount}` : `-${amount}`, heal ? 0x7dff9a : 0xffe14d)
  }

  update(dt: number): void {
    for (const p of this.pool) {
      if (!p.active) continue
      p.life -= dt
      if (p.life <= 0) {
        p.active = false
        p.sprite.visible = false
        continue
      }
      const k = 1 - p.life / p.maxLife
      const damp = Math.max(0, 1 - p.drag * dt)
      p.vx *= damp
      p.vy = p.vy * damp + p.gravity * dt
      const s = p.sprite
      s.x += p.vx * dt
      s.y += p.vy * dt
      s.scale.set(p.s0 + (p.s1 - p.s0) * k)
      s.alpha = p.a0 * (1 - k * k)
    }
    for (const f of this.texts) {
      f.life -= dt
      const k = 1 - f.life / 1.2
      f.text.y = f.y0 - 40 * Math.min(1, k * 1.6)
      f.text.alpha = f.life < 0.4 ? f.life / 0.4 : 1
      if (f.life <= 0) f.text.destroy()
    }
    for (let i = this.texts.length - 1; i >= 0; i--) if (this.texts[i]!.life <= 0) this.texts.splice(i, 1)
    if (this.shockTime >= 0) {
      this.shockTime += dt
      const scr = this.camera.worldToScreen(this.shockPos)
      this.shockwave.center = scr
      this.shockwave.time = this.shockTime
      this.shockwave.radius = 260 * this.camera.zoom
      this.shockwave.amplitude = 18 * (1 - this.shockTime / 0.5)
      if (this.shockTime > 0.5) {
        this.shockTime = -1
        this.world.filters = []
      }
    }
  }
}
