import { logger } from '../../lib/logger'
import { needsResume } from './resume'

const MUTE_KEY = 'wr.muted'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let muted = readMuted()

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch (err) {
    logger.warn('localStorage unavailable', { error: String(err) })
    return false
  }
}

function ac(): AudioContext | null {
  if (muted || !ctx || !master) return null
  return ctx
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number): void {
  const a = ac()
  if (!a || !master) return
  const t = a.currentTime
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  o.connect(g).connect(master)
  o.start(t)
  o.stop(t + dur + 0.02)
}

function noise(dur: number, vol: number, cutoff: number): void {
  const a = ac()
  if (!a || !master) return
  const t = a.currentTime
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length)
  const src = a.createBufferSource()
  src.buffer = buf
  const f = a.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.setValueAtTime(cutoff, t)
  f.frequency.exponentialRampToValueAtTime(80, t + dur)
  const g = a.createGain()
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  src.connect(f).connect(g).connect(master)
  src.start(t)
}

export const sfx = {
  unlock(): void {
    try {
      if (!ctx) {
        ctx = new AudioContext()
        master = ctx.createGain()
        master.gain.value = 0.5
        master.connect(ctx.destination)
      }
      if (needsResume(ctx.state)) void ctx.resume()
    } catch (err) {
      logger.error('audio unlock failed', err)
    }
  },
  setMuted(m: boolean): void {
    muted = m
    try {
      localStorage.setItem(MUTE_KEY, m ? '1' : '0')
    } catch (err) {
      logger.warn('could not persist mute', { error: String(err) })
    }
  },
  isMuted: (): boolean => muted,
  boom(size: number): void {
    noise(0.5 + size / 200, 0.9, 1800)
    tone(120, 0.5, 'sine', 0.6, 35)
  },
  pop: (): void => tone(520, 0.08, 'triangle', 0.3, 900),
  splat(): void {
    noise(0.25, 0.5, 900)
    tone(300, 0.2, 'sine', 0.3, 90)
  },
  jump: (): void => tone(330, 0.15, 'square', 0.12, 660),
  squeak: (): void => tone(900, 0.12, 'triangle', 0.18, 1400),
  tick: (): void => tone(1200, 0.05, 'square', 0.12),
  pickup(): void {
    tone(660, 0.1, 'triangle', 0.25)
    setTimeout(() => tone(990, 0.15, 'triangle', 0.25), 90)
  },
  whoosh: (): void => noise(0.25, 0.25, 3000),
  victory(): void {
    ;[523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.25, 'triangle', 0.3), i * 140))
  },
}

export function vibrate(ms: number): void {
  try {
    if ('vibrate' in navigator) navigator.vibrate(ms)
  } catch (err) {
    logger.warn('vibrate failed', { error: String(err) })
  }
}
