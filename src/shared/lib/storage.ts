/** Storage access that never throws (private mode, blocked storage, quota). */
function safe(kind: 'local' | 'session') {
  const get = () => {
    try {
      return kind === 'local' ? window.localStorage : window.sessionStorage
    } catch {
      return null
    }
  }
  return {
    read<T>(key: string): T | null {
      try {
        const raw = get()?.getItem(key)
        return raw ? (JSON.parse(raw) as T) : null
      } catch {
        return null
      }
    },
    write(key: string, value: unknown) {
      try {
        get()?.setItem(key, JSON.stringify(value))
      } catch {
        // Persistence is best effort; the in-memory state stays authoritative.
      }
    },
    remove(key: string) {
      try {
        get()?.removeItem(key)
      } catch {
        // See write().
      }
    },
  }
}

export const local = safe('local')
export const session = safe('session')
