import type { Rng } from './rng'
import type { TerrainMask } from './terrain'
import type { Vec2 } from './types'
import { dist } from './vec'

/** Top of each solid run (sampled every 8px column) with `headroom` air above and safely above the hazard. */
export function surfaceSpots(mask: TerrainMask, hazardY: number, headroom: number): Vec2[] {
  const spots: Vec2[] = []
  const limit = Math.min(mask.height, hazardY - 40)
  for (let x = 8; x < mask.width - 8; x += 8) {
    let airRun = 0
    for (let y = 0; y < limit; y++) {
      if (mask.isSolid(x, y)) {
        if (airRun >= headroom && mask.isSolid(x - 4, y + 2) && mask.isSolid(x + 4, y + 2)) spots.push({ x, y })
        airRun = 0
      } else airRun++
    }
  }
  return spots
}

export function findSpawnPoints(mask: TerrainMask, rng: Rng, count: number, minSpacing: number, hazardY: number): Vec2[] {
  const candidates = rng.shuffle(surfaceSpots(mask, hazardY, 40))
  if (candidates.length === 0) {
    return Array.from({ length: count }, (_, i) => ({ x: ((i + 0.5) / count) * mask.width, y: 100 }))
  }
  for (let spacing = minSpacing; spacing >= 30; spacing /= 2) {
    const chosen: Vec2[] = []
    for (const c of candidates) {
      if (chosen.every((p) => dist(p, c) >= spacing)) chosen.push(c)
      if (chosen.length === count) return chosen
    }
  }
  return Array.from({ length: count }, (_, i) => candidates[i % candidates.length]!)
}

export function findSafeSpot(mask: TerrainMask, rng: Rng, hazardY: number, avoid: readonly Vec2[]): Vec2 {
  const candidates = surfaceSpots(mask, hazardY, 40)
  if (candidates.length === 0) return { x: mask.width / 2, y: 100 }
  for (let i = 0; i < 40; i++) {
    const c = rng.pick(candidates)
    if (avoid.every((a) => dist(a, c) > 60)) return c
  }
  return rng.pick(candidates)
}
