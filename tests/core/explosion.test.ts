import { describe, expect, it } from 'vitest'
import { applyExplosion } from '../../src/game/core/explosion'
import { applyMelee } from '../../src/game/core/weapons'
import { addRoach, flatWorld } from './helpers'

describe('explosions', () => {
  it('explosion damage falls off with distance', () => {
    const w = flatWorld()
    const near = addRoach(w, 'chonk', 1000, 1)
    const far = addRoach(w, 'chonk', 1000 + 15 + 54, 1)
    applyExplosion(w, { pos: { x: 1000, y: near.pos.y }, radius: 55, damage: 40, ownerTeam: 0 })
    expect(near.maxHp - near.hp).toBe(40)
    expect(far.maxHp - far.hp).toBeGreaterThanOrEqual(20)
    expect(far.maxHp - far.hp).toBeLessThanOrEqual(21)
  })

  it('friendly damage halved', () => {
    const w = flatWorld()
    const own = addRoach(w, 'chonk', 1000, 0)
    applyExplosion(w, { pos: { ...own.pos }, radius: 55, damage: 40, ownerTeam: 0 })
    expect(own.maxHp - own.hp).toBe(20)
  })

  it('heavier roach knocked back less', () => {
    const w = flatWorld()
    const c = addRoach(w, 'chonk', 1000 - 20 - 15, 1)
    const z = addRoach(w, 'zippy', 1000 + 20 + 9, 1)
    c.pos.y = z.pos.y = 700
    applyExplosion(w, { pos: { x: 1000, y: 700 }, radius: 55, damage: 0, ownerTeam: 0, carve: false })
    const ratio = Math.hypot(c.vel.x, c.vel.y) / Math.hypot(z.vel.x, z.vel.y)
    expect(ratio).toBeCloseTo(0.7 / 1.6, 2)
  })

  it('invulnerable roach takes no damage', () => {
    const w = flatWorld()
    const r = addRoach(w, 'zippy', 1000, 1)
    r.invulnTimer = 0.3
    applyExplosion(w, { pos: { ...r.pos }, radius: 55, damage: 40, ownerTeam: 0 })
    expect(r.hp).toBe(r.maxHp)
  })

  it('lethal damage kills and emits death', () => {
    const w = flatWorld()
    const r = addRoach(w, 'zippy', 1000, 1)
    r.hp = 5
    applyExplosion(w, { pos: { ...r.pos }, radius: 55, damage: 40, ownerTeam: 0 })
    expect(r.alive).toBe(false)
    expect(w.events.some((e) => e.type === 'death' && e.roachId === r.id)).toBe(true)
  })

  it('slipper hits enemy in front, brawler double', () => {
    const w = flatWorld()
    const b = addRoach(w, 'brawler', 1000, 0)
    const t = addRoach(w, 'chonk', 1035, 1)
    b.facing = 1
    expect(applyMelee(w, b)).toBe(true)
    expect(t.maxHp - t.hp).toBe(40)
    expect(t.vel.x).toBeGreaterThan(0)
  })

  it('slipper misses enemy behind', () => {
    const w = flatWorld()
    const b = addRoach(w, 'zippy', 1000, 0)
    addRoach(w, 'chonk', 970, 1)
    b.facing = 1
    expect(applyMelee(w, b)).toBe(false)
  })
})
