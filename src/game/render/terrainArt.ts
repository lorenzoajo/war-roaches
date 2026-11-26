import { Texture } from 'pixi.js'
import type { TerrainMask } from '../core/terrain'
import { Material, type Vec2 } from '../core/types'
import type { MapTheme } from '../maps/mapDef'
import { css, hash2, mix, rgb } from './color'

const DEPTH_SHADE = 140
const RIM_WIDTH = 7

function materialColor(m: Material, theme: MapTheme): number {
  switch (m) {
    case Material.Solid: return mix(theme.terrainDark, 0x3a3a48, 0.45)
    case Material.Sticky: return 0xffd75e
    case Material.Slippery: return 0xffb3d6
    case Material.Bouncy: return mix(theme.terrain, 0xffffff, 0.25)
    default: return theme.terrain
  }
}

/** Code-painted terrain kept in lockstep with the collision mask. */
export class TerrainArt {
  readonly canvas: HTMLCanvasElement
  readonly texture: Texture
  private readonly ctx: CanvasRenderingContext2D

  constructor(private readonly mask: TerrainMask, private readonly theme: MapTheme) {
    this.canvas = document.createElement('canvas')
    this.canvas.width = mask.width
    this.canvas.height = mask.height
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('2D canvas unavailable')
    this.ctx = ctx
    this.paint()
    this.texture = Texture.from(this.canvas)
  }

  private paint(): void {
    const { width: w, height: h } = this.mask
    const img = this.ctx.createImageData(w, h)
    const px = img.data
    const dark = this.theme.terrainDark
    for (let x = 0; x < w; x++) {
      let depth = 0
      for (let y = 0; y < h; y++) {
        const m = this.mask.get(x, y)
        if (m === Material.Air) {
          depth = 0
          continue
        }
        depth++
        let c = materialColor(m, this.theme)
        const n = hash2(x, y)
        if (depth <= 3) c = mix(c, 0xffffff, 0.35)
        else if (depth <= 6) c = mix(c, this.theme.rim, 0.25)
        else {
          c = mix(c, dark, Math.min(0.65, depth / DEPTH_SHADE))
        }
        if (m !== Material.Normal && depth > 10 && m !== Material.Solid) c = mix(materialColor(Material.Normal, this.theme), dark, Math.min(0.65, depth / DEPTH_SHADE))
        const sideAir = this.mask.get(x - 1, y) === Material.Air || this.mask.get(x + 1, y) === Material.Air
        if (sideAir) c = mix(c, this.theme.rim, 0.5)
        const [r, g, b] = rgb(c)
        const j = (n - 0.5) * 14
        const i = (y * w + x) * 4
        px[i] = r + j
        px[i + 1] = g + j
        px[i + 2] = b + j
        px[i + 3] = 255
      }
    }
    this.ctx.putImageData(img, 0, 0)
    this.paintSpeckles()
  }

  /** Round accent dots (sprinkles, cheese holes, crumbs) painted only onto existing terrain. */
  private paintSpeckles(): void {
    const ctx = this.ctx
    const accents = this.theme.accents
    if (accents.length === 0) return
    ctx.save()
    ctx.globalCompositeOperation = 'source-atop'
    const count = Math.floor((this.mask.width * this.mask.height) / 2600)
    for (let i = 0; i < count; i++) {
      const x = hash2(i, 17) * this.mask.width, y = hash2(i, 91) * this.mask.height
      if (!this.mask.isSolid(x, y - 10) || this.mask.get(x, y) === Material.Solid) continue
      const r = 2 + hash2(i, 5) * 5
      ctx.globalAlpha = 0.35 + hash2(i, 7) * 0.3
      ctx.fillStyle = css(accents[i % accents.length]!)
      ctx.beginPath()
      ctx.ellipse(x, y, r, r * (0.6 + hash2(i, 3) * 0.4), hash2(i, 11) * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  /** Mirrors mask.carveCircle: clears air pixels in the bbox and scorches the crater edge. */
  carve(pos: Vec2, radius: number): void {
    const pad = RIM_WIDTH + 1
    const x0 = Math.max(0, Math.floor(pos.x - radius - pad)), y0 = Math.max(0, Math.floor(pos.y - radius - pad))
    const x1 = Math.min(this.mask.width, Math.ceil(pos.x + radius + pad)), y1 = Math.min(this.mask.height, Math.ceil(pos.y + radius + pad))
    const bw = x1 - x0, bh = y1 - y0
    if (bw <= 0 || bh <= 0) return
    const img = this.ctx.getImageData(x0, y0, bw, bh)
    const px = img.data
    const [sr, sg, sb] = rgb(this.theme.rim)
    for (let y = 0; y < bh; y++)
      for (let x = 0; x < bw; x++) {
        const i = (y * bw + x) * 4
        const wx = x0 + x, wy = y0 + y
        if (!this.mask.isSolid(wx, wy)) {
          px[i + 3] = 0
          continue
        }
        const d = Math.hypot(wx + 0.5 - pos.x, wy + 0.5 - pos.y)
        if (d >= radius - 1 && d < radius + RIM_WIDTH) {
          const t = 0.55 * (1 - (d - radius) / RIM_WIDTH)
          px[i] = px[i]! + (sr - px[i]!) * t
          px[i + 1] = px[i + 1]! + (sg - px[i + 1]!) * t
          px[i + 2] = px[i + 2]! + (sb - px[i + 2]!) * t
        }
      }
    this.ctx.putImageData(img, x0, y0)
    this.texture.source.update()
  }

  destroy(): void {
    this.texture.destroy(true)
  }
}
