import { describe, expect, it } from 'vitest'
import { applyCloudsEndOfTurn, applyHazard, igniteCandles, stepBubbles, stepFires, stepMines } from '../../src/game/core/hazards'
import { GROUND, addRoach, flatWorld } from './helpers'
import { HAZARD_Y, TICK } from '../../src/game/core/constants'

const runFor = (seconds: number, fn: () => void): void => {
  for (let t = 0; t < seconds; t += TICK) fn()
}

describe('hazards', () => {
  it('hazard costs 30 and respawns above hazard', () => {
    const w = flatWorld()
    const r = addRoach(w, 'chonk', 1000, 0)
    r.pos.y = HAZARD_Y + 5
    expect(applyHazard(w, r)).toBe(true)
    expect(r.hp).toBe(120)
    expect(r.alive).toBe(true)
    expect(r.pos.y).toBeLessThan(HAZARD_Y - 40)
    expect(w.events.some((e) => e.type === 'splash')).toBe(true)
  })

  it('hazard at low HP kills', () => {
    const w = flatWorld()
    const r = addRoach(w, 'zippy', 1000, 0)
    r.hp = 20
    r.pos.y = HAZARD_Y + 5
    applyHazard(w, r)
    expect(r.alive).toBe(false)
    expect(w.events.some((e) => e.type === 'death')).toBe(true)
  })

  it('roach above hazard is untouched', () => {
    const w = flatWorld()
    const r = addRoach(w, 'zippy', 1000, 0)
    expect(applyHazard(w, r)).toBe(false)
  })

  it('cloud damages 3 turns then disappears', () => {
    const w = flatWorld()
    const r = addRoach(w, 'chonk', 1000, 1)
    w.addCloud({ x: 1000, y: r.pos.y }, 0)
    for (let i = 0; i < 3; i++) applyCloudsEndOfTurn(w)
    expect(r.hp).toBe(120)
    expect(w.clouds.length).toBe(0)
    applyCloudsEndOfTurn(w)
    expect(r.hp).toBe(120)
  })

  it('mine ignores own team and triggers on enemy', () => {
    const w = flatWorld()
    const own = addRoach(w, 'chonk', 1000, 0)
    w.addMine({ x: 1010, y: GROUND - 2 }, 0)
    runFor(2, () => stepMines(w, TICK))
    expect(own.hp).toBe(own.maxHp)
    expect(w.mines.length).toBe(1)
    const enemy = addRoach(w, 'chonk', 1040, 1)
    runFor(1, () => stepMines(w, TICK))
    expect(w.mines.length).toBe(0)
    expect(enemy.hp).toBeLessThan(enemy.maxHp)
  })

  it('fire burns touching roach then expires', () => {
    const w = flatWorld()
    const r = addRoach(w, 'chonk', 1000, 1)
    w.addFire({ x: 1000, y: GROUND - 2 })
    runFor(4.2, () => stepFires(w, TICK))
    expect(r.hp).toBeLessThan(r.maxHp)
    expect(r.maxHp - r.hp).toBeLessThanOrEqual(30)
    expect(w.fires.length).toBe(0)
  })

  it('bubble lifts roach', () => {
    const w = flatWorld()
    w.mask.fillRect(0, 0, 2400, 1200, 0)
    const r = addRoach(w, 'zippy', 1000, 0, 900)
    r.grounded = false
    w.bubbles.push({ id: 99, pos: { x: 1000, y: 905 }, vy: -45, dead: false })
    stepBubbles(w, TICK)
    expect(r.vel.y).toBeLessThanOrEqual(-140)
  })

  it('bubbles spawn over time', () => {
    const w = flatWorld()
    w.mask.fillRect(0, 0, 2400, 1200, 0)
    runFor(4, () => stepBubbles(w, TICK))
    expect(w.bubbles.length).toBeGreaterThanOrEqual(2)
  })

  it('candle hit by explosion starts fire once', () => {
    const w = flatWorld()
    w.candles.push({ pos: { x: 1000, y: GROUND }, lit: true })
    const spec = { pos: { x: 1010, y: GROUND }, radius: 40, damage: 10, ownerTeam: 0 as const }
    igniteCandles(w, spec)
    expect(w.fires.length).toBe(3)
    igniteCandles(w, spec)
    expect(w.fires.length).toBe(3)
  })
})
