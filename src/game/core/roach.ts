import { ARCHETYPES, type Archetype } from './archetypes'
import { GLIDE_FALL_SPEED } from './constants'
import type { TerrainMask } from './terrain'
import { Material, type RoachKind, type TeamId, type Vec2 } from './types'

export interface Roach {
  id: number
  team: TeamId
  kind: RoachKind
  archetype: Archetype
  name: string
  pos: Vec2
  vel: Vec2
  hp: number
  maxHp: number
  alive: boolean
  facing: 1 | -1
  grounded: boolean
  gliding: boolean
  airJumpsLeft: number
  specialCooldown: number
  invulnTimer: number
  dashTimer: number
  slamming: boolean
}

export interface MoveInput {
  dir: -1 | 0 | 1
  jumpPressed: boolean
  jumpHeld: boolean
}

export interface StepResult {
  jumped: boolean
  landed: boolean
  landSpeed: number
}

const STEP_UP = 6
const SNAP_DOWN = 6
const BOUNCE_MIN = 80
const BOUNCE_RESTITUTION = 0.7
const SLIPPERY_DECAY = 0.98
const GLIDE_SPEED_X = 60
const DASH_SPEED = 520

export function createRoach(id: number, team: TeamId, kind: RoachKind, pos: Vec2, name = ARCHETYPES[kind].label): Roach {
  const a = ARCHETYPES[kind]
  return {
    id, team, kind, archetype: a, name,
    pos: { ...pos }, vel: { x: 0, y: 0 },
    hp: a.hp, maxHp: a.hp, alive: true, facing: 1,
    grounded: false, gliding: false, airJumpsLeft: a.airJumps,
    specialCooldown: 0, invulnTimer: 0, dashTimer: 0, slamming: false,
  }
}

const blocked = (m: TerrainMask, x: number, y: number, r: number): boolean => m.overlapsCircle(x, y, r)
const supported = (m: TerrainMask, x: number, y: number, r: number): boolean => m.overlapsCircle(x, y + 1.5, r)

/** Horizontal ground move with step-up/snap-down. Returns false if a wall stopped it. */
function walkTo(r: Roach, m: TerrainMask, dx: number): boolean {
  const rad = r.archetype.radius
  const nx = r.pos.x + dx
  let ny = r.pos.y
  if (blocked(m, nx, ny, rad)) {
    let k = 1
    while (k <= STEP_UP && blocked(m, nx, ny - k, rad)) k++
    if (k > STEP_UP) return false
    ny -= k
  } else {
    let k = 0
    while (k < SNAP_DOWN && !supported(m, nx, ny + k, rad)) k++
    if (supported(m, nx, ny + k, rad)) ny += k
  }
  r.pos.x = nx
  r.pos.y = ny
  return true
}

export function stepRoach(r: Roach, input: MoveInput, m: TerrainMask, env: { gravity: number }, dt: number): StepResult {
  const res: StepResult = { jumped: false, landed: false, landSpeed: 0 }
  if (!r.alive) return res
  const a = r.archetype
  r.invulnTimer = Math.max(0, r.invulnTimer - dt)
  r.dashTimer = Math.max(0, r.dashTimer - dt)

  if (r.grounded && (r.vel.y < -1 || r.dashTimer > 0 || r.slamming)) r.grounded = false
  if (r.grounded && !supported(m, r.pos.x, r.pos.y, a.radius)) r.grounded = false

  if (r.grounded) {
    const mat = m.materialUnder(r.pos.x, r.pos.y, a.radius)
    r.gliding = false
    r.airJumpsLeft = a.airJumps
    if (input.dir !== 0) {
      r.facing = input.dir
      const speed = a.walkSpeed * (mat === Material.Sticky ? 0.8 : 1)
      r.vel.x = input.dir * speed
    } else if (mat === Material.Slippery) {
      r.vel.x *= SLIPPERY_DECAY
      const n = m.normalAt(r.pos.x, r.pos.y + a.radius)
      if (Math.abs(n.x) > 0.5) r.vel.x += n.x * env.gravity * dt
    } else {
      r.vel.x = 0
    }
    r.vel.y = 0
    if (Math.abs(r.vel.x) > 0.01 && !walkTo(r, m, r.vel.x * dt)) r.vel.x = 0
    if (!supported(m, r.pos.x, r.pos.y, a.radius)) r.grounded = false

    if (input.jumpPressed && r.grounded) {
      r.vel.y = -a.jumpVel * (mat === Material.Bouncy ? 1.4 : 1)
      r.vel.x = input.dir * a.walkSpeed
      r.grounded = false
      res.jumped = true
    }
    if (r.grounded) return res
  } else if (input.jumpPressed && r.airJumpsLeft > 0 && !r.slamming) {
    r.airJumpsLeft--
    r.vel.y = -a.jumpVel * 0.85
    if (input.dir !== 0) r.vel.x = input.dir * a.walkSpeed
    res.jumped = true
  }

  // Airborne
  if (r.dashTimer > 0) {
    r.vel.x = r.facing * DASH_SPEED
    r.vel.y = 0
  } else {
    r.vel.y += env.gravity * dt
    r.gliding = input.jumpHeld && r.vel.y > 0 && !r.slamming
    if (r.gliding) {
      r.vel.y = Math.min(r.vel.y, GLIDE_FALL_SPEED)
      if (input.dir !== 0) r.facing = input.dir
      r.vel.x += (input.dir * GLIDE_SPEED_X - r.vel.x) * Math.min(1, dt * 4)
    }
  }
  integrate(r, m, dt, res)
  return res
}

function integrate(r: Roach, m: TerrainMask, dt: number, res: StepResult): void {
  const rad = r.archetype.radius
  const travel = Math.max(Math.abs(r.vel.x), Math.abs(r.vel.y)) * dt
  const steps = Math.max(1, Math.ceil(travel / (rad / 2)))
  const sdt = dt / steps
  for (let s = 0; s < steps; s++) {
    const px = r.pos.x, py = r.pos.y
    r.pos.x += r.vel.x * sdt
    r.pos.y += r.vel.y * sdt
    if (!blocked(m, r.pos.x, r.pos.y, rad)) continue
    const n = m.normalAt(r.pos.x, r.pos.y, rad + 3)
    let it = 0
    while (it < 12 && blocked(m, r.pos.x, r.pos.y, rad)) {
      r.pos.x += n.x
      r.pos.y += n.y
      it++
    }
    if (blocked(m, r.pos.x, r.pos.y, rad)) {
      r.pos.x = px
      r.pos.y = py
    }
    const vn = r.vel.x * n.x + r.vel.y * n.y
    if (vn >= 0) continue
    const mat = m.materialUnder(r.pos.x, r.pos.y, rad)
    const isFloor = n.y < -0.6
    if (mat === Material.Bouncy && -vn > BOUNCE_MIN) {
      r.vel.x -= (1 + BOUNCE_RESTITUTION) * vn * n.x
      r.vel.y -= (1 + BOUNCE_RESTITUTION) * vn * n.y
      continue
    }
    r.vel.x -= vn * n.x
    r.vel.y -= vn * n.y
    if (isFloor && r.dashTimer <= 0) {
      res.landed = true
      res.landSpeed = -vn
      r.grounded = true
      r.gliding = false
      r.vel.y = 0
      if (mat !== Material.Slippery) r.vel.x = 0
      return
    }
  }
}
