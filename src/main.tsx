import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/index.css'

async function enableMocking() {
  // Statically replaced by Vite, so the mock layer is tree-shaken out of builds without mocks.
  if (import.meta.env.VITE_ENABLE_MOCKS === 'true') {
    const { startMockWorker } = await import('@/mocks/browser')
    await startMockWorker()
  }
}

async function bootstrap() {
  await enableMocking()
  // The app is imported only after MSW patches WebSocket: engine.io-client captures
  // `globalThis.WebSocket` at module evaluation, which would bypass the mocks.
  const { App } = await import('@/app/app')
  const root = document.getElementById('root')
  if (!root) throw new Error('Missing #root element')
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  if (import.meta.env.VITE_ENABLE_MOCKS === 'true') {
    const { mountScenarioPanel } = await import('@/mocks/ui/mount')
    mountScenarioPanel()
  }
}

void bootstrap()
