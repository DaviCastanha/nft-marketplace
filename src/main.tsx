import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { markNetworkReady } from '@/shared/api/network-ready'
import '@/index.css'

async function startNetwork() {
  // Statically replaced by Vite, so the mock layer is tree-shaken out of builds without mocks.
  if (import.meta.env.VITE_ENABLE_MOCKS === 'true') {
    const { startMockWorker } = await import('@/mocks/browser')
    await startMockWorker()
  }
  markNetworkReady()
}

async function bootstrap() {
  // The UI renders as soon as the app code arrives; requests (HTTP and Socket.IO) wait for
  // the network layer, so with mocks enabled nothing ever reaches the network unmocked.
  const network = startNetwork()
  const { App } = await import('@/app/app')
  const root = document.getElementById('root')
  if (!root) throw new Error('Missing #root element')
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  if (import.meta.env.VITE_ENABLE_MOCKS === 'true') {
    await network
    const { mountScenarioPanel } = await import('@/mocks/ui/mount')
    mountScenarioPanel()
  }
}

void bootstrap()
