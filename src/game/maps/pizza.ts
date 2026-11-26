import type { Rng } from '../core/rng'
import type { TerrainMask } from '../core/terrain'
import { Material } from '../core/types'
import type { MapDef, MapProp } from './mapDef'
import { coatSurface, ellipse, heightfield, jitter } from './shapes'

interface Layout { phase: number; amp: number; pepperoni: { x: number; y: number; r: number }[]; bites: number[] }

function layout(rng: Rng): Layout {
  return {
    phase: rng.range(0, Math.PI * 2),
    amp: rng.range(40, 70),
    pepperoni: [300, 750, 1200, 1650, 2100].map((x) => ({ x: x + jitter(() => rng.next(), 40), y: rng.range(420, 540), r: rng.range(55, 75) })),
    bites: [rng.range(700, 900), rng.range(1500, 1700)],
  }
}

export const pizza: MapDef = {
  id: 'pizza',
  name: 'Pizza Planet',
  tagline: 'Extra cheese, extra chaos',
  theme: {
    sky: [0x2b1a3a, 0xff9a52],
    terrain: 0xe8b04a,
    terrainDark: 0xb06a2a,
    rim: 0x5a2a10,
    accents: [0xd8452c, 0x3f8f3a, 0xfff2b0],
    hazard: 0xff5a1f,
    hazardName: 'Oven Glow',
    debris: [0xffd75e, 0xd8452c, 0xb06a2a],
  },
  physics: { gravityMult: 1, windMax: 60, bubbles: false },
  generate(mask: TerrainMask, rng: Rng): void {
    const L = layout(rng)
    const surface = (x: number): number => {
      const crust = x < 260 ? (260 - x) * 0.9 : x > 2140 ? (x - 2140) * 0.9 : 0
      return 760 + Math.sin(x / 210 + L.phase) * L.amp - Math.min(crust, 140)
    }
    heightfield(mask, 80, 2320, surface, 1200, Material.Normal)
    for (const b of L.bites) ellipse(mask, b, surface(b) + 120, 110, 260, Material.Air)
    for (const p of L.pepperoni) ellipse(mask, p.x, p.y, p.r, p.r * 0.45, Material.Normal)
    coatSurface(mask, 0, 2400, 6, Material.Sticky)
  },
  props(rng: Rng): MapProp[] {
    const L = layout(rng)
    return L.pepperoni.map((p) => ({ kind: 'olive', x: p.x + p.r * 0.4, y: p.y - p.r * 0.45 - 4, scale: 1, rot: 0 }))
  },
}
