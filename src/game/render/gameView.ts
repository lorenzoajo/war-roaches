import { Application, Container, Sprite } from 'pixi.js'
import type { Game } from '../core/game'
import type { GameEvent } from '../core/events'
import { TEAM_COLORS, type Vec2 } from '../core/types'
import { logger } from '../../lib/logger'
import { sfx, vibrate } from '../audio/sfx'
import { Camera } from './camera'
import { TerrainArt } from './terrainArt'
import { buildHazard, buildParallax, buildProps, buildSky, type PropsView } from './background'
import { RoachView } from './roachView'
import { EntityViews } from './entityViews'
import { Effects } from './effects'
import { AimOverlay } from './aimOverlay'
import { launchVelocity } from '../core/projectile'

export interface ViewLayers {
  world: Container
  entities: Container
  roaches: Container
  fx: Container
  overlay: Container
}

export interface AimState {
  angle: number
  power: number
}

const USER_PAN_HOLD = 2.5

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
  effects: Effects | null = null
  aim: AimState | null = null
  /** Extra listeners (UI) for drained events. */
  eventHandlers: ((e: GameEvent) => void)[] = []
  frameHandlers: ((dt: number, t: number) => void)[] = []
  private time = 0
  private userPanAt = -Infinity
  private parallax: { c: Container; f: number }[] = []
  private propsView: PropsView | null = null
  private hazard: ReturnType<typeof buildHazard> | null = null
  private sky: ReturnType<typeof buildSky> | null = null
  private roachViews = new Map<number, RoachView>()
  private entityViews: EntityViews | null = null
  private aimOverlay: AimOverlay | null = null
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
    this.app.canvas.style.display = 'block'
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
    L.world.filterArea = this.app.screen
    this.app.stage.addChild(L.world)

    this.effects = new Effects(L.world, L.fx, this.camera, theme)
    this.entityViews = new EntityViews(L.entities, this.effects)
    this.aimOverlay = new AimOverlay(L.overlay)
    for (const r of this.game.world.roaches) {
      const v = new RoachView(r.kind, TEAM_COLORS[r.team], r.name)
      this.roachViews.set(r.id, v)
      L.roaches.addChild(v.container)
    }

    this.onResize()
    this.resizeObs = new ResizeObserver(() => this.onResize())
    this.resizeObs.observe(parent)
    const r = this.game.activeRoach()
    if (r) {
      this.camera.x = r.pos.x
      this.camera.y = r.pos.y
    }
    this.camera.setZoom(0.8)
    this.app.ticker.add((ticker) => this.frame(ticker.deltaMS / 1000))
  }

  /** User panned/zoomed: stop auto-following the roach for a moment. */
  notifyUserCamera(): void {
    this.userPanAt = this.time
  }

  roachScreen(): { pos: Vec2; radiusPx: number } | null {
    const r = this.game.activeRoach()
    if (!r?.alive) return null
    return { pos: this.camera.worldToScreen(r.pos), radiusPx: r.archetype.radius * this.camera.zoom }
  }

  private onResize(): void {
    const { width, height } = this.app.screen
    this.camera.setViewport(width, height)
    this.camera.setZoom(this.camera.zoom)
    this.sky?.resize(width, height)
  }

  private handleEvent(e: GameEvent): void {
    const fx = this.effects
    switch (e.type) {
      case 'carve':
        this.terrain?.carve(e.pos, e.radius)
        break
      case 'explosion':
        fx?.explosion(e.pos, e.radius)
        sfx.boom(e.radius)
        vibrate(40)
        break
      case 'damage':
        fx?.damageNumber(e.pos, e.amount, false)
        sfx.squeak()
        break
      case 'heal':
        fx?.damageNumber(e.pos, e.amount, true)
        break
      case 'death': {
        const r = this.game.world.roaches.find((x) => x.id === e.roachId)
        fx?.poof(e.pos, r ? TEAM_COLORS[r.team] : 0xffffff)
        sfx.splat()
        break
      }
      case 'splash':
        fx?.splash(e.pos)
        sfx.splat()
        break
      case 'pickup':
        fx?.floatText(e.pos, e.label, TEAM_COLORS[e.team])
        fx?.sparkle(e.pos, 0xfff27f)
        sfx.pickup()
        break
      case 'launch':
        sfx.whoosh()
        break
      case 'jump':
        sfx.jump()
        break
      case 'land':
        fx?.dust(e.pos)
        break
      case 'bounce':
        sfx.pop()
        break
      case 'melee':
        sfx.pop()
        if (e.hit) {
          fx?.dust(e.pos)
          this.camera.shake(4)
        }
        break
      case 'special': {
        const r = this.game.world.roaches.find((x) => x.id === e.roachId)
        fx?.sparkle(e.pos, r ? TEAM_COLORS[r.team] : 0xffffff)
        sfx.pickup()
        break
      }
      case 'tick':
        sfx.tick()
        break
      case 'turnStart':
        vibrate(20)
        this.userPanAt = -Infinity
        break
      case 'gameOver':
        sfx.victory()
        break
    }
    for (const h of this.eventHandlers) h(e)
  }

  private followTarget(): Vec2 | null {
    const p = this.game.world.projectiles[0]
    if (p) return p.pos
    if (this.time - this.userPanAt < USER_PAN_HOLD) return null
    const r = this.game.activeRoach()
    if (r?.alive && this.game.phase !== 'handoff') return { x: r.pos.x, y: r.pos.y - 40 }
    return null
  }

  private frame(dt: number): void {
    try {
      this.time += dt
      this.game.update(dt)
      for (const e of this.game.drainEvents()) this.handleEvent(e)
      const active = this.game.activeRoach()
      for (const r of this.game.world.roaches) this.roachViews.get(r.id)?.sync(r, this.time, r === active && this.game.phase !== 'gameOver', this.aim !== null && r === active)
      this.entityViews?.sync(this.game, this.time, dt)
      this.updateAim()
      this.effects?.update(dt)
      this.propsView?.update(this.time, this.game.world.candles)
      this.hazard?.update(this.time, this.game.world.hazardY)
      for (const h of this.frameHandlers) h(dt, this.time)
      const target = this.followTarget()
      if (target) this.camera.follow(target, dt, this.game.world.projectiles.length > 0 ? 5 : 3)
      this.applyCamera(this.camera.update(dt))
    } catch (err) {
      logger.error('frame failed', err)
    }
  }

  private updateAim(): void {
    const r = this.game.activeRoach()
    if (!this.aim || !r?.alive || this.game.phase !== 'turn') {
      this.aimOverlay?.hide()
      return
    }
    const { angle, power } = this.aim
    if (Math.abs(Math.cos(angle)) > 0.05) r.facing = Math.cos(angle) > 0 ? 1 : -1
    const off = r.archetype.radius + 8
    const start = { x: r.pos.x + Math.cos(angle) * off, y: r.pos.y + Math.sin(angle) * off }
    this.aimOverlay?.show(start, launchVelocity(angle, power), angle, power, this.game, this.game.snapshot().previewFrac)
  }

  private applyCamera(shake: Vec2): void {
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
    for (const v of this.roachViews.values()) v.destroy()
    this.terrain?.destroy()
    if (this.mounted) this.app.destroy(true, { children: true })
  }
}
