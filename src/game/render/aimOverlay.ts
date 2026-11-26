import { Container, Graphics } from 'pixi.js'
import type { Game } from '../core/game'
import { predictTrajectory } from '../core/projectile'
import type { Vec2 } from '../core/types'
import { WEAPONS } from '../core/weapons'

/** Trajectory dots (first `frac` of the arc) plus a power arc around the roach. */
export class AimOverlay {
  private readonly g = new Graphics()

  constructor(layer: Container) {
    layer.addChild(this.g)
  }

  show(start: Vec2, vel: Vec2, angle: number, power: number, game: Game, frac: number): void {
    const g = this.g
    g.clear()
    const def = WEAPONS[game.weapon]
    const r = game.activeRoach()
    const rad = r?.archetype.radius ?? 10
    // Power arc
    const ringR = rad + 26
    g.arc(start.x, start.y, ringR, angle - 0.35, angle + 0.35).stroke({ width: 7, color: 0x2a1a2e, alpha: 0.35 })
    g.arc(start.x, start.y, ringR, angle - 0.35, angle - 0.35 + 0.7 * power).stroke({ width: 5, color: power > 0.8 ? 0xff5a3c : power > 0.5 ? 0xffc23f : 0x7dff9a })
    const tip = { x: start.x + Math.cos(angle) * (ringR + 10), y: start.y + Math.sin(angle) * (ringR + 10) }
    g.circle(tip.x, tip.y, 4).fill(0xffffff)
    if (def.kind !== 'projectile') return
    const wind = def.windAffected ? game.world.wind : 0
    const pts = predictTrajectory(start, vel, wind, game.world.gravity, game.world.mask, 4)
    const n = Math.max(2, Math.floor(pts.length * frac))
    for (let i = 2; i < n; i += 2) {
      const p = pts[i]!
      const k = 1 - i / n
      g.circle(p.x, p.y, 2 + 2.5 * k).fill({ color: 0xffffff, alpha: 0.35 + 0.6 * k })
    }
  }

  hide(): void {
    this.g.clear()
  }
}
