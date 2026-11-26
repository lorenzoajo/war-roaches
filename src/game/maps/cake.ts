import type { Rng } from '../core/rng'
import type { TerrainMask } from '../core/terrain'
import { Material } from '../core/types'
import type { MapDef, MapProp } from './mapDef'
import { coatSurface, ellipse, jitter, roundedRect } from './shapes'

interface Tier { x: number; y: number; w: number; h: number }
interface Layout { tiers: Tier[]; candleXs: number[]; cupcakes: { x: number; y: number }[] }

function layout(rng: Rng): Layout {
  const j = (a: number): number => jitter(() => rng.next(), a)
  const tiers: Tier[] = [
    { x: 300 + j(30), y: 820, w: 1800, h: 240 },
    { x: 620 + j(40), y: 620 + j(20), w: 1160, h: 210 },
    { x: 920 + j(40), y: 450 + j(20), w: 560, h: 180 },
  ]
  const count = rng.int(5, 7)
  const candleXs = Array.from({ length: count }, (_, i) => {
    const t = tiers[i % 2 === 0 ? 0 : 1]!
    return t.x + 60 + ((i + 0.5) / count) * (t.w - 120)
  })
  return { tiers, candleXs, cupcakes: [{ x: 160, y: 640 + j(40) }, { x: 2240, y: 640 + j(40) }] }
}

function tierTopAt(tiers: Tier[], x: number): number {
  let top = 1050
  for (const t of tiers) if (x >= t.x && x <= t.x + t.w) top = Math.min(top, t.y)
  return top
}

export const cake: MapDef = {
  id: 'cake',
  name: 'Birthday Cake Volcano',
  tagline: 'Make a wish. Then duck.',
  theme: {
    sky: [0xffb3d1, 0xfff0c2],
    terrain: 0xf7d9a8,
    terrainDark: 0xa05a3a,
    rim: 0x5a2a1a,
    accents: [0xff6fa8, 0x7fe0ff, 0xfff27f, 0xffffff],
    hazard: 0xd8233a,
    hazardName: 'Lava Jam',
    debris: [0xff6fa8, 0xf7d9a8, 0x7fe0ff, 0xfff27f],
  },
  physics: { gravityMult: 1, windMax: 60, bubbles: false },
  generate(mask: TerrainMask, rng: Rng): void {
    const L = layout(rng)
    mask.fillRect(200, 1050, 2000, 30, Material.Solid)
    for (const t of L.tiers) roundedRect(mask, t.x, t.y, t.w, t.h + 20, 24, Material.Normal)
    const top = L.tiers[2]!
    ellipse(mask, top.x + top.w / 2, top.y, 110, 70, Material.Air) // volcano crater
    for (const c of L.cupcakes) roundedRect(mask, c.x - 70, c.y, 140, 90, 30, Material.Normal)
    coatSurface(mask, 0, 2400, 6, Material.Slippery)
  },
  props(rng: Rng): MapProp[] {
    const L = layout(rng)
    return [
      ...L.candleXs.map((x) => ({ kind: 'candle', x, y: tierTopAt(L.tiers, x), scale: 1, rot: 0 })),
      { kind: 'plate', x: 1200, y: 1050, scale: 1, rot: 0 },
    ]
  },
}
