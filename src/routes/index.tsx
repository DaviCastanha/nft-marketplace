import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { http } from '@/shared/api/http'
import { createRealtimeSocket } from '@/shared/realtime/socket'

export const Route = createFileRoute('/')({
  component: SpikePage,
})

interface PingEvent {
  message: string
  at: string
}

// Temporary end-to-end spike (REST via MSW + Socket.IO via MSW); replaced by the catalog.
function SpikePage() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: async ({ signal }) => (await http.get<{ status: string }>('/health', { signal })).data,
  })
  const [connected, setConnected] = useState(false)
  const [events, setEvents] = useState<PingEvent[]>([])

  useEffect(() => {
    const socket = createRealtimeSocket(null)
    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on('system.ping', (event: PingEvent) => setEvents((prev) => [...prev, event]))
    socket.connect()
    return () => {
      socket.removeAllListeners()
      socket.disconnect()
    }
  }, [])

  const broadcast = useMutation({
    mutationFn: () => http.post('/__mock/broadcast', { message: 'hello from the mock server' }),
  })

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-16">
      <h1 className="text-2xl font-bold tracking-widest">KURIO</h1>
      <p data-testid="health">REST: {health.data?.status ?? health.status}</p>
      <p data-testid="socket">Socket: {connected ? 'connected' : 'disconnected'}</p>
      <button
        type="button"
        className="bg-primary text-primary-foreground w-fit rounded-sm px-4 py-2 font-bold"
        onClick={() => broadcast.mutate()}
      >
        Disparar evento no mock
      </button>
      <ul data-testid="events" aria-live="polite">
        {events.map((event) => (
          <li key={event.at}>{event.message}</li>
        ))}
      </ul>
    </section>
  )
}
