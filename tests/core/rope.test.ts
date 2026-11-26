import { describe, expect, it } from 'vitest'
import { fireRope, stepRope } from '../../src/game/core/rope'
import { addRoach, flatWorld } from './helpers'
import { TICK } from '../../src/game/core/constants'
import { Material } from '../../src/game/core/types'

describe('rope', () => {
  it('rope attaches within 320px and swings', () => {
    const w = flatWorld()
    w.mask.fillRect(800, 400, 400, 40, Material.Normal)
    const r = addRoach(w, 'zippy', 1000, 0, 700)
    const rope = fireRope(r.pos, -Math.PI / 2, w.mask)
    expect(rope).not.toBeNull()
    expect(rope!.anchor.y).toBe(439)
    r.grounded = false
    const x0 = r.pos.x
    for (let t = 0; t < 1; t += TICK) stepRope(r, rope!, { dir: 1, jumpPressed: false, jumpHeld: false }, w, TICK)
    expect(Math.abs(r.pos.x - x0)).toBeGreaterThan(10)
    expect(Math.hypot(r.pos.x - rope!.anchor.x, r.pos.y - rope!.anchor.y)).toBeLessThanOrEqual(rope!.length + 1)
  })

  it('rope out of reach returns null', () => {
    const w = flatWorld()
    const r = addRoach(w, 'zippy', 1000, 0, 300)
    expect(fireRope(r.pos, -Math.PI / 2, w.mask)).toBeNull()
  })
})
