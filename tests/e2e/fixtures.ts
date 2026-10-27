import { test as base, expect, type Page } from '@playwright/test'

export const ALICE = { email: 'alice@jungle.test', password: 'Jungle@123', name: 'Alice Martins' }
export const BRUNO = { email: 'bruno@jungle.test', password: 'Jungle@123', name: 'Bruno Costa' }

type Json = Record<string, unknown> | unknown[] | null

/**
 * Mock control plane (/api/__mock/*). Calls run inside the page so they go through
 * the MSW worker, exactly like the app's own requests. Tests never touch app state
 * directly: data changes reach the UI through REST and Socket.IO.
 */
export class MockControl {
  constructor(private readonly page: Page) {}

  async call(method: string, path: string, body?: unknown): Promise<{ status: number; body: Json }> {
    return this.page.evaluate(
      async ({ method, path, body }) => {
        const response = await fetch(`/api/__mock${path}`, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: body === undefined ? undefined : JSON.stringify(body),
        })
        const text = await response.text()
        return { status: response.status, body: text ? (JSON.parse(text) as Json) : null }
      },
      { method, path, body },
    )
  }

  scenario(id: string) {
    return this.call('PUT', '/scenario', { id })
  }

  updateNft(nftId: string, change: { editionId?: string; price?: string; available?: number }) {
    return this.call('POST', `/nfts/${nftId}`, change)
  }

  replayLastEvent(mode: 'duplicate' | 'stale') {
    return this.call('POST', '/events/replay', { mode })
  }

  expireSessions() {
    return this.call('POST', '/sessions/expire')
  }

  dropSocket() {
    return this.call('POST', '/socket/disconnect')
  }

  resolveOrder(orderId: string, status: 'confirmed' | 'rejected') {
    return this.call('POST', `/orders/${orderId}/resolve`, { status })
  }
}

/** Calls the public API from inside the page (same headers the app would send). */
export async function apiCall(page: Page, method: string, path: string, body?: unknown) {
  return page.evaluate(
    async ({ method, path, body }) => {
      const session = JSON.parse(localStorage.getItem('kurio:session') ?? 'null') as { token?: string } | null
      const cartId = JSON.parse(localStorage.getItem('kurio:cart-id') ?? 'null') as string | null
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.token) headers.Authorization = `Bearer ${session.token}`
      if (cartId) headers['X-Cart-Id'] = cartId
      const response = await fetch(`/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
      const text = await response.text()
      return { status: response.status, body: text ? (JSON.parse(text) as unknown) : null }
    },
    { method, path, body },
  )
}

/** Navigates and waits until the mock worker (and its scenario) is active. */
export async function gotoApp(page: Page, url: string) {
  await page.goto(url)
  await expect(page.locator('html[data-mocks="ready"]')).toBeAttached()
}

export async function reloadApp(page: Page) {
  await page.reload()
  await expect(page.locator('html[data-mocks="ready"]')).toBeAttached()
}

export async function login(page: Page, user = ALICE, redirect = '/') {
  await gotoApp(page, `/login?redirect=${encodeURIComponent(redirect)}`)
  await page.getByLabel('E-mail').fill(user.email)
  await page.getByLabel('Senha', { exact: true }).fill(user.password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).not.toHaveURL(/\/login/)
}

/** Seeds the current cart through the API (visitor or signed-in, depending on the page state). */
export async function addToCartViaApi(page: Page, items: Array<{ nftId: string; editionId?: string; quantity: number }>) {
  await page.evaluate(() => {
    if (!localStorage.getItem('kurio:cart-id')) localStorage.setItem('kurio:cart-id', JSON.stringify(crypto.randomUUID()))
  })
  for (const item of items) {
    const result = await apiCall(page, 'POST', '/cart/items', { nftId: item.nftId, editionId: item.editionId ?? '1-50', quantity: item.quantity })
    expect(result.status, `add ${item.nftId}`).toBe(201)
  }
}

export const test = base.extend<{ mock: MockControl }>({
  mock: async ({ page }, provide) => {
    await provide(new MockControl(page))
  },
})

export { expect }
