import { CRATE_FALL_SPEED } from './constants'
import type { Crate, CrateContent } from './entities'
import type { Rng } from './rng'
import type { TeamId, WeaponId } from './types'
import { dist } from './vec'
import { PICKUP_WEAPONS, WEAPONS } from './weapons'
import type { World } from './world'

export type TeamAmmo = Record<TeamId, Partial<Record<WeaponId, number>>>

const CRATE_HALF = 12
const COLLECT_DIST = 14

export function rollCrateContent(rng: Rng): CrateContent {
  if (rng.next() < 0.25) return { kind: 'health', amount: 35 }
  const weapon = rng.pick(PICKUP_WEAPONS)
  return { kind: 'weapon', weapon, ammo: WEAPONS[weapon].crateAmmo }
}

export function pickCrateX(w: World, rng: Rng): number {
  const totals = new Map<TeamId, number>()
  for (const r of w.roaches) if (r.alive) totals.set(r.team, (totals.get(r.team) ?? 0) + r.hp)
  let loser: TeamId | null = null
  let low = Infinity
  for (const [t, hp] of totals) if (hp < low) [loser, low] = [t, hp]
  const roll = rng.next()
  if (loser !== null && roll < 0.6) {
    const r = rng.pick(w.roaches.filter((o) => o.alive && o.team === loser))
    return Math.min(2300, Math.max(100, r.pos.x + rng.range(-200, 200)))
  }
  return rng.range(100, 2300)
}

export function spawnCrate(w: World): Crate {
  const crate: Crate = { id: w.nextId(), pos: { x: pickCrateX(w, w.rng), y: -30 }, vel: { x: 0, y: CRATE_FALL_SPEED }, landed: false, collected: false, content: rollCrateContent(w.rng) }
  w.crates.push(crate)
  return crate
}

export function crateLabel(c: CrateContent): string {
  return c.kind === 'health' ? `+${c.amount} HP` : `${WEAPONS[c.weapon].emoji} ${WEAPONS[c.weapon].name} ×${c.ammo}`
}

export function stepCrates(w: World, ammo: TeamAmmo, dt: number): void {
  for (const c of w.crates) {
    c.landed = w.mask.isSolid(c.pos.x, c.pos.y + CRATE_HALF + 1)
    if (!c.landed) c.pos.y += CRATE_FALL_SPEED * dt
    for (const r of w.roaches) {
      if (!r.alive || c.collected || dist(r.pos, c.pos) >= r.archetype.radius + COLLECT_DIST) continue
      c.collected = true
      if (c.content.kind === 'health') {
        const healed = Math.min(c.content.amount, r.maxHp - r.hp)
        r.hp += healed
        w.events.push({ type: 'heal', roachId: r.id, amount: healed, pos: { ...r.pos } })
      } else {
        const pool = ammo[r.team]
        pool[c.content.weapon] = (pool[c.content.weapon] ?? 0) + c.content.ammo
      }
      w.events.push({ type: 'pickup', team: r.team, label: crateLabel(c.content), pos: { ...c.pos } })
    }
    if (c.pos.y > w.hazardY) {
      c.collected = true
      w.events.push({ type: 'splash', pos: { ...c.pos } })
    }
  }
  w.crates = w.crates.filter((c) => !c.collected)
}
