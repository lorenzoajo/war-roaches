import { describe, expect, it } from 'vitest'
import { HeldDirections } from '../../src/game/input/heldDirections'

describe('HeldDirections', () => {
  it('rolling thumb from left to right keeps walking right', () => {
    const h = new HeldDirections()
    expect(h.press(1, -1)).toBe(-1)
    expect(h.press(2, 1)).toBe(1)
    expect(h.release(1)).toBe(1)
    expect(h.release(2)).toBe(0)
  })
  it('releasing the newer button falls back to the older one', () => {
    const h = new HeldDirections()
    h.press(1, -1)
    h.press(2, 1)
    expect(h.release(2)).toBe(-1)
  })
})
