import type { TeamId, Vec2, WeaponId } from './types'

export interface Projectile {
  id: number
  weapon: WeaponId
  pos: Vec2
  vel: Vec2
  age: number
  fuse: number
  ownerId: number
  ownerTeam: TeamId
  mini: boolean
  walking: boolean
  dead: boolean
}

export interface Cloud { id: number; pos: Vec2; radius: number; turnsLeft: number; team: TeamId }
export interface Fire { id: number; pos: Vec2; timeLeft: number }
export interface Mine { id: number; pos: Vec2; team: TeamId; armTimer: number; triggered: number }
export type CrateContent = { kind: 'weapon'; weapon: WeaponId; ammo: number } | { kind: 'health'; amount: number }
export interface Crate { id: number; pos: Vec2; vel: Vec2; landed: boolean; content: CrateContent; collected: boolean }
export interface Bubble { id: number; pos: Vec2; vy: number; dead: boolean }
export interface Candle { pos: Vec2; lit: boolean }
