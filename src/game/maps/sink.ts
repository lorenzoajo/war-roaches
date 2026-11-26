import type { Rng } from '../core/rng'
import type { TerrainMask } from '../core/terrain'
import { Material } from '../core/types'
import type { MapDef, MapProp } from './mapDef'
import { ellipse, jitter, roundedRect } from './shapes'

interface Stack { x: number; top: number; w: number; bowl: boolean }

function layout(rng: Rng): Stack[] {
  const xs = [230, 620, 1000, 1420, 1800, 2170]
  return xs.map((x) => ({
    x: x + jitter(() => rng.next(), 40),
    top: rng.range(700, 900),
    w: rng.range(240, 320) * (1 + jitter(() => rng.next(), 0.15)),
    bowl: rng.next() < 0.5,
  }))
}

export const sink: MapDef = {
  id: 'sink',
  name: 'Sink Abyss',
  tagline: 'Dirty dishes over a soapy sea',
  theme: {
    sky: [0x9fd8f0, 0xe6f7ff],
    terrain: 0xf4f1ea,
    terrainDark: 0xb9c3cc,
    rim: 0x6b4f2a,
    accents: [0x7fc8e8, 0xf6c344, 0xe86a6a],
    hazard: 0x7ad0f0,
    hazardName: 'Soap Water',
    debris: [0xffffff, 0xdde6ee, 0xf6c344],
  },
  physics: { gravityMult: 1, windMax: 60, bubbles: true },
  generate(mask: TerrainMask, rng: Rng): void {
    for (const s of layout(rng)) {
      for (let y = 1200; y > s.top; y -= 22) roundedRect(mask, s.x - s.w / 2 + jitter(() => rng.next(), 10), y - 20, s.w, 20, 8, Material.Normal)
      if (s.bowl) {
        ellipse(mask, s.x, s.top - 10, s.w * 0.42, 70, Material.Normal)
        ellipse(mask, s.x, s.top - 60, s.w * 0.34, 60, Material.Air)
      }
    }
    // Faucet: indestructible column hanging from the top, with a spout.
    mask.fillRect(1170, 0, 60, 260, Material.Solid)
    roundedRect(mask, 1080, 230, 150, 40, 18, Material.Solid)
    // Floating sponge platforms.
    roundedRect(mask, 420, 520, 140, 50, 12, Material.Normal)
    roundedRect(mask, 1860, 500, 140, 50, 12, Material.Normal)
  },
  props(rng: Rng): MapProp[] {
    const stacks = layout(rng)
    return [
      { kind: 'faucet', x: 1200, y: 0, scale: 1, rot: 0 },
      ...stacks.filter((s) => s.bowl).map((s) => ({ kind: 'spoon', x: s.x + 30, y: s.top - 90, scale: 1, rot: 0.6 })),
    ]
  },
}
