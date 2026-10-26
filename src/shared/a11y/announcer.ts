let message = ''
const listeners = new Set<() => void>()

/**
 * Announces a status change to assistive technology (mutations, realtime updates).
 * Re-announcing the same text works because the region is cleared first.
 */
export function announce(text: string) {
  setMessage('')
  queueMicrotask(() => setMessage(text))
}

function setMessage(next: string) {
  message = next
  listeners.forEach((listener) => listener())
}

export const announcerStore = {
  get: () => message,
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}
