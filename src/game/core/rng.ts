/** mulberry32: small, fast, deterministic. */
export class Rng {
  private state: number

  constructor(seed: number) {
    this.state = seed >>> 0
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0
    let t = this.state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  range(min: number, max: number): number {
    return min + (max - min) * this.next()
  }

  int(min: number, maxIncl: number): number {
    return min + Math.floor(this.next() * (maxIncl - min + 1))
  }

  pick<T>(arr: readonly T[]): T {
    const v = arr[Math.floor(this.next() * arr.length)]
    if (v === undefined) throw new Error('Rng.pick on empty array')
    return v
  }

  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1))
      const tmp = arr[i] as T
      arr[i] = arr[j] as T
      arr[j] = tmp
    }
    return arr
  }
}
