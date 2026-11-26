import { describe, expect, it } from 'vitest'
import { Game } from '../../src/game/core/game'
import type { MatchConfig, TeamId } from '../../src/game/core/types'
import { HAZARD_Y } from '../../src/game/core/constants'

const cfg = (over: Partial<MatchConfig> = {}): MatchConfig => ({ mapId: 'pizza', players: 2, turnTime: 30, seed: 1234, ...over })

const run = (g: Game, seconds: number): void => {
  for (let t = 0; t < seconds; t += 0.1) g.update(0.1)
}

/** Lets the turn time out and settle; returns the team that played. */
const playIdleTurn = (g: Game): TeamId => {
  if (g.phase === 'handoff') g.command({ type: 'beginTurn' })
  const team = g.team
  for (let i = 0; i < 600 && g.phase !== 'handoff' && g.phase !== 'gameOver'; i++) g.update(0.1)
  return team
}

const killTeam = (g: Game, team: TeamId): void => {
  for (const r of g.world.roaches) if (r.team === team) {
    r.hp = 0
    r.alive = false
  }
}

describe('Game', () => {
  it('starts in handoff with 4 roaches per team', () => {
    const g = new Game(cfg({ players: 3 }))
    expect(g.phase).toBe('handoff')
    expect(g.world.roaches.length).toBe(12)
    for (const t of [0, 1, 2]) expect(g.world.roaches.filter((r) => r.team === t).map((r) => r.kind).sort()).toEqual(['brawler', 'chonk', 'stilts', 'zippy'])
  })

  it('beginTurn starts timer', () => {
    const g = new Game(cfg({ turnTime: 45 }))
    g.command({ type: 'beginTurn' })
    expect(g.phase).toBe('turn')
    expect(g.snapshot().timeLeft).toBe(45)
  })

  it('firing bazooka enters retreat then settling', () => {
    const g = new Game(cfg())
    g.command({ type: 'beginTurn' })
    g.command({ type: 'fire', angle: -Math.PI / 3, power: 0.6 })
    expect(g.phase).toBe('retreat')
    expect(g.world.projectiles.length).toBe(1)
    run(g, 3.2)
    expect(['settling', 'handoff']).toContain(g.phase)
  })

  it('timer expiry without firing ends turn', () => {
    const g = new Game(cfg())
    const first = playIdleTurn(g)
    expect(g.phase).toBe('handoff')
    expect(g.team).not.toBe(first)
  })

  it('turn order rotates teams and skips dead teams', () => {
    const g = new Game(cfg({ players: 3 }))
    const first = g.team
    const order = g.teamOrder
    const next = order[(order.indexOf(first) + 1) % 3]!
    const after = order[(order.indexOf(first) + 2) % 3]!
    killTeam(g, next)
    playIdleTurn(g)
    expect(g.team).toBe(after)
  })

  it('roaches within team rotate', () => {
    const g = new Game(cfg())
    const team = g.team
    const firstRoach = g.activeId
    playIdleTurn(g)
    playIdleTurn(g)
    expect(g.team).toBe(team)
    expect(g.activeId).not.toBe(firstRoach)
    expect(g.activeRoach()?.team).toBe(team)
  })

  it('ends turn when active roach dies', () => {
    const g = new Game(cfg())
    g.command({ type: 'beginTurn' })
    const team = g.team
    const r = g.activeRoach()!
    r.hp = 0
    r.alive = false
    run(g, 12)
    expect(g.phase).toBe('handoff')
    expect(g.team).not.toBe(team)
  })

  it('last team standing wins', () => {
    const g = new Game(cfg())
    const loser = g.teamOrder.find((t) => t !== g.team)!
    killTeam(g, loser)
    playIdleTurn(g)
    expect(g.phase).toBe('gameOver')
    expect(g.snapshot().winner).toBe(g.teamOrder.find((t) => t !== loser))
  })

  it('simultaneous wipe is a draw', () => {
    const g = new Game(cfg({ players: 3 }))
    for (const t of g.teamOrder) killTeam(g, t)
    playIdleTurn(g)
    expect(g.phase).toBe('gameOver')
    expect(g.snapshot().winner).toBeNull()
  })

  it('settle phase times out', () => {
    const g = new Game(cfg())
    g.command({ type: 'beginTurn' })
    g.command({ type: 'fire', angle: -Math.PI / 2, power: 0.01 })
    const p = g.world.projectiles[0]!
    p.fuse = Infinity
    p.weapon = 'grenade'
    run(g, 3 + 10.5)
    expect(g.phase).toBe('handoff')
  })

  it('paused game does not tick timer', () => {
    const g = new Game(cfg())
    g.command({ type: 'beginTurn' })
    g.paused = true
    run(g, 5)
    expect(g.snapshot().timeLeft).toBe(30)
  })

  it('clamps large frame dt', () => {
    const g = new Game(cfg())
    g.command({ type: 'beginTurn' })
    g.update(5)
    expect(g.snapshot().timeLeft).toBeGreaterThanOrEqual(29.89)
  })

  it('cannot fire weapon with zero ammo', () => {
    const g = new Game(cfg())
    g.command({ type: 'beginTurn' })
    g.command({ type: 'selectWeapon', weapon: 'shoe' })
    expect(g.snapshot().weapon).toBe('bazooka')
    g.ammo[g.team].shoe = 1
    g.command({ type: 'selectWeapon', weapon: 'shoe' })
    expect(g.snapshot().weapon).toBe('shoe')
    g.command({ type: 'target', x: 1200, y: 500 })
    expect(g.ammo[g.team].shoe).toBe(0)
    expect(g.phase).toBe('retreat')
  })

  it('rope does not end turn', () => {
    const g = new Game(cfg())
    g.command({ type: 'beginTurn' })
    g.ammo[g.team].rope = 2
    g.command({ type: 'selectWeapon', weapon: 'rope' })
    g.command({ type: 'fire', angle: -Math.PI / 2, power: 1 })
    expect(g.phase).toBe('turn')
  })

  it('special usable once per turn', () => {
    const g = new Game(cfg())
    g.command({ type: 'beginTurn' })
    const zippy = g.world.roaches.find((r) => r.team === g.team && r.kind === 'zippy')!
    g.activeId = zippy.id
    g.command({ type: 'special' })
    expect(zippy.specialCooldown).toBe(3)
    zippy.specialCooldown = 0
    g.command({ type: 'special' })
    expect(zippy.specialCooldown).toBe(0)
  })

  it('sudden death raises hazard after 720 s', () => {
    const g = new Game(cfg())
    g.elapsed = 720
    playIdleTurn(g)
    expect(g.world.hazardY).toBe(HAZARD_Y - 25)
    expect(g.snapshot().suddenDeath).toBe(true)
  })

  it('places 3 to 5 crates at start', () => {
    const g = new Game(cfg())
    expect(g.world.crates.length).toBeGreaterThanOrEqual(3)
    expect(g.world.crates.length).toBeLessThanOrEqual(5)
  })

  it('cake map registers candles', () => {
    const g = new Game(cfg({ mapId: 'cake' }))
    expect(g.world.candles.length).toBeGreaterThanOrEqual(5)
  })

  it('deterministic for same seed and commands', () => {
    const script = (g: Game): void => {
      g.command({ type: 'beginTurn' })
      g.command({ type: 'move', dir: 1 })
      run(g, 0.5)
      g.command({ type: 'move', dir: 0 })
      g.command({ type: 'fire', angle: -0.8, power: 0.7 })
      run(g, 15)
    }
    const a = new Game(cfg()), b = new Game(cfg())
    script(a)
    script(b)
    expect(a.world.roaches.map((r) => [r.pos.x, r.pos.y, r.hp])).toEqual(b.world.roaches.map((r) => [r.pos.x, r.pos.y, r.hp]))
  })
})

describe('Game review fixes', () => {
  it('hazard spit-back clears the rope', () => {
    const g = new Game(cfg())
    g.command({ type: 'beginTurn' })
    const r = g.activeRoach()!
    r.pos.y = g.world.hazardY + 10
    g.rope = { anchor: { x: r.pos.x, y: r.pos.y - 100 }, length: 100 }
    run(g, 0.1)
    expect(g.rope).toBeNull()
  })

  it('capped settle leaves no projectiles behind', () => {
    const g = new Game(cfg())
    g.command({ type: 'beginTurn' })
    g.command({ type: 'fire', angle: -Math.PI / 2, power: 0.01 })
    const p = g.world.projectiles[0]!
    p.fuse = Infinity
    p.weapon = 'grenade'
    run(g, 3 + 10.5)
    expect(g.phase).toBe('handoff')
    expect(g.world.projectiles.length).toBe(0)
  })

  it('reselects a living roach if the chosen one died during handoff', () => {
    const g = new Game(cfg())
    const team = g.team
    const r = g.activeRoach()!
    r.hp = 0
    r.alive = false
    g.command({ type: 'beginTurn' })
    expect(g.activeRoach()?.alive).toBe(true)
    expect(g.activeRoach()?.team).toBe(team)
    run(g, 1)
    expect(g.phase).toBe('turn')
  })
})
