import { describe, expect, it } from 'vitest'
import { launchVelocity, makeProjectile, predictTrajectory } from '../../src/game/core/projectile'
import { WEAPONS } from '../../src/game/core/weapons'
import { GROUND, addRoach, flatWorld, runProjectiles } from './helpers'
import { GRAVITY } from '../../src/game/core/constants'

describe('projectiles', () => {
  it('launchVelocity at 45° power 1', () => {
    const v = launchVelocity(-Math.PI / 4, 1)
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(900)
    expect(v.x).toBeGreaterThan(0)
    expect(v.y).toBeLessThan(0)
  })

  it('bazooka drifts with wind, grenade does not', () => {
    const drift = (weapon: 'bazooka' | 'grenade'): number => {
      const w = flatWorld()
      w.wind = 60
      const p = makeProjectile(w, weapon, { x: 1000, y: 200 }, { x: 0, y: -300 }, 0, 0, 5)
      w.projectiles.push(p)
      runProjectiles(w, 0.5)
      return p.pos.x - 1000
    }
    expect(drift('bazooka')).toBeGreaterThan(3)
    expect(drift('grenade')).toBe(0)
  })

  it('bazooka explodes on ground contact and carves crater', () => {
    const w = flatWorld()
    w.projectiles.push(makeProjectile(w, 'bazooka', { x: 1000, y: GROUND - 100 }, { x: 0, y: 300 }, 0, 0))
    runProjectiles(w, 1)
    expect(w.projectiles.length).toBe(0)
    expect(w.mask.isSolid(1000, GROUND + 10)).toBe(false)
    expect(w.events.some((e) => e.type === 'explosion')).toBe(true)
  })

  it('grenade explodes after fuse, not before', () => {
    const w = flatWorld()
    w.projectiles.push(makeProjectile(w, 'grenade', { x: 1000, y: GROUND - 50 }, { x: 0, y: 0 }, 0, 0, 2))
    runProjectiles(w, 1.8)
    expect(w.events.some((e) => e.type === 'explosion')).toBe(false)
    runProjectiles(w, 0.4)
    expect(w.events.some((e) => e.type === 'explosion')).toBe(true)
  })

  it('disco spawns 5 minis', () => {
    const w = flatWorld()
    w.projectiles.push(makeProjectile(w, 'disco', { x: 1000, y: GROUND - 50 }, { x: 0, y: 0 }, 0, 0))
    runProjectiles(w, 3.05)
    expect(w.projectiles.filter((p) => p.mini).length).toBe(5)
  })

  it('duck walks then explodes after 6 s', () => {
    const w = flatWorld()
    const p = makeProjectile(w, 'duck', { x: 1000, y: GROUND - 30 }, { x: 100, y: 0 }, 0, 0)
    w.projectiles.push(p)
    runProjectiles(w, 2)
    expect(p.walking).toBe(true)
    expect(p.pos.x).toBeGreaterThan(1100)
    runProjectiles(w, 4.2)
    expect(w.events.some((e) => e.type === 'explosion')).toBe(true)
  })

  it('duck explodes on enemy contact', () => {
    const w = flatWorld()
    const target = addRoach(w, 'brawler', 1150, 1)
    w.projectiles.push(makeProjectile(w, 'duck', { x: 1000, y: GROUND - 30 }, { x: 100, y: 0 }, 0, 0))
    runProjectiles(w, 3)
    expect(target.hp).toBeLessThan(target.maxHp)
  })

  it('projectile into hazard splashes and is removed', () => {
    const w = flatWorld()
    w.mask.fillRect(0, 0, 2400, 1200, 0)
    w.projectiles.push(makeProjectile(w, 'bazooka', { x: 1000, y: 1000 }, { x: 0, y: 400 }, 0, 0))
    runProjectiles(w, 1)
    expect(w.projectiles.length).toBe(0)
    expect(w.events.some((e) => e.type === 'splash')).toBe(true)
  })

  it('projectile off world is removed', () => {
    const w = flatWorld()
    w.projectiles.push(makeProjectile(w, 'bazooka', { x: 2350, y: 100 }, { x: 900, y: -100 }, 0, 0))
    runProjectiles(w, 1)
    expect(w.projectiles.length).toBe(0)
  })

  it('predictTrajectory stops at terrain', () => {
    const w = flatWorld()
    const pts = predictTrajectory({ x: 1000, y: GROUND - 200 }, { x: 0, y: 0 }, 0, GRAVITY, w.mask, 5)
    expect(pts.length).toBeGreaterThan(3)
    expect(pts.at(-1)!.y).toBeLessThanOrEqual(GROUND + 1)
    expect(pts.at(-1)!.y).toBeGreaterThan(GROUND - 20)
  })

  it('weapon table matches spec', () => {
    expect(WEAPONS.bazooka.damage).toBe(40)
    expect(WEAPONS.shoe.radius).toBe(85)
    expect(WEAPONS.rope.endsTurn).toBe(false)
    expect(WEAPONS.slipper.startAmmo).toBe(Infinity)
    expect(WEAPONS.gum.crateAmmo).toBe(2)
  })
})
