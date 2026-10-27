import type { Page } from '@playwright/test'
import { ALICE, addToCartViaApi, expect, gotoApp, login, test } from './fixtures'

/** Same items and quantities as the Figma cart and payment frames. */
const FIGMA_CART = [
  { nftId: 'emerald-ape-042', quantity: 2 },
  { nftId: 'violet-nomad-314', quantity: 6 },
  { nftId: 'ivory-baron-088', quantity: 9 },
]

/** Waits for fonts, every (lazy) image and a quiet network, so baselines are stable. */
async function settle(page: Page) {
  await page.evaluate(async () => {
    // Below-the-fold and off-scroller (carousel) images are lazy: load them all before capturing.
    document.querySelectorAll<HTMLImageElement>('img[loading="lazy"]').forEach((image) => (image.loading = 'eager'))
    window.scrollTo(0, document.body.scrollHeight)
    await new Promise((resolve) => setTimeout(resolve, 150))
    window.scrollTo(0, 0)
    await document.fonts.ready
  })
  await page.waitForLoadState('networkidle')
  // Lazy images inside hidden (other-breakpoint) containers never load, so only rendered ones count.
  await page.waitForFunction(() =>
    Array.from(document.images)
      .filter((image) => image.getClientRects().length > 0)
      .every((image) => image.complete && image.naturalWidth > 0),
  )
}

test.describe('regressão visual', () => {
  test.beforeEach(async ({ page }) => {
    // The simulation panel is a demo tool, not part of the layout under test.
    await page.addInitScript(() => localStorage.setItem('kurio:mock-panel', 'off'))
  })

  test('início', async ({ page }) => {
    await gotoApp(page, '/')
    await expect(page.getByRole('link', { name: 'Emerald Ape #042', exact: true })).toBeVisible()
    await settle(page)
    await expect(page).toHaveScreenshot('inicio.png', { fullPage: true })
  })

  test('detalhe', async ({ page }) => {
    await gotoApp(page, '/nfts/emerald-ape-042')
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Mais desta coleção' }).getByRole('link').first()).toBeVisible()
    await settle(page)
    await expect(page).toHaveScreenshot('detalhe.png', { fullPage: true })
  })

  test('carrinho', async ({ page }) => {
    await gotoApp(page, '/')
    await addToCartViaApi(page, FIGMA_CART)
    await gotoApp(page, '/cart')
    await expect(page.getByTestId('quote-total')).toHaveText('26.846 ETH')
    await settle(page)
    await expect(page).toHaveScreenshot('carrinho.png', { fullPage: true })
  })

  test('pagamento', async ({ page }) => {
    await login(page, ALICE, '/')
    await addToCartViaApi(page, FIGMA_CART)
    await gotoApp(page, '/checkout')
    await expect(page.getByRole('list', { name: 'Itens do pedido' }).getByText('Ivory Baron #088')).toBeVisible()
    await expect(page.getByTestId('quote-total')).toHaveText('26.846 ETH')
    await settle(page)
    await expect(page).toHaveScreenshot('pagamento.png', { fullPage: true })
  })
})
