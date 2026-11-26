import type { Bubble, Candle, Cloud, Crate, Fire, Mine, Projectile } from './entities'
import type { GameEvent } from './events'
import { applyExplosion, type ExplosionSpec } from './explosion'
import { HAZARD_Y } from './constants'
import type { Rng } from './rng'
import type { Roach } from './roach'
import type { TerrainMask } from './terrain'
import type { TeamId, Vec2 } from './types'

export type ExplodeHook = (world: World, e: ExplosionSpec) => void

/** Mutable simulation state shared by every core system. */
export class World {
  roaches: Roach[] = []
  projectiles: Projectile[] = []
  clouds: Cloud[] = []
  fires: Fire[] = []
  mines: Mine[] = []
  crates: Crate[] = []
  bubbles: Bubble[] = []
  candles: Candle[] = []
  wind = 0
  bubbleClock = 0
  hazardY = HAZARD_Y
  events: GameEvent[] = []
  explodeHooks: ExplodeHook[] = []
  private idSeq = 1

  constructor(
    readonly mask: TerrainMask,
    readonly rng: Rng,
    public gravity: number,
  ) {}

  nextId(): number {
    return this.idSeq++
  }

  explode(e: ExplosionSpec): void {
    applyExplosion(this, e)
    for (const hook of this.explodeHooks) hook(this, e)
  }

  spawnProjectile(p: Omit<Projectile, 'id'>): Projectile {
    const proj = { ...p, id: this.nextId() }
    this.projectiles.push(proj)
    return proj
  }

  addCloud(pos: Vec2, team: TeamId): void {
    this.clouds.push({ id: this.nextId(), pos: { ...pos }, radius: 70, turnsLeft: 3, team })
  }

  addFire(pos: Vec2): void {
    this.fires.push({ id: this.nextId(), pos: { ...pos }, timeLeft: 4 })
  }

  addMine(pos: Vec2, team: TeamId): void {
    this.mines.push({ id: this.nextId(), pos: { ...pos }, team, armTimer: 1, triggered: -1 })
  }
}
