import type { TerrainMask } from '../core/terrain'
import { Material, type Vec2 } from '../core/types'

export function ellipse(mask: TerrainMask, cx: number, cy: number, rx: number, ry: number, m: Material): void {
  const pts: Vec2[] = []
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2
    pts.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry })
  }
  mask.fillPolygon(pts, m)
}

/** Fills from yAt(x) down to `bottom` for x in [x0, x1]. */
export function heightfield(mask: TerrainMask, x0: number, x1: number, yAt: (x: number) => number, bottom: number, m: Material): void {
  const pts: Vec2[] = [{ x: x0, y: bottom }]
  for (let x = x0; x <= x1; x += 8) pts.push({ x, y: yAt(x) })
  pts.push({ x: x1, y: yAt(x1) }, { x: x1, y: bottom })
  mask.fillPolygon(pts, m)
}

export function roundedRect(mask: TerrainMask, x: number, y: number, w: number, h: number, r: number, m: Material): void {
  const rr = Math.min(r, w / 2, h / 2)
  mask.fillRect(x + rr, y, w - 2 * rr, h, m)
  mask.fillRect(x, y + rr, w, h - 2 * rr, m)
  mask.fillCircle(x + rr, y + rr, rr, m)
  mask.fillCircle(x + w - rr, y + rr, rr, m)
  mask.fillCircle(x + rr, y + h - rr, rr, m)
  mask.fillCircle(x + w - rr, y + h - rr, rr, m)
}

/** Repaints the top `thickness` px of every exposed Normal surface in [x0, x1] with `m`. */
export function coatSurface(mask: TerrainMask, x0: number, x1: number, thickness: number, m: Material): void {
  for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(mask.width - 1, x1); x++) {
    let prevAir = true
    for (let y = 0; y < mask.height; y++) {
      const v = mask.get(x, y)
      if (v !== Material.Air && prevAir && v === Material.Normal) {
        for (let k = 0; k < thickness; k++) if (mask.get(x, y + k) === Material.Normal) mask.set(x, y + k, m)
      }
      prevAir = v === Material.Air
    }
  }
}

export const jitter = (rnd: () => number, amount: number): number => (rnd() * 2 - 1) * amount
