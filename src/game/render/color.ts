export const rgb = (c: number): [number, number, number] => [(c >> 16) & 255, (c >> 8) & 255, c & 255]
export const toHex = (r: number, g: number, b: number): number => (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)
export const mix = (a: number, b: number, t: number): number => {
  const [ar, ag, ab] = rgb(a), [br, bg, bb] = rgb(b)
  return toHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t)
}
export const css = (c: number): string => `#${c.toString(16).padStart(6, '0')}`
/** Cheap deterministic per-pixel hash in [0,1). */
export const hash2 = (x: number, y: number): number => {
  let h = (x * 374761393 + y * 668265263) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
