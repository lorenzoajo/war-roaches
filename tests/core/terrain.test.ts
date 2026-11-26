import { describe, expect, it } from 'vitest'
import { TerrainMask } from '../../src/game/core/terrain'
import { Material } from '../../src/game/core/types'

const ground = (y = 100, w = 200, h = 300): TerrainMask => {
  const m = new TerrainMask(w, h)
  m.fillRect(0, y, w, h - y, Material.Normal)
  return m
}

describe('TerrainMask', () => {
  it('carveCircle removes pixels in radius', () => {
    const m = new TerrainMask(100, 100)
    m.fillRect(0, 0, 100, 100, Material.Normal)
    const removed = m.carveCircle(50, 50, 10)
    expect(m.isSolid(50, 50)).toBe(false)
    expect(m.isSolid(50, 65)).toBe(true)
    expect(Math.abs(removed - Math.PI * 100) / (Math.PI * 100)).toBeLessThan(0.05)
  })

  it('carveCircle keeps Solid material', () => {
    const m = new TerrainMask(100, 100)
    m.fillRect(0, 0, 100, 100, Material.Solid)
    m.carveCircle(50, 50, 10)
    expect(m.get(50, 50)).toBe(Material.Solid)
  })

  it('out of bounds is air', () => {
    const m = ground()
    expect(m.get(-5, 150)).toBe(Material.Air)
    expect(m.get(5, 9999)).toBe(Material.Air)
  })

  it('normalAt flat ground points up', () => {
    const m = ground()
    expect(m.normalAt(100, 100).y).toBeLessThan(-0.9)
  })

  it('raycast hits ground', () => {
    const m = ground()
    expect(m.raycast({ x: 50, y: 0 }, { x: 50, y: 200 })?.y).toBe(100)
    expect(m.raycast({ x: 50, y: 0 }, { x: 50, y: 50 })).toBeNull()
  })

  it('materialUnder reports Sticky', () => {
    const m = new TerrainMask(200, 300)
    m.fillRect(0, 100, 200, 200, Material.Sticky)
    expect(m.materialUnder(50, 90, 10)).toBe(Material.Sticky)
  })

  it('overlapsCircle detects terrain', () => {
    const m = ground()
    expect(m.overlapsCircle(50, 95, 10)).toBe(true)
    expect(m.overlapsCircle(50, 80, 10)).toBe(false)
  })

  it('fillPolygon fills a triangle', () => {
    const m = new TerrainMask(100, 100)
    m.fillPolygon([{ x: 10, y: 90 }, { x: 90, y: 90 }, { x: 50, y: 10 }], Material.Normal)
    expect(m.isSolid(50, 80)).toBe(true)
    expect(m.isSolid(12, 20)).toBe(false)
  })
})
