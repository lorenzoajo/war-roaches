import { describe, expect, it } from 'vitest'
import { aimFromDrag, isInAimZone, pinchZoom } from '../../src/game/input/gestures'

describe('gestures', () => {
  it('drag left-down aims right-up', () => {
    const a = aimFromDrag({ x: 100, y: 100 }, { x: 40, y: 160 }, 10)
    expect(a.angle).toBeCloseTo(-Math.PI / 4)
    expect(a.power).toBeCloseTo(Math.hypot(60, 60) / 180)
    expect(a.cancel).toBe(false)
  })

  it('power clamps at 1', () => {
    expect(aimFromDrag({ x: 100, y: 100 }, { x: 600, y: 100 }, 10).power).toBe(1)
  })

  it('drag back onto roach cancels', () => {
    expect(aimFromDrag({ x: 100, y: 100 }, { x: 110, y: 105 }, 10).cancel).toBe(true)
  })

  it('grab zone has 60px minimum', () => {
    expect(isInAimZone({ x: 155, y: 100 }, { x: 100, y: 100 }, 5)).toBe(true)
    expect(isInAimZone({ x: 165, y: 100 }, { x: 100, y: 100 }, 5)).toBe(false)
    expect(isInAimZone({ x: 185, y: 100 }, { x: 100, y: 100 }, 30)).toBe(true)
  })

  it('pinch zoom clamps', () => {
    expect(pinchZoom(100, 200, 1)).toBe(2)
    expect(pinchZoom(100, 300, 1)).toBe(2)
    expect(pinchZoom(100, 10, 1)).toBe(0.35)
    expect(pinchZoom(100, 150, 1)).toBeCloseTo(1.5)
  })
})
