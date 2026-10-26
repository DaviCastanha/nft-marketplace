import { buildSeed, SCHEMA_VERSION } from '@/mocks/db/seed'
import type { DbState } from '@/mocks/db/types'

/** Versioned key: a schema change invalidates persisted data instead of crashing on old shapes. */
const DB_KEY = `kurio:mock-db:v${SCHEMA_VERSION}`

let state: DbState | null = null

export function initDb() {
  const saved = readStorage<DbState>(DB_KEY)
  state = saved?.schemaVersion === SCHEMA_VERSION ? saved : buildSeed()
  persist()
}

export function db(): DbState {
  if (!state) throw new Error('Mock database used before initDb()')
  return state
}

/** Persists the whole state so refreshes keep sessions, carts, orders and edits. */
export function persist() {
  if (!state) return
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(state))
  } catch {
    // Storage may be unavailable (private mode, quota); the session keeps working in memory.
  }
}

/** Restores the known seed exactly; the active scenario is kept by the caller. */
export function resetDb() {
  state = buildSeed()
  persist()
}

export function readStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function writeStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // See persist().
  }
}
