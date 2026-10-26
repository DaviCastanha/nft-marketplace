import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { queryKeys } from '@/shared/api/query-keys'
import { createDispatcher } from '@/shared/realtime/dispatcher'
import { createRealtimeSocket } from '@/shared/realtime/socket'
import { realtimeStatus } from '@/shared/realtime/status-store'
import { useSession } from '@/shared/session/session-store'

/**
 * Owns the Socket.IO connection for the current session. A new token means a new
 * socket (and dispatcher), and the previous one is fully torn down, so events from
 * an earlier session can never reach another user's cache.
 */
export function RealtimeBridge() {
  const queryClient = useQueryClient()
  const session = useSession()
  const token = session.status === 'authenticated' ? session.token : null
  const userId = session.status === 'authenticated' ? session.user.id : null

  useEffect(() => {
    const socket = createRealtimeSocket(token)
    const dispatcher = createDispatcher(queryClient, userId)
    let connectedBefore = false

    realtimeStatus.set('connecting')
    socket.on('connect', () => {
      realtimeStatus.set('connected')
      if (connectedBefore) {
        // Events may have been missed while offline: reconcile active resources with REST.
        void queryClient.invalidateQueries({ queryKey: queryKeys.catalog.all })
        void queryClient.invalidateQueries({ predicate: (q) => q.queryKey.includes('cart') || q.queryKey.includes('quote') })
        if (userId) void queryClient.invalidateQueries({ queryKey: [...queryKeys.user.scope(userId), 'order'] })
      }
      connectedBefore = true
    })
    socket.on('disconnect', () => realtimeStatus.set('reconnecting'))
    socket.on('nft.updated', dispatcher.onNftUpdated)
    socket.on('order.updated', dispatcher.onOrderUpdated)
    socket.connect()

    return () => {
      socket.removeAllListeners()
      socket.disconnect()
      realtimeStatus.set('idle')
    }
  }, [queryClient, token, userId])

  return null
}
