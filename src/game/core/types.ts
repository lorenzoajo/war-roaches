export interface Vec2 {
  x: number
  y: number
}
export type TeamId = 0 | 1 | 2 | 3
export type RoachKind = 'chonk' | 'stilts' | 'brawler' | 'zippy'
export type WeaponId = 'bazooka' | 'grenade' | 'slipper' | 'spray' | 'shoe' | 'disco' | 'gum' | 'hotsauce' | 'duck' | 'rope'
export type MapId = 'sink' | 'pizza' | 'sofa' | 'moon' | 'cake'

export const Material = {
  Air: 0,
  Normal: 1,
  Solid: 2,
  Sticky: 3,
  Slippery: 4,
  Bouncy: 5,
} as const
export type Material = (typeof Material)[keyof typeof Material]

export interface MatchConfig {
  mapId: MapId
  players: 2 | 3 | 4
  turnTime: 30 | 45 | 60
  seed: number
}

export const TEAM_IDS: readonly TeamId[] = [0, 1, 2, 3]
export const TEAM_COLORS: Record<TeamId, number> = { 0: 0xff4d5e, 1: 0x3fa7ff, 2: 0x46d37a, 3: 0xffd23f }
export const TEAM_NAMES: Record<TeamId, string> = { 0: 'Red', 1: 'Blue', 2: 'Green', 3: 'Yellow' }
export const ROACH_KINDS: readonly RoachKind[] = ['chonk', 'stilts', 'brawler', 'zippy']
