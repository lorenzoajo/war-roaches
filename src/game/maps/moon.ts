import type { Rng } from '../core/rng'
import type { TerrainMask } from '../core/terrain'
import { Material } from '../core/types'
import type { MapDef, MapProp } from './mapDef'
import { ellipse, heightfield, jitter } from './shapes'

interface Layout { phase: number; holes: { x: number; y: number; r: number }[]; chunks: { x: number; y: number; r: number }[]; stars: { x: number; y: number }[] }

function layout(rng: Rng): Layout {
  return {
    phase: rng.range(0, Math.PI * 2),
    holes: Array.from({ length: 30 }, () => ({ x: rng.range(120, 2280), y: rng.range(780, 1100), r: rng.range(20, 60) })),
    chunks: [400, 1200, 2000].map((x) => ({ x: x + jitter(() => rng.next(), 80), y: rng.range(360, 480), r: rng.range(60, 90) })),
    stars: Array.from({ length: 40 }, () => ({ x: rng.range(0, 2400), y: rng.range(0, 600) })),
  }
}

export const moon: MapDef = {
  id: 'moon',
  name: 'Moon Cheese',
  tagline: 'Low gravity, high hopes',
  theme: {
    sky: [0x070720, 0x23234a],
    terrain: 0xf3d55b,
    terrainDark: 0xc49a2a,
    rim: 0x6a4a10,
    accents: [0xffffff, 0x9ad0ff],
    hazard: 0x3a2a7a,
    hazardName: 'Space Void',
    debris: [0xf3d55b, 0xffe68a, 0xc49a2a],
  },
  physics: { gravityMult: 0.45, windMax: 30, bubbles: false },
  generate(mask: TerrainMask, rng: Rng): void {
    const L = layout(rng)
    heightfield(mask, 60, 2340, (x) => 720 + Math.sin(x / 260 + L.phase) * 80 + Math.sin(x / 90) * 18, 1200, Material.Normal)
    for (const h of L.holes) mask.carveCircle(h.x, h.y, h.r)
    for (const c of L.chunks) ellipse(mask, c.x, c.y, c.r, c.r * 0.6, Material.Normal)
  },
  props(rng: Rng): MapProp[] {
    const L = layout(rng)
    return [...L.stars.map((s) => ({ kind: 'star', x: s.x, y: s.y, scale: 1, rot: 0 })), { kind: 'flag', x: L.chunks[1]?.x ?? 1200, y: (L.chunks[1]?.y ?? 400) - 50, scale: 1, rot: 0 }]
  },
}
