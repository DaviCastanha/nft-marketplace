import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ScenarioPanel } from '@/mocks/ui/scenario-panel'

const PANEL_FLAG = 'kurio:mock-panel'

/** Mounts the simulation panel in its own root, unless automation turned it off (visual baselines). */
export function mountScenarioPanel() {
  try {
    if (localStorage.getItem(PANEL_FLAG) === 'off') return
  } catch {
    // Storage blocked: show the panel.
  }
  const host = document.createElement('div')
  host.id = 'mock-panel'
  document.body.append(host)
  createRoot(host).render(
    <StrictMode>
      <ScenarioPanel />
    </StrictMode>,
  )
}
