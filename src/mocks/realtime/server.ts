import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws } from 'msw'

/** Engine.IO default; the client drops the connection if no ping arrives within interval + timeout. */
const PING_INTERVAL_MS = 25_000

type SocketIoConnection = ReturnType<typeof toSocketIo>

interface RealtimeClient {
  io: SocketIoConnection
  /** Resolved from the `auth.token` sent in the Socket.IO CONNECT packet. */
  token: string | null
  close: () => void
}

const clients = new Set<RealtimeClient>()

// MSW strips the `/socket.io/` path before matching, so the link targets the origin.
const socketOrigin = import.meta.env.VITE_SOCKET_URL || location.origin
export const realtimeLink = ws.link(socketOrigin.replace(/^http/, 'ws'))

export const realtimeHandler = realtimeLink.addEventListener('connection', (connection) => {
  // The origin pattern also matches other sockets (e.g. Vite HMR in dev): let them through.
  if (!connection.client.url.pathname.startsWith('/socket.io/')) {
    connection.server.connect()
    return
  }

  const client: RealtimeClient = {
    io: toSocketIo(connection),
    token: null,
    close: () => connection.client.close(),
  }
  clients.add(client)

  const heartbeat = setInterval(() => connection.client.send('2'), PING_INTERVAL_MS)

  connection.client.addEventListener('message', (event) => {
    // The binding answers the handshake itself but ignores the client's CONNECT
    // payload, so the session token is read from the raw "40{...}" packet.
    if (typeof event.data === 'string' && event.data.startsWith('40')) {
      client.token = parseConnectToken(event.data.slice(2))
    }
  })
  connection.client.addEventListener('close', () => {
    clearInterval(heartbeat)
    clients.delete(client)
  })
})

/** Emits an event to every connected client accepted by the filter. */
export function emitToClients(event: string, payload: unknown, filter: (token: string | null) => boolean = () => true) {
  for (const client of clients) {
    if (filter(client.token)) client.io.client.emit(event, payload)
  }
}

/** Server-side drop of every connection, used by the disconnect scenario. */
export function disconnectAllClients() {
  for (const client of clients) client.close()
}

function parseConnectToken(raw: string): string | null {
  if (!raw) return null
  try {
    const auth: unknown = JSON.parse(raw)
    if (typeof auth === 'object' && auth !== null && 'token' in auth && typeof auth.token === 'string') {
      return auth.token
    }
  } catch {
    // Malformed CONNECT payloads are treated as anonymous connections.
  }
  return null
}
