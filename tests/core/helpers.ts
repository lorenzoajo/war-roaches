import { TerrainMask } from '../../src/game/core/terrain'
import { World } from '../../src/game/core/world'
import { Rng } from '../../src/game/core/rng'
import { createRoach, type Roach } from '../../src/game/core/roach'
import { Material, type RoachKind, type TeamId } from '../../src/game/core/types'
import { GRAVITY, TICK } from '../../src/game/core/constants'
import { stepProjectile } from '../../src/game/core/projectile'

export const GROUND = 800

export function flatWorld(mat: Material = Material.Normal): World {
  const m = new TerrainMask(2400, 1200)
  m.fillRect(0, GROUND, 2400, 300, mat)
  return new World(m, new Rng(1), GRAVITY)
}

export function addRoach(w: World, kind: RoachKind, x: number, team: TeamId = 0, y?: number): Roach {
  const r = createRoach(w.nextId(), team, kind, { x, y: y ?? GROUND - createRoach(0, 0, kind, { x: 0, y: 0 }).archetype.radius - 0.5 })
  r.grounded = true
  w.roaches.push(r)
  return r
}

export function runProjectiles(w: World, seconds: number): void {
  for (let t = 0; t < seconds; t += TICK) {
    for (const p of [...w.projectiles]) stepProjectile(p, w, TICK)
    w.projectiles = w.projectiles.filter((p) => !p.dead)
  }
}
