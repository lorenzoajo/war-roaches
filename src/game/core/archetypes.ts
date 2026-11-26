import type { RoachKind } from './types'

export interface Archetype {
  label: string
  hp: number
  walkSpeed: number
  jumpVel: number
  mass: number
  radius: number
  airJumps: number
  meleeMult: number
  previewFrac: number
  special: string
}

export const ARCHETYPES: Record<RoachKind, Archetype> = {
  chonk: { label: 'Chonk', hp: 150, walkSpeed: 50, jumpVel: 260, mass: 1.6, radius: 15, airJumps: 0, meleeMult: 1, previewFrac: 0.4, special: 'Belly Slam' },
  stilts: { label: 'Stilts', hp: 90, walkSpeed: 75, jumpVel: 430, mass: 0.8, radius: 11, airJumps: 0, meleeMult: 1, previewFrac: 0.6, special: 'Periscope' },
  brawler: { label: 'Brawler', hp: 110, walkSpeed: 75, jumpVel: 300, mass: 1.1, radius: 13, airJumps: 0, meleeMult: 2, previewFrac: 0.4, special: 'Mega Flick' },
  zippy: { label: 'Zippy', hp: 80, walkSpeed: 115, jumpVel: 300, mass: 0.7, radius: 9, airJumps: 1, meleeMult: 1, previewFrac: 0.4, special: 'Scuttle Dash' },
}
