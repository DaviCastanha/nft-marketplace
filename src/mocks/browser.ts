import { setupWorker } from 'msw/browser'
import { systemHandlers } from '@/mocks/handlers/system'
import { realtimeHandler } from '@/mocks/realtime/server'

export async function startMockWorker() {
  const worker = setupWorker(...systemHandlers, realtimeHandler)
  await worker.start({
    serviceWorker: { url: '/mockServiceWorker.js' },
    quiet: import.meta.env.PROD,
    onUnhandledRequest(request, print) {
      // Assets, fonts and Vite internals are expected to bypass the mocks.
      if (new URL(request.url).pathname.startsWith(import.meta.env.VITE_API_URL)) print.warning()
    },
  })
  return worker
}
