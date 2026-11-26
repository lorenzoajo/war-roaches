import { describe, expect, it } from 'vitest'
import { Camera } from '../../src/game/render/camera'

const cam = (): Camera => {
  const c = new Camera()
  c.setViewport(844, 390)
  c.x = 1200
  c.y = 600
  c.zoom = 1
  return c
}

describe('Camera', () => {
  it('worldToScreen∘screenToWorld is identity', () => {
    const c = cam()
    c.zoom = 0.7
    const p = { x: 123, y: 456 }
    const back = c.screenToWorld(c.worldToScreen(p))
    expect(back.x).toBeCloseTo(p.x)
    expect(back.y).toBeCloseTo(p.y)
  })

  it('zoom keeps anchor point fixed', () => {
    const c = cam()
    const anchor = { x: 200, y: 100 }
    const before = c.screenToWorld(anchor)
    c.setZoom(1.6, anchor)
    const after = c.screenToWorld(anchor)
    expect(after.x).toBeCloseTo(before.x)
    expect(after.y).toBeCloseTo(before.y)
  })

  it('clamp keeps view inside world bounds', () => {
    const c = cam()
    c.x = -5000
    c.y = 99999
    c.clamp()
    expect(c.screenToWorld({ x: 0, y: 0 }).x).toBeGreaterThanOrEqual(-200 - 0.001)
    expect(c.screenToWorld({ x: 844, y: 390 }).y).toBeLessThanOrEqual(1200 + 0.001)
  })

  it('follow converges', () => {
    const c = cam()
    for (let i = 0; i < 120; i++) c.follow({ x: 900, y: 700 }, 1 / 60)
    expect(Math.abs(c.x - 900)).toBeLessThan(2)
    expect(Math.abs(c.y - 700)).toBeLessThan(2)
  })

  it('shake decays to zero', () => {
    const c = cam()
    c.shake(8)
    const first = c.update(1 / 60)
    expect(Math.hypot(first.x, first.y)).toBeGreaterThan(0)
    let off = first
    for (let i = 0; i < 180; i++) off = c.update(1 / 60)
    expect(off).toEqual({ x: 0, y: 0 })
  })
})
