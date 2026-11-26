import {
  CRATE_CHANCE, GRAVITY, HAZARD_Y, MAX_FRAME_DT, RETREAT_TIME, ROACHES_PER_TEAM, SETTLE_CAP,
  SPAWN_MIN_SPACING, SUDDEN_DEATH_AT, SUDDEN_DEATH_RISE, TICK, WORLD_H, WORLD_W,
} from './constants'
import { rollCrateContent, spawnCrate, stepCrates, type TeamAmmo } from './crates'
import type { GameEvent } from './events'
import { applyCloudsEndOfTurn, applyHazard, igniteCandles, stepBubbles, stepFires, stepMines } from './hazards'
import { launchVelocity, makeProjectile, stepProjectile } from './projectile'
import { Rng } from './rng'
import { createRoach, stepRoach, type MoveInput, type Roach } from './roach'
import { fireRope, stepRope, type RopeState } from './rope'
import { findSpawnPoints, surfaceSpots } from './spawn'
import { canUseSpecial, finishSlam, tickCooldowns, useSpecial, type TurnFlags } from './specials'
import { TerrainMask } from './terrain'
import { ROACH_KINDS, TEAM_COLORS, TEAM_IDS, TEAM_NAMES, type MatchConfig, type RoachKind, type TeamId, type WeaponId } from './types'
import { dist } from './vec'
import { WEAPONS, applyMelee } from './weapons'
import { World } from './world'
import { MAPS, type MapDef, type MapProp } from '../maps/mapDef'

export type Phase = 'handoff' | 'turn' | 'retreat' | 'settling' | 'gameOver'

export type Command =
  | { type: 'beginTurn' }
  | { type: 'move'; dir: -1 | 0 | 1 }
  | { type: 'jump'; pressed: boolean }
  | { type: 'selectWeapon'; weapon: WeaponId }
  | { type: 'setFuse'; fuse: number }
  | { type: 'fire'; angle: number; power: number; fuse?: number }
  | { type: 'target'; x: number; y: number }
  | { type: 'special' }
  | { type: 'releaseRope' }

export interface TeamSnapshot {
  id: TeamId
  name: string
  color: number
  hp: number
  maxHp: number
  alive: number
}

export interface HudSnapshot {
  phase: Phase
  team: TeamId
  activeRoachId: number
  activeKind: RoachKind
  activeName: string
  timeLeft: number
  wind: number
  weapon: WeaponId
  fuse: number
  ammo: Partial<Record<WeaponId, number>>
  specialReady: boolean
  specialCooldown: number
  teams: TeamSnapshot[]
  winner: TeamId | null | undefined
  suddenDeath: boolean
  previewFrac: number
  roping: boolean
}

const ROACH_NAMES: Record<RoachKind, readonly string[]> = {
  chonk: ['Big Lou', 'Meatball', 'Tubs', 'Dumpling'],
  stilts: ['Longfellow', 'Twiggy', 'Skyscraper', 'Noodle'],
  brawler: ['Knuckles', 'Rocky', 'Biceps', 'Punchy'],
  zippy: ['Zoom', 'Pip', 'Turbo', 'Flicker'],
}
const SETTLE_MIN = 0.6
const SETTLE_SPEED = 5
const ROPE_RELEASE_HOP = -180

export class Game {
  readonly map: MapDef
  readonly world: World
  readonly props: MapProp[]
  readonly teamOrder: TeamId[]
  readonly ammo: TeamAmmo = { 0: {}, 1: {}, 2: {}, 3: {} }
  phase: Phase = 'handoff'
  paused = false
  team: TeamId
  activeId = 0
  elapsed = 0
  timeLeft: number
  weapon: WeaponId = 'bazooka'
  fuse = 3
  windNorm = 0
  rope: RopeState | null = null
  winner: TeamId | null | undefined = undefined
  suddenDeath = false
  private readonly rng: Rng
  private readonly cursor: Record<TeamId, number> = { 0: 0, 1: 0, 2: 0, 3: 0 }
  private input: MoveInput = { dir: 0, jumpPressed: false, jumpHeld: false }
  private turnFlags: TurnFlags = { fullPreview: false }
  private specialUsed = false
  private settleTime = 0
  private acc = 0

  constructor(readonly config: MatchConfig) {
    this.map = MAPS[config.mapId]
    const mask = new TerrainMask(WORLD_W, WORLD_H)
    this.map.generate(mask, new Rng(config.seed))
    this.props = this.map.props(new Rng(config.seed))
    this.rng = new Rng(config.seed ^ 0x5bd1e995)
    this.world = new World(mask, new Rng(config.seed ^ 0x9e3779b9), GRAVITY * this.map.physics.gravityMult)
    for (const p of this.props) if (p.kind === 'candle') this.world.candles.push({ pos: { x: p.x, y: p.y }, lit: true })
    if (this.world.candles.length > 0) this.world.explodeHooks.push(igniteCandles)
    this.teamOrder = TEAM_IDS.slice(0, config.players)
    this.spawnTeams()
    this.placeStartCrates()
    this.team = this.rng.pick(this.teamOrder)
    this.timeLeft = config.turnTime
    this.prepareTurn()
  }

  private spawnTeams(): void {
    const count = this.teamOrder.length * ROACHES_PER_TEAM
    const spots = this.rng.shuffle(findSpawnPoints(this.world.mask, this.rng, count, SPAWN_MIN_SPACING, HAZARD_Y))
    let i = 0
    for (const team of this.teamOrder) {
      for (const kind of ROACH_KINDS) {
        const spot = spots[i++]!
        const r = createRoach(this.world.nextId(), team, kind, { x: spot.x, y: 0 }, ROACH_NAMES[kind][team]!)
        r.pos.y = spot.y - r.archetype.radius - 1
        r.facing = spot.x < WORLD_W / 2 ? 1 : -1
        this.world.roaches.push(r)
      }
    }
  }

  private placeStartCrates(): void {
    const n = this.rng.int(3, 5)
    const spots = this.rng.shuffle(surfaceSpots(this.world.mask, HAZARD_Y, 40))
    for (const s of spots) {
      if (this.world.crates.length >= n) break
      if (this.world.roaches.some((r) => dist(r.pos, s) < 80) || this.world.crates.some((c) => dist(c.pos, s) < 150)) continue
      this.world.crates.push({ id: this.world.nextId(), pos: { x: s.x, y: s.y - 13 }, vel: { x: 0, y: 0 }, landed: true, collected: false, content: rollCrateContent(this.rng) })
    }
  }

  private teamRoaches(team: TeamId): Roach[] {
    return this.world.roaches.filter((r) => r.team === team)
  }

  private prepareTurn(): void {
    const roaches = this.teamRoaches(this.team)
    for (let k = 0; k < roaches.length; k++) {
      const idx = (this.cursor[this.team] + k) % roaches.length
      const r = roaches[idx]!
      if (r.alive) {
        this.activeId = r.id
        this.cursor[this.team] = idx + 1
        break
      }
    }
    this.windNorm = this.rng.range(-1, 1)
    this.world.wind = this.windNorm * this.map.physics.windMax
    this.timeLeft = this.config.turnTime
    if (this.ammoOf(this.weapon) <= 0) this.weapon = 'bazooka'
  }

  activeRoach(): Roach | null {
    return this.world.roaches.find((r) => r.id === this.activeId) ?? null
  }

  ammoOf(weapon: WeaponId, team: TeamId = this.team): number {
    const start = WEAPONS[weapon].startAmmo
    return start === Infinity ? Infinity : (this.ammo[team][weapon] ?? 0)
  }

  private consume(weapon: WeaponId): void {
    if (WEAPONS[weapon].startAmmo === Infinity) return
    this.ammo[this.team][weapon] = Math.max(0, (this.ammo[this.team][weapon] ?? 0) - 1)
  }

  command(c: Command): void {
    if (c.type === 'beginTurn') {
      if (this.phase === 'handoff') this.startTurn()
      return
    }
    const r = this.activeRoach()
    const acting = (this.phase === 'turn' || this.phase === 'retreat') && r?.alive === true
    switch (c.type) {
      case 'move':
        this.input.dir = c.dir
        return
      case 'jump':
        if (c.pressed && acting) this.input.jumpPressed = true
        this.input.jumpHeld = c.pressed
        return
      case 'releaseRope':
        this.releaseRope()
        return
      case 'setFuse':
        this.fuse = Math.min(5, Math.max(1, Math.round(c.fuse)))
        return
    }
    if (this.phase !== 'turn' || !r?.alive) return
    switch (c.type) {
      case 'selectWeapon':
        if (this.ammoOf(c.weapon) > 0) this.weapon = c.weapon
        return
      case 'special':
        if (!this.specialUsed && canUseSpecial(r) && useSpecial(r, this.world, this.turnFlags)) this.specialUsed = true
        return
      case 'fire':
        this.fire(r, c.angle, c.power, c.fuse)
        return
      case 'target':
        if (this.weapon !== 'shoe' || this.ammoOf('shoe') <= 0) return
        this.consume('shoe')
        this.world.projectiles.push(makeProjectile(this.world, 'shoe', { x: c.x, y: -60 }, { x: 0, y: 300 }, r.id, r.team))
        this.world.events.push({ type: 'launch', weapon: 'shoe', pos: { x: c.x, y: 0 } })
        this.enterRetreat()
        return
    }
  }

  private fire(r: Roach, angle: number, power: number, fuse?: number): void {
    const def = WEAPONS[this.weapon]
    if (this.ammoOf(this.weapon) <= 0 || def.kind === 'targeted') return
    const dx = Math.cos(angle)
    if (Math.abs(dx) > 0.05) r.facing = dx > 0 ? 1 : -1
    switch (def.kind) {
      case 'projectile': {
        const off = r.archetype.radius + 8
        const pos = { x: r.pos.x + Math.cos(angle) * off, y: r.pos.y + Math.sin(angle) * off }
        const f = def.usesFuse ? (fuse ?? this.fuse) : undefined
        this.world.projectiles.push(makeProjectile(this.world, this.weapon, pos, launchVelocity(angle, power), r.id, r.team, f))
        this.world.events.push({ type: 'launch', weapon: this.weapon, pos })
        break
      }
      case 'melee':
        applyMelee(this.world, r)
        break
      case 'placed':
        this.world.addMine({ x: r.pos.x, y: r.pos.y + r.archetype.radius - 2 }, r.team)
        this.world.events.push({ type: 'launch', weapon: this.weapon, pos: { ...r.pos } })
        break
      case 'utility': {
        const rope = fireRope(r.pos, angle, this.world.mask)
        if (!rope) return
        this.rope = rope
        r.grounded = false
        break
      }
    }
    this.consume(this.weapon)
    if (def.endsTurn) this.enterRetreat()
  }

  private releaseRope(): void {
    const r = this.activeRoach()
    if (!this.rope || !r) return
    this.rope = null
    r.vel.y = Math.min(r.vel.y, ROPE_RELEASE_HOP)
  }

  private startTurn(): void {
    if (!this.activeRoach()?.alive) this.prepareTurn()
    this.phase = 'turn'
    this.timeLeft = this.config.turnTime
    this.turnFlags = { fullPreview: false }
    this.specialUsed = false
    this.settleTime = 0
    this.input = { dir: 0, jumpPressed: false, jumpHeld: false }
    tickCooldowns(this.teamRoaches(this.team))
    this.world.events.push({ type: 'turnStart', team: this.team })
  }

  private enterRetreat(): void {
    this.phase = 'retreat'
    this.timeLeft = RETREAT_TIME
  }

  private enterSettling(): void {
    this.phase = 'settling'
    this.settleTime = 0
    this.rope = null
    this.input = { dir: 0, jumpPressed: false, jumpHeld: false }
  }

  update(frameDt: number): void {
    if (this.paused) return
    this.acc += Math.min(Math.max(0, frameDt), MAX_FRAME_DT)
    while (this.acc >= TICK) {
      this.acc -= TICK
      this.tick()
    }
  }

  private tick(): void {
    const w = this.world
    const active = this.activeRoach()
    const controlling = this.phase === 'turn' || this.phase === 'retreat'
    const idle: MoveInput = { dir: 0, jumpPressed: false, jumpHeld: false }

    for (const r of w.roaches) {
      if (!r.alive) continue
      const input = controlling && r === active ? this.input : idle
      if (r === active && this.rope) {
        if (input.jumpPressed) this.releaseRope()
        else {
          stepRope(r, this.rope, input, w, TICK)
          continue
        }
      }
      const res = stepRoach(r, input, w.mask, { gravity: w.gravity }, TICK)
      if (res.jumped) w.events.push({ type: 'jump', pos: { ...r.pos } })
      if (res.landed && res.landSpeed > 150) w.events.push({ type: 'land', pos: { ...r.pos } })
      if (res.landed && r.slamming) finishSlam(r, w)
    }
    this.input.jumpPressed = false

    for (const p of w.projectiles) stepProjectile(p, w, TICK)
    w.projectiles = w.projectiles.filter((p) => !p.dead)
    stepFires(w, TICK)
    stepMines(w, TICK)
    if (this.map.physics.bubbles) stepBubbles(w, TICK)
    stepCrates(w, this.ammo, TICK)
    for (const r of w.roaches) if (applyHazard(w, r) && r === active) this.rope = null

    if (this.phase === 'turn' || this.phase === 'retreat' || this.phase === 'settling') this.elapsed += TICK
    if (controlling) {
      const before = this.timeLeft
      this.timeLeft = Math.max(0, this.timeLeft - TICK)
      if (this.phase === 'turn' && Math.ceil(before) !== Math.ceil(this.timeLeft) && Math.ceil(this.timeLeft) <= 5 && this.timeLeft > 0)
        w.events.push({ type: 'tick' })
      if (this.timeLeft <= 0 || !active?.alive) this.enterSettling()
    } else if (this.phase === 'settling') {
      this.settleTime += TICK
      if ((this.settleTime >= SETTLE_MIN && this.isSettled()) || this.settleTime >= SETTLE_CAP) this.endTurn()
    }
  }

  private isSettled(): boolean {
    const w = this.world
    if (w.projectiles.length > 0 || w.fires.length > 0 || w.mines.some((m) => m.triggered >= 0)) return false
    return w.roaches.every((r) => !r.alive || r.grounded || Math.hypot(r.vel.x, r.vel.y) < SETTLE_SPEED)
  }

  private aliveTeams(): TeamId[] {
    return this.teamOrder.filter((t) => this.world.roaches.some((r) => r.team === t && r.alive))
  }

  private endTurn(): void {
    const w = this.world
    // A capped settle may leave stragglers; drop them so they can't haunt the next turn.
    w.projectiles = []
    w.mines = w.mines.filter((m) => m.triggered < 0)
    applyCloudsEndOfTurn(w)
    if (this.elapsed >= SUDDEN_DEATH_AT) {
      this.suddenDeath = true
      w.hazardY -= SUDDEN_DEATH_RISE
    }
    for (const r of w.roaches) applyHazard(w, r)
    const alive = this.aliveTeams()
    if (alive.length <= 1) {
      this.phase = 'gameOver'
      this.winner = alive[0] ?? null
      w.events.push({ type: 'gameOver', winner: this.winner })
      return
    }
    if (this.rng.next() < CRATE_CHANCE) spawnCrate(w)
    const idx = this.teamOrder.indexOf(this.team)
    for (let k = 1; k <= this.teamOrder.length; k++) {
      const t = this.teamOrder[(idx + k) % this.teamOrder.length]!
      if (alive.includes(t)) {
        this.team = t
        break
      }
    }
    this.phase = 'handoff'
    this.prepareTurn()
  }

  snapshot(): HudSnapshot {
    const r = this.activeRoach()
    const teams: TeamSnapshot[] = this.teamOrder.map((t) => {
      const rs = this.teamRoaches(t)
      return {
        id: t, name: TEAM_NAMES[t], color: TEAM_COLORS[t],
        hp: rs.reduce((s, x) => s + (x.alive ? x.hp : 0), 0),
        maxHp: rs.reduce((s, x) => s + x.maxHp, 0),
        alive: rs.filter((x) => x.alive).length,
      }
    })
    const ammo: Partial<Record<WeaponId, number>> = {}
    for (const id of Object.keys(WEAPONS) as WeaponId[]) ammo[id] = this.ammoOf(id)
    return {
      phase: this.phase,
      team: this.team,
      activeRoachId: this.activeId,
      activeKind: r?.kind ?? 'zippy',
      activeName: r?.name ?? '',
      timeLeft: this.timeLeft,
      wind: this.windNorm,
      weapon: this.weapon,
      fuse: this.fuse,
      ammo,
      specialReady: !!r && canUseSpecial(r) && !this.specialUsed,
      specialCooldown: r?.specialCooldown ?? 0,
      teams,
      winner: this.winner,
      suddenDeath: this.suddenDeath,
      previewFrac: this.turnFlags.fullPreview ? 1 : (r?.archetype.previewFrac ?? 0.4),
      roping: this.rope !== null,
    }
  }

  drainEvents(): GameEvent[] {
    const ev = this.world.events
    this.world.events = []
    return ev
  }
}
