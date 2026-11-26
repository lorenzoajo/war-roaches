import { describe, expect, it } from 'vitest'
import { KeyboardInput, type KeyAction } from '../../src/game/input/keyboard'

const setup = () => {
  const moves: (-1 | 0 | 1)[] = []
  const jumps: boolean[] = []
  const actions: KeyAction[] = []
  const k = new KeyboardInput({ move: (d) => moves.push(d), jump: (p) => jumps.push(p), action: (a) => actions.push(a) })
  return { k, moves, jumps, actions }
}
const down = (code: string, repeat = false) => ({ code, repeat })

describe('KeyboardInput', () => {
  it('arrow keys and WASD walk, newest key wins, release falls back', () => {
    const { k, moves } = setup()
    k.keydown(down('ArrowLeft'))
    k.keydown(down('KeyD'))
    k.keyup(down('KeyD'))
    k.keyup(down('ArrowLeft'))
    expect(moves).toEqual([-1, 1, -1, 0])
  })

  it('key repeat does not resend movement or jump', () => {
    const { k, moves, jumps } = setup()
    k.keydown(down('ArrowRight'))
    k.keydown(down('ArrowRight', true))
    k.keydown(down('Space'))
    k.keydown(down('Space', true))
    expect(moves).toEqual([1])
    expect(jumps).toEqual([true])
  })

  it('jump stays held until every jump key is released', () => {
    const { k, jumps } = setup()
    k.keydown(down('ArrowUp'))
    k.keydown(down('KeyW'))
    k.keyup(down('ArrowUp'))
    k.keyup(down('KeyW'))
    expect(jumps).toEqual([true, true, false])
  })

  it('escape and P pause, enter/space start', () => {
    const { k, actions } = setup()
    k.keydown(down('Escape'))
    k.keydown(down('KeyP'))
    k.keydown(down('Enter'))
    k.keydown(down('Space'))
    expect(actions).toEqual(['pause', 'pause', 'start', 'start'])
  })

  it('reports whether a key was handled', () => {
    const { k } = setup()
    expect(k.keydown(down('ArrowLeft'))).toBe(true)
    expect(k.keydown(down('KeyZ'))).toBe(false)
  })

  it('reset releases everything (window blur)', () => {
    const { k, moves, jumps } = setup()
    k.keydown(down('ArrowLeft'))
    k.keydown(down('Space'))
    k.reset()
    expect(moves.at(-1)).toBe(0)
    expect(jumps.at(-1)).toBe(false)
    k.keydown(down('ArrowRight'))
    expect(moves.at(-1)).toBe(1)
  })
})
