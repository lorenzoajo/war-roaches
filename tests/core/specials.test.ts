import { describe, expect, it } from 'vitest'
import { canUseSpecial, finishSlam, tickCooldowns, useSpecial } from '../../src/game/core/specials'
import { addRoach, flatWorld } from './helpers'

describe('specials', () => {
  it('belly slam damages nearby enemy not self', () => {
    const w = flatWorld()
    const c = addRoach(w, 'chonk', 1000, 0)
    const e = addRoach(w, 'zippy', 1040, 1)
    const flags = { fullPreview: false }
    expect(useSpecial(c, w, flags)).toBe(true)
    expect(c.slamming).toBe(true)
    expect(c.vel.y).toBe(-250)
    finishSlam(c, w)
    expect(c.slamming).toBe(false)
    expect(c.hp).toBe(c.maxHp)
    expect(e.hp).toBeLessThan(e.maxHp)
  })

  it('periscope enables full preview', () => {
    const w = flatWorld()
    const s = addRoach(w, 'stilts', 1000, 0)
    const flags = { fullPreview: false }
    useSpecial(s, w, flags)
    expect(flags.fullPreview).toBe(true)
  })

  it('mega flick launches adjacent enemy', () => {
    const w = flatWorld()
    const b = addRoach(w, 'brawler', 1000, 0)
    const e = addRoach(w, 'zippy', 1000 + 13 + 9 + 30, 1)
    b.facing = 1
    expect(useSpecial(b, w, { fullPreview: false })).toBe(true)
    expect(e.hp).toBe(e.maxHp - 20)
    expect(e.vel.x).toBeGreaterThan(500)
  })

  it('mega flick without target keeps special charged', () => {
    const w = flatWorld()
    const b = addRoach(w, 'brawler', 1000, 0)
    expect(useSpecial(b, w, { fullPreview: false })).toBe(false)
    expect(canUseSpecial(b)).toBe(true)
  })

  it('dash grants invulnerability', () => {
    const w = flatWorld()
    const z = addRoach(w, 'zippy', 1000, 0)
    useSpecial(z, w, { fullPreview: false })
    expect(z.invulnTimer).toBeCloseTo(0.4)
    expect(z.dashTimer).toBeCloseTo(0.25)
  })

  it('cooldown ticks to zero after 3 turns', () => {
    const w = flatWorld()
    const z = addRoach(w, 'zippy', 1000, 0)
    useSpecial(z, w, { fullPreview: false })
    expect(canUseSpecial(z)).toBe(false)
    tickCooldowns([z]); tickCooldowns([z])
    expect(canUseSpecial(z)).toBe(false)
    tickCooldowns([z])
    expect(canUseSpecial(z)).toBe(true)
  })
})
