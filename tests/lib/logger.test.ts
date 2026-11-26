import { beforeEach, describe, expect, it } from 'vitest'
import { logger, resetLogs } from '../../src/lib/logger'

describe('logger', () => {
  beforeEach(() => resetLogs())

  it('keeps last 200 entries', () => {
    for (let i = 0; i < 250; i++) logger.debug(`m${i}`)
    const recent = logger.recent()
    expect(recent.length).toBe(200)
    expect(recent[0]?.msg).toBe('m50')
  })

  it('error stores err message', () => {
    logger.error('x', new Error('boom'))
    expect(logger.recent().at(-1)?.ctx?.error).toBe('boom')
  })
})
