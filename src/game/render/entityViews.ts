import { Container, Graphics, Text } from 'pixi.js'
import type { Game } from '../core/game'
import type { Crate, Projectile } from '../core/entities'
import type { WeaponId } from '../core/types'
import type { Effects } from './effects'

const INK = 0x2a1a2e

function drawProjectile(g: Graphics, weapon: WeaponId, mini: boolean): void {
  if (mini) {
    g.circle(0, 0, 4).fill(0xd8e6ff).stroke({ width: 1, color: INK })
    return
  }
  switch (weapon) {
    case 'bazooka':
      g.ellipse(0, 0, 9, 6).fill(0xb8f07a).stroke({ width: 1.5, color: 0x3f6a1a })
      g.circle(3, -2, 2).fill({ color: 0xffffff, alpha: 0.8 })
      break
    case 'grenade':
      g.circle(0, 0, 7).fill(0xc98b4a).stroke({ width: 1.5, color: 0x6a3a1a })
      for (const [x, y] of [[-2, -2], [3, 1], [-1, 3]] as const) g.circle(x, y, 1.4).fill(0x4a2a10)
      break
    case 'spray':
      g.roundRect(-5, -10, 10, 20, 3).fill(0x46d37a).stroke({ width: 1.5, color: INK })
      g.rect(-3, -14, 6, 4).fill(0xdddddd)
      break
    case 'shoe':
      g.roundRect(-34, -18, 52, 30, 12).fill(0xff4d5e).stroke({ width: 2.5, color: INK })
      g.roundRect(-36, 8, 72, 12, 6).fill(0xffffff).stroke({ width: 2.5, color: INK })
      for (let i = 0; i < 3; i++) g.moveTo(-20 + i * 10, -12).lineTo(-14 + i * 10, -4).stroke({ width: 2, color: 0xffffff })
      break
    case 'disco':
      g.circle(0, 0, 9).fill(0xd8e6ff).stroke({ width: 1.5, color: INK })
      for (let i = -1; i <= 1; i++) {
        g.moveTo(-9, i * 4).lineTo(9, i * 4).stroke({ width: 0.8, color: 0x7a8aa8 })
        g.moveTo(i * 4, -9).lineTo(i * 4, 9).stroke({ width: 0.8, color: 0x7a8aa8 })
      }
      break
    case 'hotsauce':
      g.roundRect(-4, -8, 8, 16, 3).fill(0xd8233a).stroke({ width: 1.5, color: INK })
      g.rect(-2, -13, 4, 5).fill(0x3f8f3a)
      break
    case 'duck':
      g.ellipse(0, 2, 10, 7).fill(0xffd23f).stroke({ width: 1.5, color: INK })
      g.circle(6, -5, 5).fill(0xffd23f).stroke({ width: 1.5, color: INK })
      g.poly([10, -5, 15, -3, 10, -2]).fill(0xff8a2a)
      g.circle(7, -6, 1.2).fill(INK)
      break
    default:
      g.circle(0, 0, 5).fill(0xffffff)
  }
}

function drawCrate(g: Graphics, c: Crate): void {
  g.clear()
  if (!c.landed) {
    g.moveTo(-11, -12).lineTo(-20, -42).stroke({ width: 1, color: 0xffffff })
    g.moveTo(11, -12).lineTo(20, -42).stroke({ width: 1, color: 0xffffff })
    g.arc(0, -40, 24, Math.PI, 0).fill({ color: 0xff6fa8, alpha: 0.95 }).stroke({ width: 1.5, color: INK })
  }
  const health = c.content.kind === 'health'
  g.roundRect(-12, -12, 24, 24, 4).fill(health ? 0xfff2e0 : 0xc98b4a).stroke({ width: 2, color: INK })
  if (health) {
    g.poly([-7, -6, 7, -6, 0, 8]).fill(0xffc23f).stroke({ width: 1, color: 0xb06a2a })
    g.circle(-1, -2, 1.8).fill(0xd8452c)
    g.circle(2, 1, 1.5).fill(0xd8452c)
  } else {
    g.rect(-12, -2, 24, 4).fill(0x8a5a2a)
    g.rect(-2, -12, 4, 24).fill(0x8a5a2a)
  }
}

/** Keeps one display object per world entity (projectiles, crates, clouds, fires, mines, bubbles, rope). */
export class EntityViews {
  private readonly projectiles = new Map<number, { g: Graphics; fuse: Text | null }>()
  private readonly crates = new Map<number, Graphics>()
  private readonly misc = new Graphics()
  private readonly rope = new Graphics()
  private readonly projLayer = new Container()

  constructor(private readonly layer: Container, private readonly effects: Effects) {
    layer.addChild(this.misc, this.rope, this.projLayer)
  }

  private syncProjectile(p: Projectile, dt: number): void {
    let v = this.projectiles.get(p.id)
    if (!v) {
      const g = new Graphics()
      drawProjectile(g, p.weapon, p.mini)
      let fuse: Text | null = null
      if (p.weapon === 'grenade' && Number.isFinite(p.fuse)) {
        fuse = new Text({ text: '', style: { fontSize: 22, fontWeight: '900', fill: 0xffffff, stroke: { color: INK, width: 4 } } })
        fuse.anchor.set(0.5)
        fuse.scale.set(0.5)
        this.projLayer.addChild(fuse)
      }
      this.projLayer.addChild(g)
      v = { g, fuse }
      this.projectiles.set(p.id, v)
    }
    v.g.position.set(p.pos.x, p.pos.y)
    if (p.weapon === 'bazooka' || p.weapon === 'shoe') v.g.rotation = p.weapon === 'shoe' ? 0 : Math.atan2(p.vel.y, p.vel.x)
    else if (p.walking) v.g.scale.x = p.vel.x >= 0 ? 1 : -1
    else v.g.rotation += dt * (p.vel.x >= 0 ? 6 : -6)
    if (v.fuse) {
      v.fuse.text = String(Math.max(1, Math.ceil(p.fuse - p.age)))
      v.fuse.position.set(p.pos.x, p.pos.y - 16)
    }
    if (!p.walking) this.effects.trail(p.id, p.pos, p.weapon === 'hotsauce' ? 0xff6a2a : 0xffffff, dt)
  }

  sync(game: Game, t: number, dt: number): void {
    const w = game.world
    const alive = new Set<number>()
    for (const p of w.projectiles) {
      alive.add(p.id)
      this.syncProjectile(p, dt)
    }
    for (const [id, v] of this.projectiles)
      if (!alive.has(id)) {
        v.g.destroy()
        v.fuse?.destroy()
        this.projectiles.delete(id)
      }

    const crateIds = new Set<number>()
    for (const c of w.crates) {
      crateIds.add(c.id)
      let g = this.crates.get(c.id)
      if (!g) {
        g = new Graphics()
        this.layer.addChild(g)
        this.crates.set(c.id, g)
      }
      drawCrate(g, c)
      g.position.set(c.pos.x, c.pos.y)
      g.rotation = c.landed ? 0 : Math.sin(t * 2 + c.id) * 0.12
    }
    for (const [id, g] of this.crates)
      if (!crateIds.has(id)) {
        g.destroy()
        this.crates.delete(id)
      }

    const m = this.misc
    m.clear()
    for (const c of w.clouds)
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + t * 0.4
        m.circle(c.pos.x + Math.cos(a) * c.radius * 0.5, c.pos.y + Math.sin(a) * c.radius * 0.3, c.radius * 0.45).fill({ color: 0x8fe36a, alpha: 0.22 })
      }
    for (const f of w.fires) {
      const s = 1 + Math.sin(t * 20 + f.id) * 0.2
      m.poly([f.pos.x - 7, f.pos.y, f.pos.x + 7, f.pos.y, f.pos.x, f.pos.y - 18 * s]).fill({ color: 0xff6a2a, alpha: 0.9 })
      m.poly([f.pos.x - 4, f.pos.y, f.pos.x + 4, f.pos.y, f.pos.x, f.pos.y - 10 * s]).fill(0xfff27f)
    }
    for (const mine of w.mines) {
      const blink = mine.triggered >= 0 && Math.sin(t * 30) > 0
      m.ellipse(mine.pos.x, mine.pos.y - 4, 9, 6).fill(blink ? 0xff3355 : 0xff8fc8).stroke({ width: 1.5, color: INK })
    }
    for (const b of w.bubbles) {
      m.circle(b.pos.x, b.pos.y, 22).fill({ color: 0xffffff, alpha: 0.12 }).stroke({ width: 2, color: 0xffffff, alpha: 0.7 })
      m.circle(b.pos.x - 8, b.pos.y - 8, 5).fill({ color: 0xffffff, alpha: 0.7 })
    }

    this.rope.clear()
    const r = game.activeRoach()
    if (game.rope && r) {
      this.rope.moveTo(r.pos.x, r.pos.y).lineTo(game.rope.anchor.x, game.rope.anchor.y).stroke({ width: 2.5, color: 0xe8c98a })
      this.rope.circle(game.rope.anchor.x, game.rope.anchor.y, 3).fill(0xe8c98a)
    }
  }
}
