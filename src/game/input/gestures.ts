import { AIM_GRAB_MULT, MAX_DRAG_PX } from '../core/constants'
import type { Vec2 } from '../core/types'
import { clamp } from '../core/vec'

export interface AimResult {
  angle: number
  power: number
  cancel: boolean
}

export const MIN_ZOOM = 0.35
export const MAX_ZOOM = 2

export function isInAimZone(pointer: Vec2, roachScreen: Vec2, roachRadiusPx: number): boolean {
  return Math.hypot(pointer.x - roachScreen.x, pointer.y - roachScreen.y) <= Math.max(60, AIM_GRAB_MULT * roachRadiusPx)
}

/** Slingshot: pull away from the roach, shot goes the opposite way. */
export function aimFromDrag(roachScreen: Vec2, pointer: Vec2, roachRadiusPx: number): AimResult {
  const dx = roachScreen.x - pointer.x, dy = roachScreen.y - pointer.y
  const d = Math.hypot(dx, dy)
  return {
    angle: Math.atan2(dy, dx),
    power: clamp(d / MAX_DRAG_PX, 0, 1),
    cancel: d < Math.max(24, 1.2 * roachRadiusPx),
  }
}

export function pinchZoom(startDist: number, nowDist: number, startZoom: number): number {
  if (startDist <= 0) return startZoom
  return clamp(startZoom * (nowDist / startDist), MIN_ZOOM, MAX_ZOOM)
}
