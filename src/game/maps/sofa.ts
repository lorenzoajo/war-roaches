import type { Rng } from '../core/rng'
import type { TerrainMask } from '../core/terrain'
import { Material } from '../core/types'
import type { MapDef, MapProp } from './mapDef'
import { coatSurface, ellipse, jitter, roundedRect } from './shapes'

interface Layout { cushions: { x: number; w: number; h: number }[]; coins: { x: number; y: number }[]; remote: { x: number; y: number } }

function layout(rng: Rng): Layout {
  const cushions = [
    { x: 280, w: 580 },
    { x: 920, w: 560 },
    { x: 1540, w: 580 },
  ].map((c) => ({ x: c.x + jitter(() => rng.next(), 20), w: c.w, h: rng.range(150, 210) }))
  return {
    cushions,
    coins: Array.from({ length: 5 }, (_, i) => ({ x: 300 + i * 450 + jitter(() => rng.next(), 60), y: rng.range(480, 620) })),
    remote: { x: rng.range(900, 1400), y: rng.range(380, 460) },
  }
}

export const sofa: MapDef = {
  id: 'sofa',
  name: "Grandma's Sofa",
  tagline: 'Lost coins and dust bunnies',
  theme: {
    sky: [0x4a3355, 0xc79a7a],
    terrain: 0xb5546b,
    terrainDark: 0x7a2f45,
    rim: 0x3a1a22,
    accents: [0xf2d6a2, 0xd9c27a, 0x2b2b2b],
    hazard: 0x9a9aa6,
    hazardName: 'Dust Bunny Pit',
    debris: [0xf2d6a2, 0xb5546b, 0xffffff],
  },
  physics: { gravityMult: 1, windMax: 50, bubbles: false },
  generate(mask: TerrainMask, rng: Rng): void {
    const L = layout(rng)
    // Indestructible frame: armrests + base with a torn hole in the middle.
    roundedRect(mask, 100, 560, 170, 640, 40, Material.Solid)
    roundedRect(mask, 2130, 560, 170, 640, 40, Material.Solid)
    mask.fillRect(100, 1010, 1040, 60, Material.Solid)
    mask.fillRect(1260, 1010, 1040, 60, Material.Solid)
    for (const c of L.cushions) {
      roundedRect(mask, c.x, 1010 - c.h, c.w, c.h, 50, Material.Normal)
      coatSurface(mask, c.x, c.x + c.w, 12, Material.Bouncy)
    }
    for (const coin of L.coins) ellipse(mask, coin.x, coin.y, 55, 14, Material.Normal)
    roundedRect(mask, L.remote.x, L.remote.y, 260, 44, 16, Material.Normal)
  },
  props(rng: Rng): MapProp[] {
    const L = layout(rng)
    return [
      { kind: 'remote', x: L.remote.x, y: L.remote.y, scale: 1, rot: 0 },
      ...L.coins.map((c) => ({ kind: 'coin', x: c.x, y: c.y, scale: 1, rot: 0 })),
      { kind: 'lamp', x: 2000, y: 200, scale: 1, rot: 0 },
    ]
  },
}
