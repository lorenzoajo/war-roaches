import { describe, expect, it } from 'vitest'
import { Rng } from '../../src/game/core/rng'

describe('Rng', () => {
  it('rng is deterministic per seed', () => {
    const a = new Rng(42), b = new Rng(42), c = new Rng(43)
    const va = Array.from({ length: 10 }, () => a.next())
    const vb = Array.from({ length: 10 }, () => b.next())
    const vc = Array.from({ length: 10 }, () => c.next())
    expect(va).toEqual(vb)
    expect(va).not.toEqual(vc)
    for (const v of va) expect(v >= 0 && v < 1).toBe(true)
  })

  it('int stays in bounds', () => {
    const r = new Rng(7)
    const seen = new Set<number>()
    for (let i = 0; i < 10000; i++) seen.add(r.int(1, 3))
    expect([...seen].sort()).toEqual([1, 2, 3])
  })
})
