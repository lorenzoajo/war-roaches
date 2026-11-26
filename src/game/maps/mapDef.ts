import type { Rng } from '../core/rng'
import type { TerrainMask } from '../core/terrain'
import type { MapId } from '../core/types'
import { sink } from './sink'
import { pizza } from './pizza'
import { sofa } from './sofa'
import { moon } from './moon'
import { cake } from './cake'

export interface MapTheme {
  sky: [number, number]
  terrain: number
  terrainDark: number
  rim: number
  accents: number[]
  hazard: number
  hazardName: string
  debris: number[]
}

export interface MapPhysics {
  gravityMult: number
  windMax: number
  bubbles: boolean
}

export interface MapProp {
  kind: string
  x: number
  y: number
  scale: number
  rot: number
}

/**
 * `generate` and `props` must both derive geometry from the rng they receive in the same order,
 * so the Game passes each a fresh `new Rng(seed)` and props line up with terrain.
 */
export interface MapDef {
  id: MapId
  name: string
  tagline: string
  theme: MapTheme
  physics: MapPhysics
  generate(mask: TerrainMask, rng: Rng): void
  props(rng: Rng): MapProp[]
}

export const MAPS: Record<MapId, MapDef> = { sink, pizza, sofa, moon, cake }
export const MAP_ORDER: readonly MapId[] = ['sink', 'pizza', 'sofa', 'moon', 'cake']
