import { io, type Socket } from 'socket.io-client'

/**
 * Creates the Socket.IO client for a session. Websocket-only transport keeps the
 * connection interceptable by MSW (long-polling would go through fetch instead).
 */
export function createRealtimeSocket(token: string | null): Socket {
  const url = import.meta.env.VITE_SOCKET_URL || undefined
  return io(url, {
    transports: ['websocket'],
    autoConnect: false,
    auth: token ? { token } : {},
    reconnectionDelay: 500,
    reconnectionDelayMax: 4_000,
  })
}
