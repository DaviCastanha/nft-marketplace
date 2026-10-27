import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import type { Socket } from 'socket.io-client'
import { networkReady } from '@/shared/api/network-ready'
import { queryKeys } from '@/shared/api/query-keys'
import { createDispatcher } from '@/shared/realtime/dispatcher'
import { realtimeStatus } from '@/shared/realtime/status-store'
import { useSession } from '@/shared/session/session-store'

/**
 * Owns the Socket.IO connection for the current session. A new token means a new
 * socket (and dispatcher), and the previous one is fully torn down, so events from
 * an earlier session can never reach another user's cache.
 *
 * socket.io-client is loaded lazily, only once the network layer is ready: engine.io
 * captures `WebSocket` when evaluated, and by then the mock layer (if enabled) has
 * patched it. It also keeps the client out of the critical path of the first render.
 */
export function RealtimeBridge() {
  const queryClient = useQueryClient()
  const session = useSession()
  const token = session.status === 'authenticated' ? session.token : null
  const userId = session.status === 'authenticated' ? session.user.id : null

  useEffect(() => {
    let disposed = false
    let socket: Socket | null = null
    const dispatcher = createDispatcher(queryClient, userId)
    let connectedBefore = false

    realtimeStatus.set('connecting')
    void networkReady
      .then(() => import('@/shared/realtime/socket'))
      .then(({ createRealtimeSocket }) => {
      if (disposed) return
      socket = createRealtimeSocket(token)
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
    })

    return () => {
      disposed = true
      socket?.removeAllListeners()
      socket?.disconnect()
      realtimeStatus.set('idle')
    }
  }, [queryClient, token, userId])

  return null
}
