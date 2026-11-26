import { describe, expect, it } from 'vitest'
import { needsResume } from '../../src/game/audio/resume'

describe('needsResume', () => {
  it('resumes suspended and iOS interrupted contexts', () => {
    expect(needsResume('suspended')).toBe(true)
    expect(needsResume('interrupted')).toBe(true)
    expect(needsResume('running')).toBe(false)
    expect(needsResume('closed')).toBe(false)
  })
})
