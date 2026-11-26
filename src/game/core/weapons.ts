import { damageRoach } from './explosion'
import type { Roach } from './roach'
import type { WeaponId } from './types'
import type { World } from './world'

export type WeaponKind = 'projectile' | 'melee' | 'targeted' | 'placed' | 'utility'

export interface WeaponDef {
  id: WeaponId
  name: string
  emoji: string
  kind: WeaponKind
  windAffected: boolean
  damage: number
  radius: number
  usesFuse: boolean
  endsTurn: boolean
  startAmmo: number
  crateAmmo: number
}

const w = (d: WeaponDef): WeaponDef => d

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  bazooka: w({ id: 'bazooka', name: 'Spitball Bazooka', emoji: '🚀', kind: 'projectile', windAffected: true, damage: 40, radius: 55, usesFuse: false, endsTurn: true, startAmmo: Infinity, crateAmmo: 0 }),
  grenade: w({ id: 'grenade', name: 'Crumb Grenade', emoji: '💣', kind: 'projectile', windAffected: false, damage: 40, radius: 55, usesFuse: true, endsTurn: true, startAmmo: Infinity, crateAmmo: 0 }),
  slipper: w({ id: 'slipper', name: 'Slipper Smack', emoji: '🩴', kind: 'melee', windAffected: false, damage: 20, radius: 30, usesFuse: false, endsTurn: true, startAmmo: Infinity, crateAmmo: 0 }),
  spray: w({ id: 'spray', name: 'Bug Spray Cloud', emoji: '🧴', kind: 'projectile', windAffected: true, damage: 10, radius: 70, usesFuse: false, endsTurn: true, startAmmo: 0, crateAmmo: 1 }),
  shoe: w({ id: 'shoe', name: 'Big Shoe Stomp', emoji: '👟', kind: 'targeted', windAffected: false, damage: 50, radius: 85, usesFuse: false, endsTurn: true, startAmmo: 0, crateAmmo: 1 }),
  disco: w({ id: 'disco', name: 'Disco Bomb', emoji: '🪩', kind: 'projectile', windAffected: false, damage: 30, radius: 50, usesFuse: false, endsTurn: true, startAmmo: 0, crateAmmo: 1 }),
  gum: w({ id: 'gum', name: 'Gum Mine', emoji: '🍬', kind: 'placed', windAffected: false, damage: 35, radius: 50, usesFuse: false, endsTurn: true, startAmmo: 0, crateAmmo: 2 }),
  hotsauce: w({ id: 'hotsauce', name: 'Hot Sauce Bottle', emoji: '🌶️', kind: 'projectile', windAffected: true, damage: 15, radius: 35, usesFuse: false, endsTurn: true, startAmmo: 0, crateAmmo: 1 }),
  duck: w({ id: 'duck', name: 'Rubber Duck Torpedo', emoji: '🦆', kind: 'projectile', windAffected: false, damage: 45, radius: 55, usesFuse: false, endsTurn: true, startAmmo: 0, crateAmmo: 1 }),
  rope: w({ id: 'rope', name: 'Toothpick Rope', emoji: '🪢', kind: 'utility', windAffected: false, damage: 0, radius: 0, usesFuse: false, endsTurn: false, startAmmo: 0, crateAmmo: 2 }),
}

export const WEAPON_ORDER: readonly WeaponId[] = ['bazooka', 'grenade', 'slipper', 'spray', 'shoe', 'disco', 'gum', 'hotsauce', 'duck', 'rope']
export const PICKUP_WEAPONS: readonly WeaponId[] = WEAPON_ORDER.filter((id) => WEAPONS[id].crateAmmo > 0)

const MELEE_REACH = 30

/** Slipper smack on the nearest enemy-or-friend in front. Returns true when something was hit. */
export function applyMelee(world: World, attacker: Roach): boolean {
  const a = attacker.archetype
  let best: Roach | null = null
  let bestD = Infinity
  for (const r of world.roaches) {
    if (r === attacker || !r.alive) continue
    const dx = r.pos.x - attacker.pos.x, dy = r.pos.y - attacker.pos.y
    const d = Math.hypot(dx, dy)
    if (d > a.radius + r.archetype.radius + MELEE_REACH || dx * attacker.facing < -5) continue
    if (d < bestD) [best, bestD] = [r, d]
  }
  const hitPos = { x: attacker.pos.x + attacker.facing * (a.radius + 12), y: attacker.pos.y }
  world.events.push({ type: 'melee', pos: hitPos, hit: best !== null })
  if (!best || best.invulnTimer > 0) return best !== null
  damageRoach(world, best, WEAPONS.slipper.damage * a.meleeMult * (best.team === attacker.team ? 0.5 : 1))
  best.vel.x += (attacker.facing * 300) / best.archetype.mass
  best.vel.y += -250 / best.archetype.mass
  best.grounded = false
  return true
}
