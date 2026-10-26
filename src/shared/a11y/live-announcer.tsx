import { useSyncExternalStore } from 'react'
import { announcerStore } from '@/shared/a11y/announcer'

/** Polite live region fed by `announce()`. */
export function LiveAnnouncer() {
  const text = useSyncExternalStore(announcerStore.subscribe, announcerStore.get)
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only" data-testid="live-announcer">
      {text}
    </div>
  )
}
