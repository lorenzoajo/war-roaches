import { describe, expect, it } from 'vitest'
import { pickCrateX, rollCrateContent, spawnCrate, stepCrates, type TeamAmmo } from '../../src/game/core/crates'
import { GROUND, addRoach, flatWorld } from './helpers'
import { Rng } from '../../src/game/core/rng'
import { TICK } from '../../src/game/core/constants'

const emptyAmmo = (): TeamAmmo => ({ 0: {}, 1: {}, 2: {}, 3: {} })

describe('crates', () => {
  it('crate content is health or a pickup weapon', () => {
    const rng = new Rng(5)
    let health = 0
    for (let i = 0; i < 1000; i++) {
      const c = rollCrateContent(rng)
      if (c.kind === 'health') health++
      else expect(['bazooka', 'grenade', 'slipper']).not.toContain(c.weapon)
    }
    expect(health).toBeGreaterThan(180)
    expect(health).toBeLessThan(320)
  })

  it('crate falls, lands and is collected adding ammo to team pool', () => {
    const w = flatWorld()
    const r = addRoach(w, 'brawler', 1000, 2)
    w.crates.push({ id: 1, pos: { x: 1000, y: GROUND - 200 }, vel: { x: 0, y: 0 }, landed: false, collected: false, content: { kind: 'weapon', weapon: 'gum', ammo: 2 } })
    const ammo = emptyAmmo()
    for (let t = 0; t < 5; t += TICK) stepCrates(w, ammo, TICK)
    expect(ammo[2].gum).toBe(2)
    expect(w.crates.length).toBe(0)
    expect(w.events.some((e) => e.type === 'pickup')).toBe(true)
    expect(r.alive).toBe(true)
  })

  it('health crate caps at max HP', () => {
    const w = flatWorld()
    const r = addRoach(w, 'zippy', 1000, 0)
    r.hp = 70
    w.crates.push({ id: 1, pos: { x: 1000, y: GROUND - 14 }, vel: { x: 0, y: 0 }, landed: true, collected: false, content: { kind: 'health', amount: 35 } })
    stepCrates(w, emptyAmmo(), TICK)
    expect(r.hp).toBe(80)
  })

  it('pickCrateX favours losing team', () => {
    const w = flatWorld()
    const loser = addRoach(w, 'zippy', 300, 0)
    loser.hp = 10
    addRoach(w, 'chonk', 2000, 1)
    const rng = new Rng(11)
    let near = 0
    for (let i = 0; i < 1000; i++) if (Math.abs(pickCrateX(w, rng) - 300) <= 200) near++
    expect(near).toBeGreaterThanOrEqual(550)
  })

  it('spawnCrate drops from above the world', () => {
    const w = flatWorld()
    addRoach(w, 'zippy', 300, 0)
    const c = spawnCrate(w)
    expect(c.pos.y).toBeLessThan(0)
    expect(w.crates).toContain(c)
  })
})
