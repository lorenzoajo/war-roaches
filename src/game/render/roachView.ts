import { Container, Graphics, Text } from 'pixi.js'
import { ARCHETYPES } from '../core/archetypes'
import type { Roach } from '../core/roach'
import type { RoachKind } from '../core/types'
import { mix } from './color'

const SKIN = 0xf3d9b1
const SKIN_LINE = 0x8a5a3a
const INK = 0x2a1a2e
const LEG = 0x5a3a2a

interface Shape {
  bodyW: number
  bodyH: number
  bodyY: number
  headR: number
  legLen: number
  scale: number
}

function shapeFor(kind: RoachKind): Shape {
  const R = ARCHETYPES[kind].radius
  switch (kind) {
    case 'chonk': return { bodyW: R * 1.35, bodyH: R * 0.95, bodyY: 0, headR: R * 0.55, legLen: 5, scale: 1 }
    case 'stilts': return { bodyW: R * 1.05, bodyH: R * 0.85, bodyY: -10, headR: R * 0.72, legLen: 20, scale: 1 }
    case 'brawler': return { bodyW: R * 1.15, bodyH: R * 0.95, bodyY: 0, headR: R * 0.62, legLen: 6, scale: 1 }
    case 'zippy': return { bodyW: R * 1.2, bodyH: R * 0.9, bodyY: 0, headR: R * 0.72, legLen: 5, scale: 1 }
  }
}

/** Cute code-drawn roach: chubby shell in team color, big eyes, wobbly antennae, per-kind accessory. */
export class RoachView {
  readonly container = new Container()
  private readonly body = new Container()
  private readonly legs = new Graphics()
  private readonly wings = new Graphics()
  private readonly shell = new Graphics()
  private readonly head = new Graphics()
  private readonly eyes = new Graphics()
  private readonly antennae = new Graphics()
  private readonly extra = new Graphics()
  private readonly arrow = new Graphics()
  private readonly tag = new Container()
  private readonly tagBg = new Graphics()
  private readonly tagText: Text
  private readonly s: Shape
  private readonly R: number
  private lastHp = -1
  private wasGrounded = true
  private squash = 0
  private walkPhase = 0
  private lastX = 0
  private blinkAt = 0
  private deadAt = -1
  private readonly headX: number
  private readonly headY: number

  constructor(private readonly kind: RoachKind, private readonly color: number, name: string) {
    this.s = shapeFor(kind)
    this.R = ARCHETYPES[kind].radius
    this.headX = this.s.bodyW * 0.72
    this.headY = this.s.bodyY - this.s.bodyH * 0.35
    this.tagText = new Text({
      text: '',
      style: { fontFamily: 'system-ui, sans-serif', fontSize: 22, fontWeight: '800', fill: 0xffffff, stroke: { color: INK, width: 4 } },
    })
    this.tagText.anchor.set(0.5)
    this.tagText.scale.set(0.5)
    this.tag.addChild(this.tagBg, this.tagText)
    this.body.addChild(this.wings, this.legs, this.shell, this.extra, this.head, this.eyes, this.antennae)
    this.container.addChild(this.body, this.tag, this.arrow)
    this.container.label = name
    this.drawStatic()
    this.blinkAt = Math.random() * 3
  }

  private drawStatic(): void {
    const { bodyW, bodyH, bodyY, headR } = this.s
    const c = this.color
    const dark = mix(c, INK, 0.45)
    const light = mix(c, 0xffffff, 0.45)
    const sh = this.shell
    sh.ellipse(0, bodyY, bodyW, bodyH).fill(c).stroke({ width: 1.6, color: dark })
    sh.ellipse(-bodyW * 0.25, bodyY - bodyH * 0.35, bodyW * 0.45, bodyH * 0.3).fill({ color: light, alpha: 0.7 })
    sh.moveTo(-bodyW * 0.9, bodyY).quadraticCurveTo(0, bodyY + bodyH * 0.15, bodyW * 0.55, bodyY - bodyH * 0.1).stroke({ width: 1.2, color: dark, alpha: 0.8 })
    if (this.kind === 'zippy') sh.rect(-bodyW * 0.8, bodyY - 1.5, bodyW * 1.3, 3).fill({ color: 0xffffff, alpha: 0.85 })
    sh.ellipse(-bodyW * 0.05, bodyY + bodyH * 0.55, bodyW * 0.7, bodyH * 0.35).fill({ color: mix(SKIN, c, 0.25), alpha: 0.9 })

    const h = this.head
    const hx = this.headX, hy = this.headY
    h.circle(hx, hy, headR).fill(SKIN).stroke({ width: 1.4, color: SKIN_LINE })
    h.circle(hx + headR * 0.35, hy + headR * 0.45, headR * 0.16).fill({ color: 0xff8a8a, alpha: 0.6 })
    h.moveTo(hx + headR * 0.15, hy + headR * 0.55).quadraticCurveTo(hx + headR * 0.4, hy + headR * 0.75, hx + headR * 0.65, hy + headR * 0.5).stroke({ width: 1.2, color: INK })
    // Bandana in team color with a knot at the back.
    h.rect(hx - headR * 0.95, hy - headR * 0.55, headR * 1.9, headR * 0.32).fill(c)
    h.poly([hx - headR * 0.95, hy - headR * 0.5, hx - headR * 1.5, hy - headR * 0.85, hx - headR * 1.45, hy - headR * 0.2]).fill(dark)

    const x = this.extra
    switch (this.kind) {
      case 'chonk':
        x.arc(hx, hy - headR * 0.45, headR * 1.02, Math.PI, 0).fill(0x6b7b3a).stroke({ width: 1.2, color: 0x3a4520 })
        x.rect(hx - headR * 1.1, hy - headR * 0.5, headR * 2.2, headR * 0.18).fill(0x56652c)
        break
      case 'stilts':
        x.roundRect(hx - headR * 0.9, hy - headR * 0.95, headR * 1.8, headR * 0.42, headR * 0.2).fill(0x8a5a2a)
        x.circle(hx + headR * 0.4, hy - headR * 0.75, headR * 0.26).fill({ color: 0x9ad0ff, alpha: 0.9 }).stroke({ width: 1, color: INK })
        break
      case 'brawler':
        x.circle(bodyW * 0.95, bodyY + bodyH * 0.4, this.R * 0.42).fill(SKIN).stroke({ width: 1.2, color: SKIN_LINE })
        x.circle(bodyW * 0.35, bodyY + bodyH * 0.55, this.R * 0.38).fill(SKIN).stroke({ width: 1.2, color: SKIN_LINE })
        break
      case 'zippy':
        x.arc(hx, hy - headR * 0.35, headR * 0.95, Math.PI, 0).fill(mix(c, 0xffffff, 0.2))
        x.rect(hx - headR * 1.7, hy - headR * 0.42, headR * 0.9, headR * 0.16).fill(mix(c, INK, 0.3))
        break
    }
  }

  private drawEyes(t: number, lookUp: number): void {
    const { headR } = this.s
    const hx = this.headX, hy = this.headY
    const blinking = t > this.blinkAt && t < this.blinkAt + 0.12
    if (t > this.blinkAt + 0.12) this.blinkAt = t + 3 + Math.random() * 2
    const e = this.eyes
    e.clear()
    const er = headR * 0.36
    for (const ox of [-0.05, 0.55]) {
      const ex = hx + headR * ox, ey = hy - headR * 0.05
      if (blinking || this.deadAt >= 0) {
        e.moveTo(ex - er, ey).lineTo(ex + er, ey).stroke({ width: 1.6, color: INK })
        continue
      }
      e.circle(ex, ey, er).fill(0xffffff).stroke({ width: 1, color: INK })
      e.circle(ex + er * 0.3, ey - er * 0.25 * lookUp, er * 0.5).fill(INK)
      e.circle(ex + er * 0.45, ey - er * 0.45, er * 0.18).fill(0xffffff)
    }
  }

  private drawAntennae(t: number): void {
    const { headR } = this.s
    const hx = this.headX, hy = this.headY
    const a = this.antennae
    a.clear()
    for (const [ox, ph] of [[-0.2, 0], [0.35, 1.7]] as const) {
      const sx = hx + headR * ox, sy = hy - headR * 0.85
      const sway = Math.sin(t * 3 + ph) * 4
      const ex = sx + 7 + sway, ey = sy - headR * 1.4
      a.moveTo(sx, sy).quadraticCurveTo(sx - 3, sy - headR, ex, ey).stroke({ width: 1.4, color: LEG })
      a.circle(ex, ey, 1.8).fill(mix(this.color, 0xffffff, 0.3))
    }
  }

  private drawLegs(phase: number, wiggle: boolean): void {
    const { bodyW, bodyH, bodyY, legLen } = this.s
    const g = this.legs
    g.clear()
    const baseY = bodyY + bodyH * 0.6
    for (let i = 0; i < 3; i++) {
      const bx = (i - 1) * bodyW * 0.55
      const swing = wiggle ? Math.sin(phase * 3 + i) * 5 : Math.sin(phase + i * 2.1) * 3.5
      const footY = Math.min(baseY + legLen, this.R + 1)
      const kneeX = bx + swing * 0.5 - 2, kneeY = baseY + (footY - baseY) * 0.5
      g.moveTo(bx, baseY).lineTo(kneeX, kneeY).lineTo(bx + swing, footY).stroke({ width: 1.8, color: LEG, cap: 'round', join: 'round' })
    }
  }

  private drawWings(t: number, on: boolean): void {
    const g = this.wings
    g.clear()
    if (!on) return
    const flap = Math.sin(t * 30) * 0.5 + 0.5
    const { bodyW, bodyY, bodyH } = this.s
    g.ellipse(-bodyW * 0.3, bodyY - bodyH - 4 - flap * 6, bodyW * 0.9, 5 + flap * 5).fill({ color: 0xe6f7ff, alpha: 0.6 }).stroke({ width: 1, color: 0xffffff, alpha: 0.8 })
  }

  private drawTag(r: Roach): void {
    if (r.hp === this.lastHp) return
    this.lastHp = r.hp
    this.tagText.text = String(r.hp)
    const w = this.tagText.width + 8, h = 12
    this.tagBg.clear().roundRect(-w / 2, -h / 2, w, h, 6).fill({ color: this.color }).stroke({ width: 1.2, color: INK, alpha: 0.8 })
  }

  sync(r: Roach, t: number, isActive: boolean, aiming: boolean): void {
    const c = this.container
    c.position.set(r.pos.x, r.pos.y)
    if (!r.alive) {
      if (this.deadAt < 0) this.deadAt = t
      const k = t - this.deadAt
      this.body.rotation = Math.PI
      this.drawLegs(t * 8, true)
      this.drawEyes(t, 0)
      this.tag.visible = false
      this.arrow.visible = false
      c.visible = k < 0.8
      return
    }
    const moving = Math.abs(r.pos.x - this.lastX) > 0.05
    this.lastX = r.pos.x
    if (moving && r.grounded) this.walkPhase += 0.45
    if (r.grounded && !this.wasGrounded) this.squash = 1
    this.wasGrounded = r.grounded
    this.squash = Math.max(0, this.squash - 0.08)
    const stretch = !r.grounded && r.vel.y < -80 ? 0.12 : 0
    const bob = r.grounded && !moving ? Math.sin(t * 3) * 0.75 : 0
    const sy = 1 - this.squash * 0.15 + stretch
    const sx = 1 + this.squash * 0.12 - stretch * 0.7
    this.body.scale.set(sx * r.facing, sy)
    this.body.position.set(0, bob + (1 - sy) * this.R)
    this.body.rotation = r.dashTimer > 0 ? r.facing * 0.25 : 0
    this.drawLegs(this.walkPhase, false)
    this.drawWings(t, r.gliding)
    this.drawEyes(t, aiming ? 1 : 0)
    this.drawAntennae(t)
    this.drawTag(r)
    this.tag.visible = true
    this.tag.position.set(0, -this.R - 30 + (this.kind === 'stilts' ? -8 : 0))
    this.arrow.visible = isActive
    if (isActive) {
      const ay = this.tag.y - 16 + Math.sin(t * 6) * 3
      this.arrow.clear().poly([-6, ay - 6, 6, ay - 6, 0, ay + 2]).fill(0xffffff).stroke({ width: 1.5, color: INK })
    }
  }

  destroy(): void {
    this.container.destroy({ children: true })
  }
}
