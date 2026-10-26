import { HttpResponse, delay } from 'msw'
import { readStorage, writeStorage } from '@/mocks/db/store'
import { createRandom } from '@/mocks/lib/random'
import { DEFAULT_SCENARIO, findScenario, type RouteKey, type Scenario } from '@/mocks/scenarios/definitions'

const SCENARIO_KEY = 'kurio:mock-scenario'
const LATENCY_SEED = 7

let active: Scenario = findScenario(DEFAULT_SCENARIO)!
const sequences = new Map<RouteKey, number>()
let latencyRandom = createRandom(LATENCY_SEED).next
/** One-shot triggers (checkout change, order timeout) re-arm whenever the scenario is (re)applied. */
const fired = new Set<string>()

/** Resolution order: `?scenario=` in the URL, the persisted choice, then VITE_MOCK_SCENARIO. */
export function initScenario() {
  const fromUrl = new URLSearchParams(location.search).get('scenario')
  const id = [fromUrl, readStorage<string>(SCENARIO_KEY), import.meta.env.VITE_MOCK_SCENARIO].find((candidate) =>
    findScenario(candidate),
  )
  applyScenario(findScenario(id) ?? active)
}

export function currentScenario(): Scenario {
  return active
}

export function setScenario(id: string): Scenario | null {
  const scenario = findScenario(id)
  if (!scenario) return null
  applyScenario(scenario)
  return scenario
}

function applyScenario(scenario: Scenario) {
  active = scenario
  writeStorage(SCENARIO_KEY, scenario.id)
  resetNetworkState()
}

export function resetNetworkState() {
  sequences.clear()
  fired.clear()
  latencyRandom = createRandom(LATENCY_SEED).next
}

/** Returns true the first time a one-shot trigger is consumed in the current scenario run. */
export function consumeOnce(trigger: string) {
  if (fired.has(trigger)) return false
  fired.add(trigger)
  return true
}

const SERVER_ERROR_BODY = { code: 'SERVER_ERROR', message: 'Serviço temporariamente indisponível. Tente novamente.' }

/** Applies the scenario's latency and faults; a Response short-circuits the handler. */
export async function simulateNetwork(route: RouteKey): Promise<Response | null> {
  const scenario = active
  const sequence = sequences.get(route) ?? 0
  sequences.set(route, sequence + 1)

  if (scenario.offline) return HttpResponse.error()

  const latency = scenario.latency(route, sequence, latencyRandom)
  if (latency > 0) await delay(latency)

  const fault = scenario.faults?.[route]?.(sequence) ?? null
  if (fault === 'network-error') return HttpResponse.error()
  if (fault === 'timeout') await delay('infinite')
  if (typeof fault === 'number') return HttpResponse.json(SERVER_ERROR_BODY, { status: fault })
  return null
}
