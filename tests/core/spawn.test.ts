import { describe, expect, it } from 'vitest'
import { TerrainMask } from '../../src/game/core/terrain'
import { findSafeSpot, findSpawnPoints } from '../../src/game/core/spawn'
import { Rng } from '../../src/game/core/rng'
import { Material } from '../../src/game/core/types'
import { dist } from '../../src/game/core/vec'

describe('spawn', () => {
  it('findSpawnPoints respects spacing', () => {
    const m = new TerrainMask(2400, 1200)
    m.fillRect(0, 800, 2400, 400, Material.Normal)
    const pts = findSpawnPoints(m, new Rng(1), 16, 120, 1130)
    expect(pts.length).toBe(16)
    for (let i = 0; i < pts.length; i++)
      for (let j = i + 1; j < pts.length; j++) expect(dist(pts[i]!, pts[j]!)).toBeGreaterThanOrEqual(120)
  })

  it('findSpawnPoints falls back on empty mask', () => {
    const m = new TerrainMask(2400, 1200)
    const pts = findSpawnPoints(m, new Rng(1), 8, 120, 1130)
    expect(pts.length).toBe(8)
    for (const p of pts) expect(p.y).toBe(100)
  })

  it('spawn points stay above hazard', () => {
    const m = new TerrainMask(2400, 1200)
    m.fillRect(0, 1100, 1200, 100, Material.Normal) // below hazard - 40 → unusable
    m.fillRect(1200, 700, 1200, 500, Material.Normal)
    const pts = findSpawnPoints(m, new Rng(2), 8, 120, 1130)
    for (const p of pts) expect(p.y).toBeLessThan(1090)
  })

  it('findSafeSpot avoids given points', () => {
    const m = new TerrainMask(2400, 1200)
    m.fillRect(0, 800, 2400, 400, Material.Normal)
    const avoid = [{ x: 1200, y: 800 }]
    for (let s = 0; s < 20; s++) {
      const p = findSafeSpot(m, new Rng(s), 1130, avoid)
      expect(dist(p, avoid[0]!)).toBeGreaterThan(40)
    }
  })
})
