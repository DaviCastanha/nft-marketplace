import { HttpResponse, http } from 'msw'
import { emitToClients } from '@/mocks/realtime/server'

const api = (path: string) => `${import.meta.env.VITE_API_URL}${path}`

export const systemHandlers = [
  http.get(api('/health'), () => HttpResponse.json({ status: 'ok', mocked: true })),

  // Mock control: the realtime event is produced by the mock server and reaches
  // the UI only through the Socket.IO client.
  http.post(api('/__mock/broadcast'), async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { message?: string }
    emitToClients('system.ping', { message: body.message ?? 'ping', at: new Date().toISOString() })
    return new HttpResponse(null, { status: 204 })
  }),
]
