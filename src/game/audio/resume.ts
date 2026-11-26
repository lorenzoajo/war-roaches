/** iOS reports 'interrupted' after a call/lock; anything not running (or closed) must be resumed. */
export function needsResume(state: string): boolean {
  return state !== 'running' && state !== 'closed'
}
