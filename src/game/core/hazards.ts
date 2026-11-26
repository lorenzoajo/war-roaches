import { HAZARD_DAMAGE } from './constants'
import { damageRoach, type ExplosionSpec } from './explosion'
import type { Roach } from './roach'
import { findSafeSpot } from './spawn'
import { dist } from './vec'
import type { World } from './world'

const FIRE_TOUCH = 12
const FIRE_TICK = 0.5
const FIRE_DAMAGE_PER_TICK = 3
const FALL_SPEED = 200
const MINE_TRIGGER_DIST = 40
const MINE_FUSE = 0.5
const BUBBLE_EVERY = 1.5
const BUBBLE_RADIUS = 22
const BUBBLE_LIFT = -140

/** Bottom liquid: −30 HP and spit back onto a safe surface instead of instant death. */
export function applyHazard(w: World, r: Roach): boolean {
  if (!r.alive || r.pos.y + r.archetype.radius <= w.hazardY) return false
  w.events.push({ type: 'splash', pos: { x: r.pos.x, y: w.hazardY } })
  damageRoach(w, r, Math.min(HAZARD_DAMAGE, r.hp))
  if (r.alive) {
    const others = w.roaches.filter((o) => o !== r && o.alive).map((o) => o.pos)
    const spot = findSafeSpot(w.mask, w.rng, w.hazardY, others)
    r.pos = { x: spot.x, y: spot.y - r.archetype.radius - 1 }
    r.vel = { x: 0, y: 0 }
    r.grounded = false
    r.slamming = false
  }
  return true
}

const fall = (w: World, pos: { x: number; y: number }, dt: number): void => {
  if (!w.mask.isSolid(pos.x, pos.y + 3)) pos.y += FALL_SPEED * dt
}

export function stepFires(w: World, dt: number): void {
  for (const f of w.fires) {
    const before = f.timeLeft
    f.timeLeft -= dt
    fall(w, f.pos, dt)
    if (Math.floor(before / FIRE_TICK) === Math.floor(f.timeLeft / FIRE_TICK)) continue
    for (const r of w.roaches)
      if (r.alive && dist(r.pos, f.pos) < r.archetype.radius + FIRE_TOUCH) damageRoach(w, r, FIRE_DAMAGE_PER_TICK)
    if (w.mask.carveCircle(f.pos.x, f.pos.y + 2, 4) > 0) w.events.push({ type: 'carve', pos: { x: f.pos.x, y: f.pos.y + 2 }, radius: 4 })
  }
  w.fires = w.fires.filter((f) => f.timeLeft > 0 && f.pos.y < w.hazardY)
}

export function stepMines(w: World, dt: number): void {
  for (const m of w.mines) {
    fall(w, m.pos, dt)
    m.armTimer = Math.max(0, m.armTimer - dt)
    if (m.triggered < 0 && m.armTimer === 0) {
      const enemyNear = w.roaches.some((r) => r.alive && r.team !== m.team && dist(r.pos, m.pos) < MINE_TRIGGER_DIST + r.archetype.radius)
      if (enemyNear) m.triggered = MINE_FUSE
    } else if (m.triggered >= 0) {
      m.triggered -= dt
      if (m.triggered <= 0) {
        m.armTimer = -1
        w.explode({ pos: m.pos, radius: 50, damage: 35, ownerTeam: m.team })
      }
    }
  }
  w.mines = w.mines.filter((m) => m.armTimer >= 0 && m.pos.y < w.hazardY)
}

export function applyCloudsEndOfTurn(w: World): void {
  for (const c of w.clouds) {
    for (const r of w.roaches) if (r.alive && dist(r.pos, c.pos) < c.radius) damageRoach(w, r, 10)
    c.turnsLeft--
  }
  w.clouds = w.clouds.filter((c) => c.turnsLeft > 0)
}

/** Sink Abyss twist: bubbles rise from the soap and carry roaches up. */
export function stepBubbles(w: World, dt: number): void {
  w.bubbleClock += dt
  if (w.bubbleClock >= BUBBLE_EVERY) {
    w.bubbleClock -= BUBBLE_EVERY
    w.bubbles.push({ id: w.nextId(), pos: { x: w.rng.range(100, w.mask.width - 100), y: w.hazardY - 5 }, vy: -45, dead: false })
  }
  for (const b of w.bubbles) {
    b.pos.y += b.vy * dt
    for (const r of w.roaches) {
      if (!r.alive || dist(r.pos, b.pos) >= r.archetype.radius + BUBBLE_RADIUS) continue
      r.vel.y = Math.min(r.vel.y, BUBBLE_LIFT)
      r.grounded = false
    }
    if (b.pos.y < 0 || w.mask.isSolid(b.pos.x, b.pos.y - BUBBLE_RADIUS)) b.dead = true
  }
  w.bubbles = w.bubbles.filter((b) => !b.dead)
}

/** Cake twist: lit candles caught in a blast spill fire. */
export function igniteCandles(w: World, e: ExplosionSpec): void {
  for (const c of w.candles) {
    if (!c.lit || dist(c.pos, e.pos) > e.radius) continue
    c.lit = false
    w.addFire({ x: c.pos.x - 20, y: c.pos.y - 4 })
    w.addFire({ x: c.pos.x, y: c.pos.y - 10 })
    w.addFire({ x: c.pos.x + 20, y: c.pos.y - 4 })
  }
}
