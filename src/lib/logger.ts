export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  level: LogLevel
  msg: string
  time: number
  ctx?: Record<string, unknown>
}

const MAX_ENTRIES = 200
let entries: LogEntry[] = []

function push(level: LogLevel, msg: string, ctx?: Record<string, unknown>): void {
  entries.push({ level, msg, time: Date.now(), ctx })
  if (entries.length > MAX_ENTRIES) entries = entries.slice(entries.length - MAX_ENTRIES)
  if (level === 'error') console.error(`[war-roaches] ${msg}`, ctx ?? '')
  else if (level === 'warn') console.warn(`[war-roaches] ${msg}`, ctx ?? '')
  else if (import.meta.env?.DEV) console.log(`[war-roaches] ${msg}`, ctx ?? '')
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}

export const logger = {
  debug: (msg: string, ctx?: Record<string, unknown>): void => push('debug', msg, ctx),
  info: (msg: string, ctx?: Record<string, unknown>): void => push('info', msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>): void => push('warn', msg, ctx),
  error: (msg: string, err?: unknown, ctx?: Record<string, unknown>): void =>
    push('error', msg, err === undefined ? ctx : { ...ctx, error: errorMessage(err) }),
  recent: (): LogEntry[] => [...entries],
}

export function resetLogs(): void {
  entries = []
}

export function installGlobalHandlers(): void {
  window.addEventListener('error', (e) => logger.error('uncaught error', e.error ?? e.message))
  window.addEventListener('unhandledrejection', (e) => logger.error('unhandled rejection', e.reason))
}
