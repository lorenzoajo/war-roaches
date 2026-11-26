import { Material, type Vec2 } from './types'

export class TerrainMask {
  readonly width: number
  readonly height: number
  readonly data: Uint8Array

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
    this.data = new Uint8Array(width * height)
  }

  private inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height
  }

  get(x: number, y: number): Material {
    const ix = Math.floor(x), iy = Math.floor(y)
    if (!this.inBounds(ix, iy)) return Material.Air
    return (this.data[iy * this.width + ix] ?? Material.Air) as Material
  }

  set(x: number, y: number, m: Material): void {
    const ix = Math.floor(x), iy = Math.floor(y)
    if (this.inBounds(ix, iy)) this.data[iy * this.width + ix] = m
  }

  isSolid(x: number, y: number): boolean {
    return this.get(x, y) !== Material.Air
  }

  fillRect(x: number, y: number, w: number, h: number, m: Material): void {
    const x0 = Math.max(0, Math.floor(x)), y0 = Math.max(0, Math.floor(y))
    const x1 = Math.min(this.width, Math.floor(x + w)), y1 = Math.min(this.height, Math.floor(y + h))
    for (let yy = y0; yy < y1; yy++) this.data.fill(m, yy * this.width + x0, yy * this.width + x1)
  }

  fillCircle(cx: number, cy: number, r: number, m: Material): void {
    this.forCircle(cx, cy, r, (i) => {
      this.data[i] = m
    })
  }

  /** Erases terrain inside the circle, except Solid. Returns pixels removed. */
  carveCircle(cx: number, cy: number, r: number): number {
    let removed = 0
    this.forCircle(cx, cy, r, (i) => {
      const v = this.data[i]
      if (v !== Material.Air && v !== Material.Solid) {
        this.data[i] = Material.Air
        removed++
      }
    })
    return removed
  }

  private forCircle(cx: number, cy: number, r: number, fn: (index: number) => void): void {
    const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(this.height - 1, Math.ceil(cy + r))
    const r2 = r * r
    for (let y = y0; y <= y1; y++) {
      const dy = y + 0.5 - cy
      const span = r2 - dy * dy
      if (span < 0) continue
      const dx = Math.sqrt(span)
      const x0 = Math.max(0, Math.ceil(cx - dx - 0.5)), x1 = Math.min(this.width - 1, Math.floor(cx + dx - 0.5))
      for (let x = x0; x <= x1; x++) fn(y * this.width + x)
    }
  }

  /** Scanline polygon fill (even-odd). */
  fillPolygon(points: readonly Vec2[], m: Material): void {
    if (points.length < 3) return
    let minY = Infinity, maxY = -Infinity
    for (const p of points) {
      minY = Math.min(minY, p.y)
      maxY = Math.max(maxY, p.y)
    }
    const y0 = Math.max(0, Math.floor(minY)), y1 = Math.min(this.height - 1, Math.ceil(maxY))
    const xs: number[] = []
    for (let y = y0; y <= y1; y++) {
      const sy = y + 0.5
      xs.length = 0
      for (let i = 0; i < points.length; i++) {
        const a = points[i]!, b = points[(i + 1) % points.length]!
        if ((a.y <= sy && b.y > sy) || (b.y <= sy && a.y > sy)) xs.push(a.x + ((sy - a.y) / (b.y - a.y)) * (b.x - a.x))
      }
      xs.sort((p, q) => p - q)
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const xa = Math.max(0, Math.ceil(xs[k]! - 0.5)), xb = Math.min(this.width - 1, Math.floor(xs[k + 1]! - 0.5))
        if (xb >= xa) this.data.fill(m, y * this.width + xa, y * this.width + xb + 1)
      }
    }
  }

  overlapsCircle(cx: number, cy: number, r: number): boolean {
    const y0 = Math.floor(cy - r), y1 = Math.ceil(cy + r)
    const r2 = r * r
    for (let y = y0; y <= y1; y++) {
      const dy = y + 0.5 - cy
      const span = r2 - dy * dy
      if (span < 0) continue
      const dx = Math.sqrt(span)
      for (let x = Math.floor(cx - dx); x <= Math.ceil(cx + dx - 1); x++) if (this.isSolid(x, y)) return true
    }
    return false
  }

  /** Dominant non-air material in a 3px band just below the circle. */
  materialUnder(cx: number, cy: number, r: number): Material {
    const counts = new Map<Material, number>()
    for (let y = Math.floor(cy + r); y < cy + r + 3; y++)
      for (let x = Math.floor(cx - r * 0.7); x <= cx + r * 0.7; x++) {
        const m = this.get(x, y)
        if (m !== Material.Air) counts.set(m, (counts.get(m) ?? 0) + 1)
      }
    let best: Material = Material.Air, bestN = 0
    for (const [m, n] of counts) if (n > bestN) [best, bestN] = [m, n]
    return best
  }

  /** Outward normal: gradient of solid density sampled in a disc. */
  normalAt(x: number, y: number, r = 6): Vec2 {
    let nx = 0, ny = 0
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue
        if (this.isSolid(x + dx, y + dy)) {
          nx -= dx
          ny -= dy
        }
      }
    const l = Math.hypot(nx, ny)
    return l === 0 ? { x: 0, y: -1 } : { x: nx / l, y: ny / l }
  }

  raycast(from: Vec2, to: Vec2): Vec2 | null {
    const dx = to.x - from.x, dy = to.y - from.y
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))))
    for (let i = 0; i <= steps; i++) {
      const x = from.x + (dx * i) / steps, y = from.y + (dy * i) / steps
      if (this.isSolid(x, y)) return { x: Math.floor(x), y: Math.floor(y) }
    }
    return null
  }
}
