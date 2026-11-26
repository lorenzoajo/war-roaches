import { MAX_LAUNCH_SPEED, OFFWORLD_MAX_X, OFFWORLD_MAX_Y, OFFWORLD_MIN_X } from './constants'
import type { Projectile } from './entities'
import type { TerrainMask } from './terrain'
import type { TeamId, Vec2, WeaponId } from './types'
import { fromAngle } from './vec'
import { WEAPONS } from './weapons'
import type { World } from './world'

const PROJ_RADIUS = 4
const RESTITUTION = 0.45
const FRICTION = 0.8
const DUCK_SPEED = 80
const DUCK_CLIMB = 10
const OWNER_GRACE = 0.15
const MINI = { damage: 15, radius: 30, fuse: 1.5 }

const DEFAULT_FUSE: Partial<Record<WeaponId, number>> = { grenade: 3, disco: 3, duck: 6 }

export function launchVelocity(angle: number, power: number): Vec2 {
  return fromAngle(angle, Math.min(1, Math.max(0, power)) * MAX_LAUNCH_SPEED)
}

export function makeProjectile(world: World, weapon: WeaponId, pos: Vec2, vel: Vec2, ownerId: number, ownerTeam: TeamId, fuse?: number): Projectile {
  return {
    id: world.nextId(), weapon, pos: { ...pos }, vel: { ...vel }, age: 0,
    fuse: fuse ?? DEFAULT_FUSE[weapon] ?? Infinity,
    ownerId, ownerTeam, mini: false, walking: false, dead: false,
  }
}

const bounces = (p: Projectile): boolean => p.weapon === 'grenade' || p.weapon === 'disco'

function detonate(p: Projectile, w: World): void {
  p.dead = true
  if (p.mini) {
    w.explode({ pos: p.pos, radius: MINI.radius, damage: MINI.damage, ownerTeam: p.ownerTeam })
    return
  }
  const def = WEAPONS[p.weapon]
  switch (p.weapon) {
    case 'spray':
      w.addCloud(p.pos, p.ownerTeam)
      w.events.push({ type: 'splash', pos: { ...p.pos } })
      return
    case 'hotsauce':
      w.explode({ pos: p.pos, radius: def.radius, damage: def.damage, ownerTeam: p.ownerTeam })
      for (let i = 0; i < 5; i++) w.addFire({ x: p.pos.x + (i - 2) * 24, y: p.pos.y - 10 })
      return
    case 'disco':
      w.explode({ pos: p.pos, radius: def.radius, damage: def.damage, ownerTeam: p.ownerTeam })
      for (let i = 0; i < 5; i++) {
        const angle = w.rng.range((-150 * Math.PI) / 180, (-30 * Math.PI) / 180)
        const mini = w.spawnProjectile({ ...p, pos: { ...p.pos }, vel: fromAngle(angle, w.rng.range(250, 400)), age: 0, fuse: MINI.fuse, mini: true, dead: false })
        mini.age = OWNER_GRACE
      }
      return
    default:
      w.explode({ pos: p.pos, radius: def.radius, damage: def.damage, ownerTeam: p.ownerTeam })
  }
}

function hitsRoach(p: Projectile, w: World): boolean {
  for (const r of w.roaches) {
    if (!r.alive) continue
    if (r.id === p.ownerId && p.age < OWNER_GRACE) continue
    if (Math.hypot(r.pos.x - p.pos.x, r.pos.y - p.pos.y) < r.archetype.radius + PROJ_RADIUS) return true
  }
  return false
}

function stepDuck(p: Projectile, w: World, dt: number): void {
  const m = w.mask
  const dir = p.vel.x >= 0 ? 1 : -1
  const nx = p.pos.x + dir * DUCK_SPEED * dt
  let ny = p.pos.y
  if (m.isSolid(nx, ny)) {
    let k = 1
    while (k <= DUCK_CLIMB && m.isSolid(nx, ny - k)) k++
    if (k > DUCK_CLIMB) {
      p.vel.x = -p.vel.x || -dir
      return
    }
    ny -= k
  } else {
    let k = 0
    while (k < DUCK_CLIMB && !m.isSolid(nx, ny + k + 1)) k++
    if (k >= DUCK_CLIMB) {
      p.walking = false
      p.vel = { x: dir * DUCK_SPEED, y: 0 }
    } else ny += k
  }
  p.pos.x = nx
  p.pos.y = ny
  p.vel.x = dir * DUCK_SPEED
  if (hitsRoach(p, w)) detonate(p, w)
}

export function stepProjectile(p: Projectile, w: World, dt: number): void {
  if (p.dead) return
  p.age += dt
  if (p.age >= p.fuse) {
    detonate(p, w)
    return
  }
  if (p.walking) {
    stepDuck(p, w, dt)
  } else {
    p.vel.y += w.gravity * dt
    if (WEAPONS[p.weapon].windAffected && !p.mini) p.vel.x += w.wind * dt
    const steps = Math.max(1, Math.ceil((Math.hypot(p.vel.x, p.vel.y) * dt) / 3))
    const sdt = dt / steps
    for (let s = 0; s < steps && !p.dead; s++) {
      const px = p.pos.x, py = p.pos.y
      p.pos.x += p.vel.x * sdt
      p.pos.y += p.vel.y * sdt
      const hitTerrain = w.mask.isSolid(p.pos.x, p.pos.y)
      if (bounces(p) || p.mini) {
        if (hitTerrain) {
          const n = w.mask.normalAt(p.pos.x, p.pos.y, 5)
          p.pos.x = px
          p.pos.y = py
          const vn = p.vel.x * n.x + p.vel.y * n.y
          if (vn < 0) {
            const tx = p.vel.x - vn * n.x, ty = p.vel.y - vn * n.y
            p.vel.x = tx * FRICTION - vn * n.x * RESTITUTION
            p.vel.y = ty * FRICTION - vn * n.y * RESTITUTION
            if (-vn > 60) w.events.push({ type: 'bounce', pos: { ...p.pos } })
          }
        }
        continue
      }
      if (p.weapon === 'duck' && hitTerrain) {
        p.pos.x = px
        p.pos.y = py
        p.walking = true
        p.vel = { x: (p.vel.x >= 0 ? 1 : -1) * DUCK_SPEED, y: 0 }
        break
      }
      if (hitTerrain || hitsRoach(p, w)) detonate(p, w)
    }
  }
  if (p.dead) return
  if (p.pos.y > w.hazardY) {
    p.dead = true
    w.events.push({ type: 'splash', pos: { ...p.pos } })
  } else if (p.pos.x < OFFWORLD_MIN_X || p.pos.x > OFFWORLD_MAX_X || p.pos.y > OFFWORLD_MAX_Y) {
    p.dead = true
  }
}

/** Ballistic preview (no bounces), sampled every 1/30 s until terrain hit or maxTime. */
export function predictTrajectory(start: Vec2, vel: Vec2, windAccel: number, gravity: number, mask: TerrainMask, maxTime: number): Vec2[] {
  const pts: Vec2[] = [{ ...start }]
  const pos = { ...start }, v = { ...vel }
  const sample = 1 / 30, sub = 4, sdt = sample / sub
  for (let t = 0; t < maxTime; t += sample) {
    for (let i = 0; i < sub; i++) {
      v.x += windAccel * sdt
      v.y += gravity * sdt
      const prev = { ...pos }
      pos.x += v.x * sdt
      pos.y += v.y * sdt
      if (mask.isSolid(pos.x, pos.y)) {
        pts.push(mask.raycast(prev, pos) ?? { ...pos })
        return pts
      }
    }
    pts.push({ ...pos })
    if (pos.y > mask.height + 100 || pos.x < -400 || pos.x > mask.width + 400) break
  }
  return pts
}
