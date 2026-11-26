import { SELF_DAMAGE_MULT } from './constants'
import type { Roach } from './roach'
import type { TeamId, Vec2 } from './types'
import type { World } from './world'

export interface ExplosionSpec {
  pos: Vec2
  radius: number
  damage: number
  ownerTeam: TeamId
  knock?: number
  carve?: boolean
  excludeId?: number
}

const KNOCK = 420
const KNOCK_UP = 120

export function damageRoach(world: World, r: Roach, amount: number): void {
  const dmg = Math.round(amount)
  if (dmg <= 0 || !r.alive) return
  r.hp = Math.max(0, r.hp - dmg)
  world.events.push({ type: 'damage', roachId: r.id, amount: dmg, pos: { ...r.pos } })
  if (r.hp === 0) {
    r.alive = false
    world.events.push({ type: 'death', roachId: r.id, pos: { ...r.pos } })
  }
}

export function applyExplosion(world: World, e: ExplosionSpec): void {
  const R = e.radius
  if (e.carve ?? true) {
    world.mask.carveCircle(e.pos.x, e.pos.y, R)
    world.events.push({ type: 'carve', pos: { ...e.pos }, radius: R })
  }
  world.events.push({ type: 'explosion', pos: { ...e.pos }, radius: R })
  const knock = e.knock ?? 1
  for (const r of world.roaches) {
    if (!r.alive || r.invulnTimer > 0 || r.id === e.excludeId) continue
    const dx = r.pos.x - e.pos.x, dy = r.pos.y - e.pos.y
    const d = Math.hypot(dx, dy)
    const edge = Math.max(0, d - r.archetype.radius)
    if (edge >= R) continue
    const f = 1 - edge / R
    const mult = r.team === e.ownerTeam ? SELF_DAMAGE_MULT : 1
    damageRoach(world, r, e.damage * (1 - 0.5 * (edge / R)) * mult)
    const nx = d === 0 ? 0 : dx / d, ny = d === 0 ? -1 : dy / d
    r.vel.x += (nx * KNOCK * knock * f) / r.archetype.mass
    r.vel.y += (ny * KNOCK * knock * f - KNOCK_UP * knock * f) / r.archetype.mass
    r.grounded = false
  }
}
