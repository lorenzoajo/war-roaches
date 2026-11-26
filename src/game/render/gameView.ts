import { Application, Container, Sprite } from 'pixi.js'
import type { Game } from '../core/game'
import type { GameEvent } from '../core/events'
import { logger } from '../../lib/logger'
import { Camera } from './camera'
import { TerrainArt } from './terrainArt'
import { buildHazard, buildParallax, buildProps, buildSky, type PropsView } from './background'

export interface ViewLayers {
  world: Container
  entities: Container
  roaches: Container
  fx: Container
  overlay: Container
}

/** Owns the Pixi app; runs the frame loop (sim update → events → views → camera). */
export class GameView {
  readonly camera = new Camera()
  readonly app = new Application()
  readonly layers: ViewLayers = {
    world: new Container(),
    entities: new Container(),
    roaches: new Container(),
    fx: new Container(),
    overlay: new Container(),
  }
  terrain: TerrainArt | null = null
  /** Called once per frame with the drained events; later tasks hook effects/sfx here. */
  eventHandlers: ((e: GameEvent) => void)[] = []
  frameHandlers: ((dt: number, t: number) => void)[] = []
  followTarget: (() => { x: number; y: number } | null) | null = null
  private time = 0
  private parallax: { c: Container; f: number }[] = []
  private propsView: PropsView | null = null
  private hazard: ReturnType<typeof buildHazard> | null = null
  private sky: ReturnType<typeof buildSky> | null = null
  private mounted = false
  private resizeObs: ResizeObserver | null = null

  constructor(readonly game: Game) {}

  async mount(parent: HTMLElement): Promise<void> {
    const theme = this.game.map.theme
    await this.app.init({
      resizeTo: parent,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      background: theme.sky[0],
    })
    parent.appendChild(this.app.canvas)
    this.mounted = true

    this.sky = buildSky(theme)
    this.app.stage.addChild(this.sky.view)
    for (const f of [0.3, 0.6]) {
      const c = buildParallax(theme, this.game.config.mapId, f, this.game.config.seed + Math.round(f * 10))
      this.parallax.push({ c, f })
      this.app.stage.addChild(c)
    }
    this.terrain = new TerrainArt(this.game.world.mask, theme)
    this.propsView = buildProps(this.game.props, theme)
    this.hazard = buildHazard(theme)
    const L = this.layers
    L.world.addChild(this.propsView.back, new Sprite(this.terrain.texture), this.propsView.front, L.entities, L.roaches, this.hazard.view, L.fx, L.overlay)
    this.app.stage.addChild(L.world)

    this.onResize()
    this.resizeObs = new ResizeObserver(() => this.onResize())
    this.resizeObs.observe(parent)
    const r = this.game.activeRoach()
    if (r) {
      this.camera.x = r.pos.x
      this.camera.y = r.pos.y
    }
    this.camera.setZoom(Math.max(0.6, this.camera.minZoomToFit()))
    this.app.ticker.add((ticker) => this.frame(ticker.deltaMS / 1000))
  }

  private onResize(): void {
    const { width, height } = this.app.screen
    this.camera.setViewport(width, height)
    this.camera.setZoom(this.camera.zoom)
    this.sky?.resize(width, height)
  }

  private frame(dt: number): void {
    try {
      this.time += dt
      this.game.update(dt)
      for (const e of this.game.drainEvents()) {
        if (e.type === 'carve') this.terrain?.carve(e.pos, e.radius)
        for (const h of this.eventHandlers) h(e)
      }
      for (const h of this.frameHandlers) h(dt, this.time)
      this.propsView?.update(this.time, this.game.world.candles)
      this.hazard?.update(this.time, this.game.world.hazardY)
      const target = this.followTarget?.()
      if (target) this.camera.follow(target, dt, 4)
      const shake = this.camera.update(dt)
      this.applyCamera(shake)
    } catch (err) {
      logger.error('frame failed', err)
    }
  }

  private applyCamera(shake: { x: number; y: number }): void {
    const c = this.camera
    const w = this.layers.world
    w.scale.set(c.zoom)
    w.position.set(c.viewW / 2 - c.x * c.zoom + shake.x, c.viewH / 2 - c.y * c.zoom + shake.y)
    for (const p of this.parallax) {
      p.c.scale.set(c.zoom * (0.6 + 0.4 * p.f))
      p.c.position.set(c.viewW / 2 - c.x * c.zoom * p.f, c.viewH / 2 - c.y * c.zoom * p.f - 200 * c.zoom * (1 - p.f))
    }
  }

  destroy(): void {
    this.resizeObs?.disconnect()
    this.terrain?.destroy()
    if (this.mounted) this.app.destroy(true, { children: true })
  }
}
