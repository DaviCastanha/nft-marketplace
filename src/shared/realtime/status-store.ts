import { useSyncExternalStore } from 'react'

export type RealtimeStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting'

let status: RealtimeStatus = 'idle'
const listeners = new Set<() => void>()

export const realtimeStatus = {
  get: () => status,
  set(next: RealtimeStatus) {
    if (next === status) return
    status = next
    // Mirrored on <html> for debugging and automation (tests wait for "connected").
    document.documentElement.dataset.realtime = next
    listeners.forEach((listener) => listener())
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

export function useRealtimeStatus(): RealtimeStatus {
  return useSyncExternalStore(realtimeStatus.subscribe, realtimeStatus.get)
}
