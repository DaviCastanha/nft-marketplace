import { setupWorker } from 'msw/browser'
import { resumePendingOrders } from '@/mocks/domain/orders'
import { initDb } from '@/mocks/db/store'
import { handlers } from '@/mocks/handlers'
import { initScenario } from '@/mocks/scenarios/state'

export async function startMockWorker() {
  initDb()
  initScenario()
  resumePendingOrders()

  const worker = setupWorker(...handlers)
  await worker.start({
    serviceWorker: { url: '/mockServiceWorker.js' },
    quiet: import.meta.env.PROD,
    onUnhandledRequest(request, print) {
      // Assets, fonts and Vite internals are expected to bypass the mocks.
      if (new URL(request.url).pathname.startsWith(import.meta.env.VITE_API_URL)) print.warning()
    },
  })
  // Lets automation wait until the mock layer (and the selected scenario) is active.
  document.documentElement.dataset.mocks = 'ready'
  return worker
}
