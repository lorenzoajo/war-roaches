/** Tracks which walk buttons are held so lifting one finger falls back to the other. */
export class HeldDirections {
  private held: { id: number; dir: -1 | 1 }[] = []

  press(pointerId: number, dir: -1 | 1): -1 | 0 | 1 {
    this.held = this.held.filter((h) => h.id !== pointerId)
    this.held.push({ id: pointerId, dir })
    return this.current()
  }

  release(pointerId: number): -1 | 0 | 1 {
    this.held = this.held.filter((h) => h.id !== pointerId)
    return this.current()
  }

  current(): -1 | 0 | 1 {
    return this.held.at(-1)?.dir ?? 0
  }
}
