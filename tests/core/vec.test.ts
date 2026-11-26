import { describe, expect, it } from 'vitest'
import { fromAngle, len, norm } from '../../src/game/core/vec'

describe('vec', () => {
  it('norm of zero vector is zero', () => {
    expect(norm({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 })
  })
  it('fromAngle has requested magnitude', () => {
    expect(len(fromAngle(1.2, 5))).toBeCloseTo(5)
  })
})
