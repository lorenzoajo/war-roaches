import type { MoveInput, Roach } from './roach'
import type { TerrainMask } from './terrain'
import type { Vec2 } from './types'
import type { World } from './world'

export interface RopeState {
  anchor: Vec2
  length: number
}

const ROPE_REACH = 320
const PUMP = 300

export function fireRope(from: Vec2, angle: number, mask: TerrainMask): RopeState | null {
  const to = { x: from.x + Math.cos(angle) * ROPE_REACH, y: from.y + Math.sin(angle) * ROPE_REACH }
  const hit = mask.raycast(from, to)
  if (!hit) return null
  return { anchor: hit, length: Math.max(20, Math.hypot(hit.x - from.x, hit.y - from.y)) }
}

/** Pendulum swing; `dir` pumps the swing. Caller handles release. */
export function stepRope(r: Roach, rope: RopeState, input: MoveInput, w: World, dt: number): void {
  const px = r.pos.x, py = r.pos.y
  const dx = r.pos.x - rope.anchor.x, dy = r.pos.y - rope.anchor.y
  const d = Math.hypot(dx, dy) || 1
  const rx = dx / d, ry = dy / d
  r.vel.y += w.gravity * dt
  r.vel.x += input.dir * ry * PUMP * dt
  r.vel.y += -input.dir * rx * PUMP * dt
  if (input.dir !== 0) r.facing = input.dir
  r.pos.x += r.vel.x * dt
  r.pos.y += r.vel.y * dt
  const ndx = r.pos.x - rope.anchor.x, ndy = r.pos.y - rope.anchor.y
  const nd = Math.hypot(ndx, ndy)
  if (nd > rope.length) {
    const nx = ndx / nd, ny = ndy / nd
    r.pos.x = rope.anchor.x + nx * rope.length
    r.pos.y = rope.anchor.y + ny * rope.length
    const vr = r.vel.x * nx + r.vel.y * ny
    if (vr > 0) {
      r.vel.x -= vr * nx
      r.vel.y -= vr * ny
    }
  }
  if (w.mask.overlapsCircle(r.pos.x, r.pos.y, r.archetype.radius)) {
    r.pos.x = px
    r.pos.y = py
    r.vel.x *= -0.3
    r.vel.y *= -0.3
  }
  r.grounded = false
}
