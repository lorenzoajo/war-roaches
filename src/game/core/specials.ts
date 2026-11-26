import { SPECIAL_COOLDOWN } from './constants'
import { damageRoach } from './explosion'
import type { Roach } from './roach'
import type { World } from './world'

export interface TurnFlags {
  fullPreview: boolean
}

const FLICK_RANGE = 45

export function canUseSpecial(r: Roach): boolean {
  return r.alive && r.specialCooldown === 0
}

/** Returns true when the special was used (and the cooldown started). */
export function useSpecial(r: Roach, w: World, turn: TurnFlags): boolean {
  if (!canUseSpecial(r)) return false
  switch (r.kind) {
    case 'chonk':
      r.vel.y = -250
      r.slamming = true
      r.grounded = false
      break
    case 'stilts':
      turn.fullPreview = true
      break
    case 'brawler': {
      let target: Roach | null = null
      let best = Infinity
      for (const o of w.roaches) {
        if (!o.alive || o.team === r.team) continue
        const gap = Math.hypot(o.pos.x - r.pos.x, o.pos.y - r.pos.y) - o.archetype.radius - r.archetype.radius
        if (gap <= FLICK_RANGE && gap < best) [target, best] = [o, gap]
      }
      if (!target) return false
      const dir = target.pos.x >= r.pos.x ? 1 : -1
      target.vel.x += (dir * 520) / target.archetype.mass
      target.vel.y += -380 / target.archetype.mass
      target.grounded = false
      damageRoach(w, target, 20)
      break
    }
    case 'zippy':
      r.dashTimer = 0.25
      r.invulnTimer = 0.4
      r.grounded = false
      break
  }
  r.specialCooldown = SPECIAL_COOLDOWN
  w.events.push({ type: 'special', roachId: r.id, pos: { ...r.pos } })
  return true
}

/** Chonk's Belly Slam impact; called when a slamming roach lands. */
export function finishSlam(r: Roach, w: World): void {
  r.slamming = false
  w.explode({ pos: { x: r.pos.x, y: r.pos.y + r.archetype.radius * 0.5 }, radius: 60, damage: 25, ownerTeam: r.team, excludeId: r.id })
}

export function tickCooldowns(team: Roach[]): void {
  for (const r of team) r.specialCooldown = Math.max(0, r.specialCooldown - 1)
}
