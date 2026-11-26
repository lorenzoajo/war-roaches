import type { TeamId, Vec2, WeaponId } from './types'

export type GameEvent =
  | { type: 'explosion'; pos: Vec2; radius: number }
  | { type: 'carve'; pos: Vec2; radius: number }
  | { type: 'damage'; roachId: number; amount: number; pos: Vec2 }
  | { type: 'heal'; roachId: number; amount: number; pos: Vec2 }
  | { type: 'launch'; weapon: WeaponId; pos: Vec2 }
  | { type: 'bounce'; pos: Vec2 }
  | { type: 'splash'; pos: Vec2 }
  | { type: 'death'; roachId: number; pos: Vec2 }
  | { type: 'pickup'; team: TeamId; label: string; pos: Vec2 }
  | { type: 'turnStart'; team: TeamId }
  | { type: 'jump'; pos: Vec2 }
  | { type: 'land'; pos: Vec2 }
  | { type: 'tick' }
  | { type: 'melee'; pos: Vec2; hit: boolean }
  | { type: 'special'; roachId: number; pos: Vec2 }
  | { type: 'gameOver'; winner: TeamId | null }
