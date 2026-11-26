import { describe, expect, it } from 'vitest'
import { TerrainMask } from '../../src/game/core/terrain'
import { createRoach, stepRoach, type MoveInput, type Roach } from '../../src/game/core/roach'
import { ARCHETYPES } from '../../src/game/core/archetypes'
import { Material, type RoachKind } from '../../src/game/core/types'
import { GRAVITY, TICK } from '../../src/game/core/constants'

const GROUND = 500
const flat = (mat: Material = Material.Normal): TerrainMask => {
  const m = new TerrainMask(1000, 800)
  m.fillRect(0, GROUND, 1000, 300, mat)
  return m
}
const idle: MoveInput = { dir: 0, jumpPressed: false, jumpHeld: false }
const env = { gravity: GRAVITY }
const run = (r: Roach, m: TerrainMask, seconds: number, input: MoveInput = idle): void => {
  for (let t = 0; t < seconds; t += TICK) stepRoach(r, input, m, env, TICK)
}
const standing = (kind: RoachKind, m: TerrainMask, x = 300): Roach => {
  const r = createRoach(1, 0, kind, { x, y: GROUND - ARCHETYPES[kind].radius - 40 })
  run(r, m, 1.5)
  return r
}

describe('roach movement', () => {
  it('falls and lands on ground', () => {
    const m = flat()
    const r = createRoach(1, 0, 'brawler', { x: 300, y: 300 })
    run(r, m, 2)
    expect(r.grounded).toBe(true)
    expect(Math.abs(r.pos.y + r.archetype.radius - GROUND)).toBeLessThanOrEqual(2)
  })

  it('walks right on flat ground', () => {
    const m = flat()
    const r = standing('brawler', m)
    const x0 = r.pos.x
    run(r, m, 1, { dir: 1, jumpPressed: false, jumpHeld: false })
    expect(r.pos.x - x0).toBeGreaterThan(ARCHETYPES.brawler.walkSpeed * 0.9)
    expect(r.pos.x - x0).toBeLessThan(ARCHETYPES.brawler.walkSpeed * 1.1)
    expect(r.facing).toBe(1)
  })

  it('cannot climb a 20px wall', () => {
    const m = flat()
    m.fillRect(400, GROUND - 20, 30, 20, Material.Normal)
    const r = standing('brawler', m, 340)
    run(r, m, 3, { dir: 1, jumpPressed: false, jumpHeld: false })
    expect(r.pos.x).toBeLessThan(400)
  })

  it('climbs 4px step', () => {
    const m = flat()
    m.fillRect(400, GROUND - 4, 600, 4, Material.Normal)
    const r = standing('brawler', m, 340)
    run(r, m, 2, { dir: 1, jumpPressed: false, jumpHeld: false })
    expect(r.pos.x).toBeGreaterThan(420)
  })

  it('glide caps fall speed', () => {
    const m = flat()
    const r = createRoach(1, 0, 'stilts', { x: 300, y: 50 })
    run(r, m, 0.6, { dir: 0, jumpPressed: false, jumpHeld: true })
    expect(r.gliding).toBe(true)
    expect(r.vel.y).toBeLessThanOrEqual(70)
  })

  it('zippy double jumps, chonk does not', () => {
    const m = flat()
    const z = standing('zippy', m), c = standing('chonk', m, 600)
    for (const r of [z, c]) {
      stepRoach(r, { dir: 0, jumpPressed: true, jumpHeld: false }, m, env, TICK)
      run(r, m, 0.2)
      stepRoach(r, { dir: 0, jumpPressed: true, jumpHeld: false }, m, env, TICK)
    }
    expect(z.vel.y).toBeLessThan(-240)
    expect(c.vel.y).toBeGreaterThan(-150)
  })

  it('bouncy surface rebounds', () => {
    const m = flat(Material.Bouncy)
    const r = createRoach(1, 0, 'brawler', { x: 300, y: 200 })
    let minVy = 0
    for (let t = 0; t < 2; t += TICK) {
      stepRoach(r, idle, m, env, TICK)
      if (r.pos.y > 400) minVy = Math.min(minVy, r.vel.y)
    }
    expect(minVy).toBeLessThan(-100)
  })

  it('sticky slows walking', () => {
    const walk = (mat: Material): number => {
      const m = flat(mat)
      const r = standing('brawler', m)
      const x0 = r.pos.x
      run(r, m, 1, { dir: 1, jumpPressed: false, jumpHeld: false })
      return r.pos.x - x0
    }
    const ratio = walk(Material.Sticky) / walk(Material.Normal)
    expect(ratio).toBeGreaterThan(0.75)
    expect(ratio).toBeLessThan(0.85)
  })

  it('slippery keeps sliding without input', () => {
    const slide = (mat: Material): number => {
      const m = flat(mat)
      const r = standing('brawler', m)
      const x0 = r.pos.x
      r.vel.x = 120
      run(r, m, 0.5)
      return r.pos.x - x0
    }
    expect(slide(Material.Slippery)).toBeGreaterThan(30)
    expect(slide(Material.Normal)).toBeLessThan(3)
  })

  it('no tunnelling at high speed', () => {
    const m = new TerrainMask(1000, 800)
    m.fillRect(0, 500, 1000, 20, Material.Normal)
    const r = createRoach(1, 0, 'zippy', { x: 300, y: 300 })
    r.vel.y = 3000
    run(r, m, 0.5)
    expect(r.pos.y).toBeLessThan(500)
  })
})
