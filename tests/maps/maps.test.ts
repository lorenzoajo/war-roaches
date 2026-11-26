import { describe, expect, it } from 'vitest'
import { MAPS, MAP_ORDER } from '../../src/game/maps/mapDef'
import { TerrainMask } from '../../src/game/core/terrain'
import { surfaceSpots } from '../../src/game/core/spawn'
import { Rng } from '../../src/game/core/rng'
import { HAZARD_Y, WORLD_H, WORLD_W } from '../../src/game/core/constants'
import { Material, type MapId } from '../../src/game/core/types'

const build = (id: MapId, seed: number): TerrainMask => {
  const m = new TerrainMask(WORLD_W, WORLD_H)
  MAPS[id].generate(m, new Rng(seed))
  return m
}
const has = (m: TerrainMask, mat: Material): boolean => m.data.includes(mat)

describe('maps', () => {
  it('has five maps in order', () => {
    expect(MAP_ORDER).toEqual(['sink', 'pizza', 'sofa', 'moon', 'cake'])
  })

  for (const id of MAP_ORDER) {
    for (let seed = 1; seed <= 5; seed++) {
      it(`${id} seed ${seed}: generates at least 16 surface spots`, () => {
        expect(surfaceSpots(build(id, seed), HAZARD_Y, 40).length).toBeGreaterThanOrEqual(16)
      })
      it(`${id} seed ${seed}: spots on both sides so teams spread`, () => {
        const spots = surfaceSpots(build(id, seed), HAZARD_Y, 40)
        expect(spots.some((s) => s.x < 800)).toBe(true)
        expect(spots.some((s) => s.x > 1600)).toBe(true)
      })
    }
    it(`${id}: deterministic for seed`, () => {
      expect(build(id, 9).data).toEqual(build(id, 9).data)
    })
    it(`${id}: props are deterministic`, () => {
      expect(MAPS[id].props(new Rng(3))).toEqual(MAPS[id].props(new Rng(3)))
    })
  }

  it('uses declared materials', () => {
    expect(has(build('pizza', 1), Material.Sticky)).toBe(true)
    expect(has(build('cake', 1), Material.Slippery)).toBe(true)
    expect(has(build('cake', 1), Material.Solid)).toBe(true)
    const sofa = build('sofa', 1)
    expect(has(sofa, Material.Bouncy) && has(sofa, Material.Solid)).toBe(true)
    expect(has(build('sink', 1), Material.Solid)).toBe(true)
  })

  it('moon has low gravity and cake has candles', () => {
    expect(MAPS.moon.physics.gravityMult).toBe(0.45)
    const candles = MAPS.cake.props(new Rng(1)).filter((p) => p.kind === 'candle')
    expect(candles.length).toBeGreaterThanOrEqual(5)
    expect(candles.length).toBeLessThanOrEqual(7)
  })
})
