import { Container, DisplacementFilter, Graphics, Sprite, Texture } from 'pixi.js'
import { WORLD_H, WORLD_W } from '../core/constants'
import type { Candle } from '../core/entities'
import type { MapId } from '../core/types'
import type { MapProp, MapTheme } from '../maps/mapDef'
import { css, mix } from './color'

/** Screen-space sky; call resize when the viewport changes. */
export function buildSky(theme: MapTheme): { view: Sprite; resize(w: number, h: number): void } {
  const c = document.createElement('canvas')
  c.width = 4
  c.height = 256
  const ctx = c.getContext('2d')
  if (ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, 256)
    g.addColorStop(0, css(theme.sky[0]))
    g.addColorStop(1, css(theme.sky[1]))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 4, 256)
  }
  const view = new Sprite(Texture.from(c))
  return {
    view,
    resize(w, h) {
      view.width = w
      view.height = h
    },
  }
}

/** Far silhouettes drawn in world coords; the view shifts them by a parallax factor. */
export function buildParallax(theme: MapTheme, mapId: MapId, factor: number, seed: number): Container {
  const g = new Graphics()
  const color = mix(theme.sky[1], theme.terrainDark, factor * 0.35)
  let s = seed
  const rnd = (): number => ((s = (s * 16807) % 2147483647) / 2147483647)
  const base = WORLD_H * 0.75
  switch (mapId) {
    case 'sink':
      for (let i = 0; i < 9; i++) g.roundRect(i * 300 + rnd() * 80, base - 260 - rnd() * 200, 90, 600, 30).fill({ color, alpha: 0.5 })
      break
    case 'pizza':
      for (let i = 0; i < 6; i++) g.circle(i * 450 + rnd() * 100, base, 160 + rnd() * 80).fill({ color, alpha: 0.45 })
      break
    case 'sofa':
      g.roundRect(-200, base - 300, WORLD_W + 400, 700, 120).fill({ color, alpha: 0.35 })
      for (let i = 0; i < 5; i++) g.rect(i * 560 + 100, 80, 240, 300).fill({ color: mix(color, 0xffffff, 0.2), alpha: 0.3 })
      break
    case 'moon':
      g.circle(1900, 260, 160).fill({ color: 0x5aa0ff, alpha: 0.35 })
      g.circle(1860, 230, 40).fill({ color: 0x46d37a, alpha: 0.35 })
      break
    case 'cake':
      for (let i = 0; i < 8; i++) g.circle(i * 330 + rnd() * 60, 200 + rnd() * 300, 30 + rnd() * 40).fill({ color: mix(color, 0xffffff, 0.5), alpha: 0.4 })
      break
  }
  const c = new Container()
  c.addChild(g)
  return c
}

export interface PropsView {
  back: Container
  front: Container
  update(t: number, candles: readonly Candle[]): void
}

export function buildProps(props: readonly MapProp[], theme: MapTheme): PropsView {
  const back = new Container()
  const front = new Container()
  const flames: { g: Graphics; candle: number }[] = []
  let candleIdx = 0
  for (const p of props) {
    const g = new Graphics()
    g.position.set(p.x, p.y)
    g.rotation = p.rot
    switch (p.kind) {
      case 'faucet':
        g.roundRect(-40, -40, 80, 70, 20).fill(0xc9d3dc).stroke({ width: 4, color: 0x7a8794 })
        g.roundRect(-90, 230, 60, 30, 10).fill(0xc9d3dc)
        back.addChild(g)
        continue
      case 'spoon':
        g.roundRect(-6, -110, 12, 120, 6).fill(0xc9d3dc)
        g.ellipse(0, -120, 22, 30).fill(0xdde6ee)
        back.addChild(g)
        continue
      case 'olive':
        g.circle(0, 0, 14).fill(0x2b2b2b)
        g.circle(0, 0, 5).fill(0xd8452c)
        front.addChild(g)
        continue
      case 'remote':
        for (let i = 0; i < 6; i++) g.circle(30 + i * 36, 22, 8).fill([0xff4d5e, 0x46d37a, 0xf2d6a2][i % 3]!)
        front.addChild(g)
        continue
      case 'coin':
        g.ellipse(0, 0, 50, 10).stroke({ width: 3, color: 0xfff2b0, alpha: 0.7 })
        front.addChild(g)
        continue
      case 'lamp':
        g.moveTo(0, -200).lineTo(0, 120).stroke({ width: 6, color: 0x2b2b2b })
        g.poly([-90, 120, 90, 120, 50, 20, -50, 20]).fill({ color: 0xffe9a8, alpha: 0.9 })
        g.circle(0, 160, 160).fill({ color: 0xfff2b0, alpha: 0.08 })
        back.addChild(g)
        continue
      case 'star': {
        const r = 2 + ((p.x * 7 + p.y) % 3)
        g.circle(0, 0, r).fill({ color: 0xffffff, alpha: 0.85 })
        back.addChild(g)
        continue
      }
      case 'flag':
        g.moveTo(0, 0).lineTo(0, -80).stroke({ width: 4, color: 0xdddddd })
        g.poly([0, -80, 50, -68, 0, -56]).fill(0xff4d5e)
        front.addChild(g)
        continue
      case 'candle': {
        const stripe = theme.accents[candleIdx % theme.accents.length] ?? 0xffffff
        g.roundRect(-8, -60, 16, 60, 4).fill(0xffffff)
        for (let k = 0; k < 4; k++) g.rect(-8, -56 + k * 15, 16, 6).fill(stripe)
        const flame = new Graphics()
        flame.position.set(0, -66)
        g.addChild(flame)
        flames.push({ g: flame, candle: candleIdx++ })
        front.addChild(g)
        continue
      }
      case 'plate':
        g.ellipse(0, 20, 1060, 40).fill({ color: 0xffffff, alpha: 0.6 })
        back.addChild(g)
        continue
    }
  }
  return {
    back,
    front,
    update(t, candles) {
      for (const f of flames) {
        f.g.clear()
        if (!candles[f.candle]?.lit) continue
        const s = 1 + Math.sin(t * 18 + f.candle) * 0.15
        f.g.ellipse(0, 0, 7 * s, 13 * s).fill({ color: 0xffa630, alpha: 0.9 })
        f.g.ellipse(0, 3, 4 * s, 7 * s).fill(0xfff27f)
      }
    },
  }
}

function noiseTexture(): Texture {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')
  if (ctx) {
    const img = ctx.createImageData(128, 128)
    for (let y = 0; y < 128; y++)
      for (let x = 0; x < 128; x++) {
        const i = (y * 128 + x) * 4
        const v = 128 + Math.sin(x / 7) * 60 + Math.cos(y / 5) * 60
        img.data[i] = v
        img.data[i + 1] = 255 - v
        img.data[i + 2] = 128
        img.data[i + 3] = 255
      }
    ctx.putImageData(img, 0, 0)
  }
  return Texture.from(c)
}

/** Animated liquid at the bottom of the world with a displacement ripple. */
export function buildHazard(theme: MapTheme): { view: Container; update(t: number, hazardY: number): void } {
  const view = new Container()
  const body = new Graphics()
  const noise = new Sprite(noiseTexture())
  noise.texture.source.addressMode = 'repeat'
  noise.scale.set(4)
  noise.renderable = false
  const filter = new DisplacementFilter({ sprite: noise, scale: 14 })
  view.addChild(noise, body)
  view.filters = [filter]
  const light = mix(theme.hazard, 0xffffff, 0.45)
  return {
    view,
    update(t, hazardY) {
      noise.x = t * 30
      noise.y = t * 12
      body.clear()
      const pts: number[] = []
      for (let x = -400; x <= WORLD_W + 400; x += 40) pts.push(x, hazardY + Math.sin(x / 90 + t * 2.2) * 7 + Math.sin(x / 37 - t * 3.1) * 3)
      body.poly([...pts, WORLD_W + 400, WORLD_H + 600, -400, WORLD_H + 600]).fill({ color: theme.hazard, alpha: 0.92 })
      body.moveTo(pts[0]!, pts[1]!)
      for (let i = 2; i < pts.length; i += 2) body.lineTo(pts[i]!, pts[i + 1]!)
      body.stroke({ width: 6, color: light, alpha: 0.9 })
    },
  }
}
